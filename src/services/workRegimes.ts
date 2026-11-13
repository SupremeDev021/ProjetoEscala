import type { Schedule, WorkAssignment, WorkRegime } from '../models';
export const workRegimes: readonly WorkRegime[] = ['12x36', '24h', 'diarist'];
export const regimeLabel = (regime?: WorkRegime) => regime === '24h' ? '24 horas · diurno e noturno' : regime === 'diarist' ? 'Diarista · 8 horas' : '12×36';
export function validateRegime(regime: WorkRegime = '12x36', shift: string, startTime = '08:00') {
  if (!workRegimes.includes(regime)) throw Error('Jornada inválida.');
  if (regime !== '12x36' && shift !== 'day') throw Error('24 horas e diarista iniciam no diurno.');
  if (regime === 'diarist' && (!/^\d{2}:\d{2}$/.test(startTime) || Number(startTime.slice(3)) > 59 || startTime < '07:00' || startTime > '11:00')) throw Error('Diarista: início entre 07h e 11h para completar 8 horas dentro do diurno.');
}

export function workAssignment(source: Partial<WorkAssignment>): WorkAssignment {
  const workRegime = source.workRegime || '12x36';
  return workRegime === 'diarist'
    ? { workRegime, startTime: source.startTime ?? '08:00' }
    : { workRegime };
}

export function publishedWorkWindows(records: Schedule[]): Schedule[] {
  return records.flatMap(record => {
    const assignments = record.workAssignments;
    if (!assignments || record.status !== 'published' || !record.professionalIds.length) return [record];

    const groups = new Map<string, Schedule>();
    for (const id of record.professionalIds) {
      const assignment = workAssignment(assignments[id] || record);
      const groupKey = JSON.stringify(assignment);
      const group = groups.get(groupKey);
      if (group) group.professionalIds.push(id);
      else groups.set(groupKey, { ...record, ...assignment, professionalIds: [id] });
    }
    return [...groups.values()].flatMap(group => group.workRegime === '24h' && group.shift === 'day'
      ? [group, { ...group, shift: 'night' as const }]
      : [group]);
  });
}
export function scheduleWindow(s: Pick<Schedule, 'date' | 'shift' | 'workRegime' | 'startTime'>) {
  const time = s.workRegime === 'diarist' ? s.startTime || '08:00' : s.workRegime === '24h' || s.shift === 'day' ? '07:00' : '19:00';
  const start = Date.parse(`${s.date}T${time}:00-03:00`);
  return { start, end: start + (s.workRegime === '24h' ? 24 : s.workRegime === 'diarist' ? 8 : 12) * 3600000 };
}
