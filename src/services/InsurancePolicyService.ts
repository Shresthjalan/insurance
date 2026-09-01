import { supabase, unwrap, unwrapList } from '../db';
import { Id } from '../utils/idGenerator';
import { logger } from '../utils/logger';
import type { InsurancePolicy, InsuranceType, PlanType } from '../types';

export interface CreateInsurancePolicyInput {
  insuranceType: InsuranceType;
  planType: PlanType;
  amount: number;
  membersCount?: number;
  customerName?: string;
  phoneNumber?: string;
  customerId?: string;
}

export class InsurancePolicyService {
  async create(input: CreateInsurancePolicyInput): Promise<InsurancePolicy> {
    const policy = unwrap<InsurancePolicy>(
      await supabase
        .from('insurance_policies')
        .insert({
          id: Id.insurancePolicy(),
          insuranceType: input.insuranceType,
          planType: input.planType,
          amount: input.amount,
          membersCount: input.membersCount ?? null,
          customerName: input.customerName ?? null,
          phoneNumber: input.phoneNumber ?? null,
          customerId: input.customerId ?? null,
          status: 'active',
        })
        .select()
        .single(),
    );

    logger.info('Insurance policy created', {
      policy_id: policy.id,
      insurance_type: policy.insuranceType,
      plan_type: policy.planType,
    });

    return policy;
  }

  async findById(id: string): Promise<InsurancePolicy | null> {
    return unwrap<InsurancePolicy | null>(
      await supabase.from('insurance_policies').select('*').eq('id', id).maybeSingle(),
    );
  }

  async list(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const result = await supabase
      .from('insurance_policies')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(from, from + limit - 1);
    return { ...unwrapList<InsurancePolicy>(result), page, limit };
  }
}

export const insurancePolicyService = new InsurancePolicyService();
