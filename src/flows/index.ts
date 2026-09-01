import type { FlowDefinition } from '../types';
import { homeFlow } from './home';
import { insuranceTypeSelectionFlow } from './insuranceType';
import { carQuotationFlow } from './car';
import { healthQuotationFlow } from './health';
import { termQuotationFlow } from './term';
import { lifeQuotationFlow } from './life';
import { advisorFlow } from './advisor';

const flowRegistry = new Map<string, FlowDefinition>();

function register(flow: FlowDefinition): void {
  flowRegistry.set(flow.flow, flow);
}

register(homeFlow);
register(insuranceTypeSelectionFlow);
register(carQuotationFlow);
register(healthQuotationFlow);
register(termQuotationFlow);
register(lifeQuotationFlow);
register(advisorFlow);

export function getFlow(name: string): FlowDefinition | undefined {
  return flowRegistry.get(name);
}

export function getAllFlows(): FlowDefinition[] {
  return Array.from(flowRegistry.values());
}

export {
  homeFlow,
  insuranceTypeSelectionFlow,
  carQuotationFlow,
  healthQuotationFlow,
  termQuotationFlow,
  lifeQuotationFlow,
  advisorFlow,
};
