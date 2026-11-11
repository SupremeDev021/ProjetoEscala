import type { Shift } from '../models';

export interface ShiftContext {
  unitId: string;
  referenceDate: string;
  shift: Shift;
  professionalIds: string[];
}
export interface PunchRecord {
  professionalId: string;
  unitId: string;
  timestamp: string;
  type: 'entry' | 'exit';
  equipmentId?: string;
  validation: 'confirmed' | 'pending' | 'rejected';
  received: boolean;
  shiftId: string;
}
export interface PunchRules {
  earlyMinutes: number;
  lateMinutes: number;
  dayHour: number;
  nightHour: number;
}
export const defaultRules: PunchRules = { earlyMinutes: 60, lateMinutes: 720, dayHour: 7, nightHour: 19 };
export const shiftId = (c: ShiftContext) => `${c.unitId}|${c.referenceDate}|${c.shift}`;
export function shiftWindow(c: ShiftContext, rules = defaultRules) {
  // São Paulo currently uses UTC-03. The real API must supply zoned shift boundaries.
  const start = Date.parse(`${c.referenceDate}T${String(c.shift === 'day' ? rules.dayHour : rules.nightHour).padStart(2, '0')}:00:00-03:00`);
  return { start, end: start + 12 * 60 * 60 * 1000 };
}
export function confirmedProfessionals(records: PunchRecord[], c: ShiftContext, now: number, rules = defaultRules): Set<string> {
  const { start, end } = shiftWindow(c, rules);
  const scheduled = new Set(c.professionalIds);
  return new Set(records.filter(r => {
    const timestamp = Date.parse(r.timestamp);
    return scheduled.has(r.professionalId) && r.unitId === c.unitId && r.shiftId === shiftId(c) &&
      r.received && r.validation === 'confirmed' && r.type === 'entry' && timestamp <= now &&
      timestamp >= start - rules.earlyMinutes * 60000 && timestamp < Math.min(end, start + rules.lateMinutes * 60000);
  }).map(r => r.professionalId));
}
export interface PontoFacialService {
  load(context: ShiftContext): Promise<PunchRecord[]>;
}
// In-memory demonstration only: never reads devices or stores biometrics.
export class SimulatedPontoFacialService implements PontoFacialService {
  private sessions = new Map<string, { records: PunchRecord[]; next?: string; due: number }>();
  private session(c: ShiftContext) {
    const key = shiftId(c);
    let session = this.sessions.get(key);
    if (!session) {
      session = { records: [], next: c.professionalIds[1], due: Date.now() + 30000 };
      this.sessions.set(key, session);
      if (c.professionalIds[0]) this.register(c, c.professionalIds[0]);
    }
    return session;
  }
  register(c: ShiftContext, professionalId: string) {
    if (!c.professionalIds.includes(professionalId)) return;
    const session = this.session(c);
    session.records.push({ professionalId, unitId: c.unitId, timestamp: new Date().toISOString(),
      type: 'entry', equipmentId: 'simulated', validation: 'confirmed', received: true, shiftId: shiftId(c) });
  }
  async load(c: ShiftContext) {
    const session = this.session(c);
    if (session.next && Date.now() >= session.due) {
      this.register(c, session.next);
      session.next = undefined;
    }
    return [...session.records];
  }
}
export const simulatedPontoFacialService = new SimulatedPontoFacialService();
