import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedProfessionals, shiftId, shiftWindow, type PunchRecord, type ShiftContext } from './pontoFacialService';
const context: ShiftContext = { unitId: 'u1', referenceDate: '2026-11-10', shift: 'night', professionalIds: ['p1', 'p2'] };
const record: PunchRecord = { professionalId: 'p1', unitId: 'u1', timestamp: '2026-11-11T02:00:00-03:00', type: 'entry', received: true, validation: 'confirmed', shiftId: shiftId(context) };
const now = Date.parse('2026-11-11T06:59:00-03:00');
test('confirma entrada noturna após meia-noite pelo ID e mantém não confirmados intactos', () => {
  assert.deepEqual([...confirmedProfessionals([record], context, now)], ['p1']);
  assert.equal(shiftWindow(context).end, Date.parse('2026-11-11T07:00:00-03:00'));
});
test('ignora outra unidade, profissional, plantão, saída, pendente, rejeitado e não recebido', () => {
  const patches: Partial<PunchRecord>[] = [{ unitId: 'u2' }, { professionalId: 'p3' }, { shiftId: 'old' }, { type: 'exit' }, { validation: 'pending' }, { validation: 'rejected' }, { received: false }];
  for (const patch of patches) assert.equal(confirmedProfessionals([{ ...record, ...patch }], context, now).size, 0);
});
test('rejeita registros antigos, futuros, inválidos e no limite do próximo plantão', () => {
  for (const timestamp of ['2026-11-09T19:00:00-03:00', '2026-11-11T07:00:00-03:00', 'invalid']) {
    assert.equal(confirmedProfessionals([{ ...record, timestamp }], context, now).size, 0);
  }
  assert.equal(confirmedProfessionals([record], { ...context, referenceDate: '2026-11-11', shift: 'day' }, now).size, 0);
});
test('janela de tolerância é configurável e inclui exatamente o início permitido', () => {
  const rules = { earlyMinutes: 15, lateMinutes: 120, dayHour: 7, nightHour: 19 };
  assert.equal(confirmedProfessionals([{ ...record, timestamp: '2026-11-10T18:45:00-03:00' }], context, now, rules).size, 1);
  assert.equal(confirmedProfessionals([{ ...record, timestamp: '2026-11-10T18:44:59-03:00' }], context, now, rules).size, 0);
  assert.equal(confirmedProfessionals([record], context, now, rules).size, 0);
});
