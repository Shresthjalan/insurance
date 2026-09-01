import { parse, isValid, isBefore, startOfToday } from 'date-fns';
import { prisma } from '../db';
import { ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { AppointmentStatus, AppointmentSource } from '../types';

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
  async create(input: CreateAppointmentInput) {
    this.validateDateTime(input.requestedDate, input.requestedTime);

    // Guard against duplicate requests for the same slot
    const duplicate = await prisma.advisorAppointment.findFirst({
      where: {
        customerId: input.customerId,
        requestedDate: input.requestedDate,
        requestedTime: input.requestedTime,
        status: { notIn: ['cancelled', 'failed', 'no_show'] },
      },
    });
    if (duplicate) {
      throw new ConflictError('An appointment already exists for this date and time');
    }

    const appointment = await prisma.advisorAppointment.create({
      data: {
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
      },
    });

    logger.info('Advisor appointment created', {
      appointment_id: appointment.id,
      customer_id: input.customerId,
      source: input.source,
    });

    return appointment;
  }

  async updateStatus(appointmentId: string, status: AppointmentStatus) {
    const data: Record<string, unknown> = { status };
    if (status === 'confirmed') data.confirmedAt = new Date();
    if (status === 'assigned') data.assignedAt = new Date();
    if (status === 'completed') data.completedAt = new Date();
    if (status === 'cancelled') data.cancelledAt = new Date();

    return prisma.advisorAppointment.update({ where: { id: appointmentId }, data });
  }

  async assign(appointmentId: string, advisorId: string) {
    return prisma.advisorAppointment.update({
      where: { id: appointmentId },
      data: { advisorId, status: 'assigned', assignedAt: new Date() },
    });
  }

  async findById(id: string) {
    return prisma.advisorAppointment.findUnique({ where: { id } });
  }

  async list(filters: { status?: AppointmentStatus; date?: string } = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.date && { requestedDate: filters.date }),
    };
    const [items, total] = await Promise.all([
      prisma.advisorAppointment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.advisorAppointment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  private validateDateTime(date: string, time: string): void {
    // Accept YYYY-MM-DD
    const parsed = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      throw new ValidationError('Invalid date format, expected YYYY-MM-DD', 'meeting_date');
    }
    if (isBefore(parsed, startOfToday())) {
      throw new ValidationError('Appointment date cannot be in the past', 'meeting_date');
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new ValidationError('Invalid time format, expected HH:MM', 'meeting_time');
    }
  }
}

export const advisorService = new AdvisorService();
