import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../seed';
import { confirmAssemblyRole, copyPublication, publishAssembly, resumeAssembly, todaySaoPaulo, type Assembly } from '../domain';
import { publishedWorkWindows, scheduleWindow, validateRegime } from './workRegimes';
import { projectDashboard, saoPauloClock } from '../dashboard/data';
import { confirmedProfessionals } from './pontoFacialService';
const s = { userId: 'gestor', activeUnitId: 'u1' };
const input = (): Assembly => ({ unitId: 'u1', date: todaySaoPaulo(), shift: 'day', teamId: 'u1A', workRegime: '24h', selections: { r0: ['u1p0'] }, confirmed: Object.fromEntries(seed().roles.map(r => [r.id, true])) });
test('24h publica dia e noite atomicamente com chave existente; cópia mantém jornada', () => {
  const d = seed(); const before = structuredClone(d); publishAssembly(d, s, input());
  const rows = d.published.filter(x => x.publicationId);
  assert.equal(rows.length, 12); assert.ok(rows.some(x => x.shift === 'day')); assert.ok(rows.some(x => x.shift === 'night'));
  assert.equal(new Set(rows.map(x => x.publicationId)).size, 1);
  const window = scheduleWindow(rows[0]); assert.equal(window.end - window.start, 24 * 3600000);
  assert.equal(copyPublication(d, s, rows).assembly.workRegime, '24h'); assert.deepEqual(d.members, before.members);
  const snapshot = structuredClone(d); const bad = input(); bad.selections.r5 = ['u0p5']; assert.throws(() => publishAssembly(d, s, bad)); assert.deepEqual(d, snapshot);
});
test('12x36 respeita turno; diarista dura 8h e aparece no dashboard apenas durante sua janela', () => {
  const d = seed(); const x = { ...input(), workRegime: 'diarist' as const, startTime: '08:00' }; publishAssembly(d, s, x);
  const rows = d.published.filter(x => x.publicationId); assert.equal(rows.length, 6);
  const window = scheduleWindow(rows[0]); assert.equal(window.end - window.start, 8 * 3600000);
  assert.equal(projectDashboard(d, 'u1', x.date, 'day', window.start - 1).total, 0);
  assert.equal(projectDashboard(d, 'u1', x.date, 'day', window.start).total, 1);
  assert.equal(projectDashboard(d, 'u1', x.date, 'day', window.end).total, 0);
  assert.throws(() => validateRegime('diarist', 'day', '18:00')); assert.throws(() => validateRegime('24h', 'night'));
  const night = { ...input(), workRegime: '12x36' as const, shift: 'night' as const }; publishAssembly(d, s, night);
  const newPublication = d.published.find(r => r.date === night.date && r.workRegime === '12x36')!.publicationId;
  const newRows = d.published.filter(r => r.publicationId === newPublication);
  assert.equal(newRows.length, 6); assert.ok(newRows.every(r => r.shift === 'night'));
});
test('entrada de 24h permanece confirmada na madrugada e expira às 07h; diarista expira ao fim de 8h', () => {
  const day = '2026-11-11'; const start = Date.parse(`${day}T07:00:00-03:00`);
  const c = { unitId: 'u1', referenceDate: day, shift: 'night' as const, professionalIds: ['p'], windows: { p: { start, end: start + 24 * 3600000, shiftIds: [`u1|${day}|day`, `u1|${day}|night`] } } };
  const record = { professionalId: 'p', unitId: 'u1', shiftId: `u1|${day}|day`, timestamp: `${day}T07:00:00-03:00`, received: true, validation: 'confirmed' as const, type: 'entry' as const };
  assert.equal(confirmedProfessionals([record], c, start + 22 * 3600000).size, 1); assert.equal(confirmedProfessionals([record], c, start + 24 * 3600000).size, 0);
  const diarist = { ...c, windows: { p: { start, end: start + 8 * 3600000, shiftIds: [`u1|${day}|day`] } } };
  assert.equal(confirmedProfessionals([record], diarist, start + 7 * 3600000).size, 1);
  assert.equal(confirmedProfessionals([record], diarist, start + 8 * 3600000).size, 0);
});

test('jornadas individuais são restauradas e mantêm as janelas de cobertura da publicação', () => {
  const d = seed();
  const x: Assembly = {
    ...input(), workRegime: undefined, selections: { r0: ['u1p0', 'u1p6', 'u1p12'] },
    workAssignments: {
      u1p0: { workRegime: '24h' },
      u1p6: { workRegime: 'diarist', startTime: '09:00' },
      u1p12: { workRegime: '12x36' },
    },
  };
  confirmAssemblyRole(d, s, x, 'r0');
  const stored = JSON.parse(JSON.stringify(d)) as typeof d;
  assert.deepEqual(resumeAssembly(stored, s, x).workAssignments, x.workAssignments);
  const before = structuredClone(stored);
  const night = { ...x, shift: 'night' as const };
  assert.throws(() => confirmAssemblyRole(stored, s, night, 'r0'), /Aurora.*iniciam no diurno/);
  assert.throws(() => publishAssembly(stored, s, night), /iniciam no diurno/);
  assert.deepEqual(stored, before);
  publishAssembly(stored, s, x);
  const records = stored.published.filter(record => record.publicationId);
  assert.deepEqual(copyPublication(stored, s, records).assembly.workAssignments, x.workAssignments);

  const feed = { ...stored, published: publishedWorkWindows(stored.published) };
  const namesAt = (iso: string) => {
    const now = new Date(iso);
    const clock = saoPauloClock(now);
    return projectDashboard(feed, 'u1', clock.referenceDate, clock.shift, +now)
      .groups.flatMap(group => group.professionals.map(p => p.id)).sort();
  };
  assert.deepEqual(namesAt(x.date + 'T08:59:59-03:00'), ['u1p0', 'u1p12']);
  assert.deepEqual(namesAt(x.date + 'T09:00:00-03:00'), ['u1p0', 'u1p12', 'u1p6']);
  assert.deepEqual(namesAt(x.date + 'T17:00:00-03:00'), ['u1p0', 'u1p12']);
  const midnight = new Date(Date.parse(x.date + 'T07:00:00-03:00') + 20 * 3600000);
  assert.deepEqual(namesAt(midnight.toISOString()), ['u1p0']);
  assert.deepEqual(namesAt(new Date(+midnight + 4 * 3600000).toISOString()), []);
});

test('cópia e confirmação de uma escala antiga preservam a jornada cadastrada', () => {
  const d = seed();
  const legacy = input();
  publishAssembly(d, s, legacy);
  const copied = copyPublication(d, s, d.published.filter(record => record.publicationId)).assembly;
  assert.deepEqual(copied.workAssignments, { u1p0: { workRegime: '24h' } });
  const context = JSON.stringify(['u1', legacy.date, 'day', 'u1A', '24h', null]);
  d.assemblyConfirmations = { [context]: { r0: ['u1p0'] } };
  const resumed = resumeAssembly(d, s, legacy);
  assert.deepEqual(resumed.workAssignments, copied.workAssignments);
  confirmAssemblyRole(d, s, resumed, 'r1');
  assert.deepEqual(resumeAssembly(d, s, { ...legacy, workRegime: undefined }).confirmed, { r0: true, r1: true });
  publishAssembly(d, s, { ...copied, workRegime: undefined, confirmed: legacy.confirmed, workAssignments: { u1p0: { workRegime: '12x36' } } });
  assert.equal(d.published.filter(record => record.date === legacy.date && record.shift === 'night').length, 0);
});
