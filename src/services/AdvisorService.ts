import { parse, isValid, isBefore, startOfToday } from 'date-fns';
import { supabase, unwrap, unwrapList } from '../db';
import { ValidationError, ConflictError } from '../utils/errors';
import { Id } from '../utils/idGenerator';
import { logger } from '../utils/logger';
import type { AdvisorAppointment } from '../types';
import type { AppointmentStatus, AppointmentSource } from '../types';

const CLOSED_APPOINTMENT_STATUSES = ['cancelled', 'failed', 'no_show'];

export interface CreateAppointmentInput {
  customerId: string;
  leadId?: string;
  insuranceInterestId?: string;
  conversationId?: string;
  requestedDate: string;
  requestedTime: string;
  timezone: string;
  source: AppointmentSource;
  notes?: string;
}

export class AdvisorService {
  async create(input: CreateAppointmentInput): Promise<AdvisorAppointment> {
    this.validateDateTime(input.requestedDate, input.requestedTime);

    // Guard against duplicate requests for the same slot
    const duplicates = unwrap<AdvisorAppointment[]>(
      await supabase
        .from('advisor_appointments')
        .select('*')
        .eq('customerId', input.customerId)
        .eq('requestedDate', input.requestedDate)
        .eq('requestedTime', input.requestedTime)
        .not('status', 'in', `(${CLOSED_APPOINTMENT_STATUSES.join(',')})`)
        .limit(1),
    );
    if (duplicates.length > 0) {
      throw new ConflictError('An appointment already exists for this date and time');
    }

    const appointment = unwrap<AdvisorAppointment>(
      await supabase
        .from('advisor_appointments')
        .insert({
          id: Id.appointment(),
          customerId: input.customerId,
          leadId: input.leadId ?? null,
          insuranceInterestId: input.insuranceInterestId ?? null,
          conversationId: input.conversationId ?? null,
          requestedDate: input.requestedDate,
          requestedTime: input.requestedTime,
          timezone: input.timezone,
          source: input.source,
          notes: input.notes ?? null,
          status: 'requested',
        })
        .select()
        .single(),
    );

    logger.info('Advisor appointment created', {
      appointment_id: appointment.id,
      customer_id: input.customerId,
      source: input.source,
    });

    return appointment;
  }

  async updateStatus(appointmentId: string, status: AppointmentStatus): Promise<AdvisorAppointment> {
    const updates: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === 'confirmed') updates.confirmedAt = now;
    if (status === 'assigned') updates.assignedAt = now;
    if (status === 'completed') updates.completedAt = now;
    if (status === 'cancelled') updates.cancelledAt = now;

    return unwrap<AdvisorAppointment>(
      await supabase.from('advisor_appointments').update(updates).eq('id', appointmentId).select().single(),
    );
  }

  async assign(appointmentId: string, advisorId: string): Promise<AdvisorAppointment> {
    return unwrap<AdvisorAppointment>(
      await supabase
        .from('advisor_appointments')
        .update({ advisorId, status: 'assigned', assignedAt: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single(),
    );
  }

  async findById(id: string): Promise<AdvisorAppointment | null> {
    return unwrap<AdvisorAppointment | null>(
      await supabase.from('advisor_appointments').select('*').eq('id', id).maybeSingle(),
    );
  }

  async list(filters: { status?: AppointmentStatus; date?: string } = {}, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    let query = supabase.from('advisor_appointments').select('*', { count: 'exact' });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date) query = query.eq('requestedDate', filters.date);
    const result = await query.order('createdAt', { ascending: false }).range(from, from + limit - 1);
    return { ...unwrapList<AdvisorAppointment>(result), page, limit };
  }

  private validateDateTime(date: string, time: string): void {
    // Accept YYYY-MM-DD
    const parsed = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      throw new ValidationError('Invalid date format, expected YYYY-MM-DD', 'meeting_date');
    }
    const today = startOfToday();
    if (parsed.getTime() < today.getTime()) {
      throw new ValidationError('Appointment date cannot be in the past', 'meeting_date');
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new ValidationError('Invalid time format, expected HH:MM', 'meeting_time');
    }
  }
}

export const advisorService = new AdvisorService();
