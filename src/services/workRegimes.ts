import type { Schedule, WorkAssignment, WorkRegime } from '../models';
export const workRegimes: readonly WorkRegime[] = ['12x36', '24h', 'diarist'];
export const regimeLabel = (regime?: WorkRegime) => regime === '24h' ? '24 horas · diurno e noturno' : regime === 'diarist' ? 'Diarista · 8 horas' : '12×36';
export function validateRegime(regime: WorkRegime = '12x36', shift: string, startTime = '08:00') {
  if (!workRegimes.includes(regime)) throw Error('Jornada inválida.');
  if (shift !== 'day' && shift !== 'night') throw Error('Turno inválido.');
  if (regime === 'diarist' && (!/^\d{2}:\d{2}$/.test(startTime) || Number(startTime.slice(3)) > 59 || startTime < '07:00' || startTime > '11:00')) throw Error('Horário cadastrado para diarista inválido. O início deve ficar nas quatro primeiras horas do turno.');
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
    return [...groups.values()].flatMap(group => {
      if (group.workRegime !== '24h') return [group];
      const origin = { date: group.date, shift: group.shift };
      const continuation = group.shift === 'day'
        ? { date: group.date, shift: 'night' as const }
        : { date: new Date(Date.parse(group.date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10), shift: 'day' as const };
      return [{ ...group, coverageOrigin: origin }, { ...group, ...continuation, coverageOrigin: origin }];
    });
  });
}
export function scheduleWindow(s: Pick<Schedule, 'date' | 'shift' | 'workRegime' | 'startTime' | 'coverageOrigin'>) {
  const date = s.coverageOrigin?.date ?? s.date;
  const shift = s.coverageOrigin?.shift ?? s.shift;
  const time = s.workRegime === 'diarist' ? s.startTime || '08:00' : '07:00';
  const isLegacyPair = s.workRegime === '24h' && !s.coverageOrigin;
  const nightOffset = shift === 'night' && !isLegacyPair ? 12 * 3600000 : 0;
  const start = Date.parse(`${date}T${time}:00-03:00`) + nightOffset;
  return { start, end: start + (s.workRegime === '24h' ? 24 : s.workRegime === 'diarist' ? 8 : 12) * 3600000 };
}
