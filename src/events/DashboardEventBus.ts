import { EventEmitter } from 'events';
import type { Response } from 'express';

export type DashboardEventType =
  | 'customer_created'
  | 'new_interest'
  | 'quotation_requested'
  | 'quotation_generated'
  | 'appointment_scheduled'
  | 'appointment_confirmed'
  | 'call_missed'
  | 'not_interested'
  | 'conversation_started';

export interface DashboardEvent {
  type: DashboardEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

class DashboardEventBus extends EventEmitter {
  private static readonly CHANNEL = 'dashboard';

  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  publish(type: DashboardEventType, data: Record<string, unknown>): void {
    const event: DashboardEvent = { type, timestamp: new Date().toISOString(), data };
    this.emit(DashboardEventBus.CHANNEL, event);
  }

  subscribe(res: Response): () => void {
    const handler = (event: DashboardEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    this.on(DashboardEventBus.CHANNEL, handler);
    return () => this.off(DashboardEventBus.CHANNEL, handler);
  }
}

export const dashboardBus = new DashboardEventBus();
dashboardBus.setMaxListeners(200);
