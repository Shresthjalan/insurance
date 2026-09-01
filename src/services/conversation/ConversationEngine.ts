import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { getFlow } from '../../flows';
import type { Channel, MessageSource, InsuranceType, FlowStep, StepType } from '../../types';
import type { Conversation, ConversationStep } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';

export interface ConversationContext {
  insuranceType?: InsuranceType;
  quotationRequestId?: string;
  [key: string]: unknown;
}

export interface AdvanceResult {
  conversation: Conversation;
  nextStep: FlowStep | null;
  transitionedTo?: string;
  completed: boolean;
}

export class ConversationEngine {
  // ─── Start or resume ───────────────────────────────────────────

  async startFlow(conversationId: string, flowName: string): Promise<FlowStep | null> {
    const flow = getFlow(flowName);
    if (!flow) throw new ValidationError(`Unknown flow: ${flowName}`);

    const initialStep = flow.steps.find((s) => s.key === flow.initialStep);
    if (!initialStep) return null;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        currentFlow: flowName,
        currentState: flow.initialStep,
        expectedInputType: initialStep.type,
        expectedInputIds: initialStep.options?.map((o) => o.id) ?? [],
      },
    });

    // Create a pending step record
    await this.createStep(conversationId, flowName, flow.version, initialStep);

    return initialStep;
  }

  async findOrStartConversation(input: {
    customerId: string;
    channel: Channel;
    source: MessageSource;
    language?: string;
  }): Promise<Conversation> {
    const existing = await prisma.conversation.findFirst({
      where: { customerId: input.customerId, channel: input.channel, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) return existing;

    return prisma.conversation.create({
      data: {
        customerId: input.customerId,
        channel: input.channel,
        source: input.source,
        status: 'active',
        language: input.language ?? null,
        startedAt: new Date(),
      },
    });
  }

  // ─── Process inbound interaction ──────────────────────────────

  async processInput(
    conversationId: string,
    inputId: string,
    inputValue?: string,
  ): Promise<AdvanceResult> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundError('Conversation');

    const { currentFlow, currentState, expectedInputType, expectedInputIds } = conversation;

    // No active state — treat as home
    if (!currentFlow || !currentState) {
      const nextStep = await this.startFlow(conversationId, 'home');
      return { conversation, nextStep, completed: false };
    }

    const flow = getFlow(currentFlow);
    if (!flow) {
      const nextStep = await this.startFlow(conversationId, 'home');
      return { conversation, nextStep, completed: false };
    }

    const step = flow.steps.find((s) => s.key === currentState);
    if (!step) {
      const nextStep = await this.startFlow(conversationId, 'home');
      return { conversation, nextStep, completed: false };
    }

    // ── Validate input ──────────────────────────────────────────
    if (step.type === 'button' || step.type === 'list' || step.type === 'confirmation') {
      const valid = (expectedInputIds as string[] | null)?.includes(inputId);
      if (!valid) {
        // Input is not in the expected set — caller must resend current UI
        return { conversation, nextStep: step, completed: false };
      }
    }

    // ── Save answer ─────────────────────────────────────────────
    await this.saveStepAnswer(conversationId, currentState, inputId, inputValue);
    await this.updateContext(conversationId, currentState, inputId);

    // ── Evaluate conditional rules ──────────────────────────────
    let nextStepKey: string | null = null;

    if (step.rules) {
      for (const rule of step.rules) {
        const compareValue = rule.if.stepKey === currentState ? inputId : null;
        const ruleValue = rule.if.equals;
        const matches = Array.isArray(ruleValue)
          ? ruleValue.includes(compareValue ?? '')
          : ruleValue === compareValue;

        if (matches) {
          nextStepKey = rule.goto;
          break;
        }
      }
    }

    if (!nextStepKey) nextStepKey = step.next ?? null;

    // ── Cross-flow transition ────────────────────────────────────
    if (nextStepKey?.startsWith('__flow:')) {
      const targetFlow = nextStepKey.slice(7);
      const nextStep = await this.startFlow(conversationId, targetFlow);
      return { conversation, nextStep, transitionedTo: targetFlow, completed: false };
    }

    // ── End of flow ──────────────────────────────────────────────
    if (!nextStepKey) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { currentState: 'completed', expectedInputType: null, expectedInputIds: [] },
      });
      return { conversation, nextStep: null, completed: true };
    }

    // ── Advance to next step ─────────────────────────────────────
    const nextStep = flow.steps.find((s) => s.key === nextStepKey) ?? null;
    if (nextStep) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          currentState: nextStep.key,
          expectedInputType: nextStep.type,
          expectedInputIds: nextStep.options?.map((o) => o.id) ?? [],
        },
      });
      await this.createStep(conversationId, currentFlow, flow.version, nextStep);
    }

    return { conversation, nextStep, completed: false };
  }

  // ─── Current step (for UI resend) ─────────────────────────────

  async getCurrentStep(conversationId: string): Promise<FlowStep | null> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation?.currentFlow || !conversation.currentState) return null;

    const flow = getFlow(conversation.currentFlow);
    return flow?.steps.find((s) => s.key === conversation.currentState) ?? null;
  }

  async getContext(conversationId: string): Promise<Record<string, unknown>> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    return (conversation?.contextJson as Record<string, unknown>) ?? {};
  }

  async setContext(conversationId: string, update: Record<string, unknown>): Promise<void> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const existing = (conversation?.contextJson as Record<string, unknown>) ?? {};
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { contextJson: { ...existing, ...update } },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async createStep(
    conversationId: string,
    flowName: string,
    version: number,
    step: FlowStep,
  ): Promise<void> {
    // Mark prior pending steps for this conversation as skipped
    await prisma.conversationStep.updateMany({
      where: { conversationId, status: 'pending' },
      data: { status: 'skipped' },
    });

    await prisma.conversationStep.create({
      data: {
        conversationId,
        flowName,
        flowVersion: version,
        stepKey: step.key,
        stepType: step.type,
        status: 'active',
        questionPayload: step as unknown as Record<string, unknown>,
        expectedInput: step.options ?? null,
        startedAt: new Date(),
      },
    });
  }

  private async saveStepAnswer(
    conversationId: string,
    stepKey: string,
    answerValue: string,
    answerRaw?: string,
  ): Promise<void> {
    const step = await prisma.conversationStep.findFirst({
      where: { conversationId, stepKey, status: 'active' },
    });
    if (!step) return;

    await prisma.conversationStep.update({
      where: { id: step.id },
      data: {
        status: 'answered',
        answerValue,
        answerNormalized: answerRaw ? { raw: answerRaw, normalized: answerValue } : { normalized: answerValue },
        answeredAt: new Date(),
      },
    });
  }

  private async updateContext(
    conversationId: string,
    stepKey: string,
    value: string,
  ): Promise<void> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const ctx = (conversation?.contextJson as Record<string, unknown>) ?? {};
    ctx[stepKey] = value;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { contextJson: ctx, lastMessageAt: new Date() },
    });
  }
}

export const conversationEngine = new ConversationEngine();
