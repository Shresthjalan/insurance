import { supabase, unwrap } from '../../db';
import { Id } from '../../utils/idGenerator';
import { getFlow } from '../../flows';
import type { Channel, MessageSource, InsuranceType, FlowStep, Conversation, ConversationStep } from '../../types';
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

    await supabase
      .from('conversations')
      .update({
        currentFlow: flowName,
        currentState: flow.initialStep,
        expectedInputType: initialStep.type,
        expectedInputIds: initialStep.options?.map((o) => o.id) ?? [],
      })
      .eq('id', conversationId);

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
    const existing = unwrap<Conversation[]>(
      await supabase
        .from('conversations')
        .select('*')
        .eq('customerId', input.customerId)
        .eq('channel', input.channel)
        .eq('status', 'active')
        .order('startedAt', { ascending: false })
        .limit(1),
    );
    if (existing.length > 0) return existing[0];

    return unwrap<Conversation>(
      await supabase
        .from('conversations')
        .insert({
          id: Id.conversation(),
          customerId: input.customerId,
          channel: input.channel,
          source: input.source,
          status: 'active',
          language: input.language ?? null,
          startedAt: new Date().toISOString(),
        })
        .select()
        .single(),
    );
  }

  // ─── Process inbound interaction ──────────────────────────────

  async processInput(
    conversationId: string,
    inputId: string,
    inputValue?: string,
  ): Promise<AdvanceResult> {
    const conversation = unwrap<Conversation | null>(
      await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    );
    if (!conversation) throw new NotFoundError('Conversation');

    const { currentFlow, currentState, expectedInputIds } = conversation;

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
      await supabase
        .from('conversations')
        .update({ currentState: 'completed', expectedInputType: null, expectedInputIds: [] })
        .eq('id', conversationId);
      return { conversation, nextStep: null, completed: true };
    }

    // ── Advance to next step ─────────────────────────────────────
    const nextStep = flow.steps.find((s) => s.key === nextStepKey) ?? null;
    if (nextStep) {
      await supabase
        .from('conversations')
        .update({
          currentState: nextStep.key,
          expectedInputType: nextStep.type,
          expectedInputIds: nextStep.options?.map((o) => o.id) ?? [],
        })
        .eq('id', conversationId);
      await this.createStep(conversationId, currentFlow, flow.version, nextStep);
    }

    return { conversation, nextStep, completed: false };
  }

  // ─── Current step (for UI resend) ─────────────────────────────

  async getCurrentStep(conversationId: string): Promise<FlowStep | null> {
    const conversation = unwrap<Conversation | null>(
      await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    );
    if (!conversation?.currentFlow || !conversation.currentState) return null;

    const flow = getFlow(conversation.currentFlow);
    return flow?.steps.find((s) => s.key === conversation.currentState) ?? null;
  }

  async getContext(conversationId: string): Promise<Record<string, unknown>> {
    const conversation = unwrap<Conversation | null>(
      await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    );
    return conversation?.contextJson ?? {};
  }

  async setContext(conversationId: string, update: Record<string, unknown>): Promise<void> {
    const conversation = unwrap<Conversation | null>(
      await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    );
    const existing = conversation?.contextJson ?? {};
    await supabase
      .from('conversations')
      .update({ contextJson: { ...existing, ...update } })
      .eq('id', conversationId);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async createStep(
    conversationId: string,
    flowName: string,
    version: number,
    step: FlowStep,
  ): Promise<void> {
    // Mark prior pending steps for this conversation as skipped
    await supabase
      .from('conversation_steps')
      .update({ status: 'skipped' })
      .eq('conversationId', conversationId)
      .eq('status', 'pending');

    await supabase.from('conversation_steps').insert({
      id: Id.conversationStep(),
      conversationId,
      flowName,
      flowVersion: version,
      stepKey: step.key,
      stepType: step.type,
      status: 'active',
      questionPayload: step as unknown as Record<string, unknown>,
      expectedInput: step.options ?? null,
      startedAt: new Date().toISOString(),
    });
  }

  private async saveStepAnswer(
    conversationId: string,
    stepKey: string,
    answerValue: string,
    answerRaw?: string,
  ): Promise<void> {
    const step = unwrap<ConversationStep[]>(
      await supabase
        .from('conversation_steps')
        .select('*')
        .eq('conversationId', conversationId)
        .eq('stepKey', stepKey)
        .eq('status', 'active')
        .limit(1),
    )[0];
    if (!step) return;

    await supabase
      .from('conversation_steps')
      .update({
        status: 'answered',
        answerValue,
        answerNormalized: answerRaw ? { raw: answerRaw, normalized: answerValue } : { normalized: answerValue },
        answeredAt: new Date().toISOString(),
      })
      .eq('id', step.id);
  }

  private async updateContext(
    conversationId: string,
    stepKey: string,
    value: string,
  ): Promise<void> {
    const conversation = unwrap<Conversation | null>(
      await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle(),
    );
    const ctx = conversation?.contextJson ?? {};
    ctx[stepKey] = value;
    await supabase
      .from('conversations')
      .update({ contextJson: ctx, lastMessageAt: new Date().toISOString() })
      .eq('id', conversationId);
  }
}

export const conversationEngine = new ConversationEngine();
