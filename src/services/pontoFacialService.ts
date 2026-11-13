import type { Shift } from '../models';

export interface ShiftContext {
  unitId: string;
  referenceDate: string;
  shift: Shift;
  professionalIds: string[];
  windows?: Record<string, { start: number; end: number; shiftIds: string[] }>;
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
    const window = c.windows?.[r.professionalId];
    const begins = window?.start ?? start;
    const ends = window?.end ?? end;
    const shiftIds = window?.shiftIds ?? [shiftId(c)];
    const overnight24h = !!window && ends - begins === 24 * 3600000
      && c.shift === 'day' && begins === start - 12 * 3600000;
    const originId = overnight24h ? `${c.unitId}|${new Date(begins).toISOString().slice(0, 10)}|night` : undefined;
    return scheduled.has(r.professionalId) && r.unitId === c.unitId && (shiftIds.includes(r.shiftId) || r.shiftId === originId) && now >= begins && now < ends &&
      r.received === true && r.validation === 'confirmed' && r.type === 'entry' && timestamp <= now &&
      timestamp >= begins - rules.earlyMinutes * 60000 && timestamp < Math.min(ends, begins + rules.lateMinutes * 60000);
  }).map(r => r.professionalId));
}
export interface PontoFacialService {
  load(context: ShiftContext): Promise<PunchRecord[]>;
}
