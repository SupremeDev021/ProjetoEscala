import test from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../seed';

test('importação por nome e cargo usa o catálogo e separa os lotes por unidade', () => {
  const d = seed();
  const session = { userId: 'admin', activeUnitId: 'u2' };
  const source = parseImport('NOME;CARGO;CPF\nPessoa Nova;Enfermeiro;000\nPessoa Revisar;Cargo desconhecido;000', 'u2:lote', 'cargo');
  const [ready, review] = previewImport(d, session, source).rows;
  assert.equal(ready.role, 'Enfermeiro');
  assert.equal(review.status, 'review');
  assert.equal(JSON.stringify(source).includes('000'), false);
  const published = structuredClone(d.published);
  commitImport(d, session, source, { [ready.rowId]: { action: 'create' } });
  const person = d.professionals.find(p => p.fullName === 'Pessoa Nova')!;
  assert.deepEqual(d.links.filter(l => l.professionalId === person.id).map(l => l.unitId), ['u2']);
  assert.deepEqual(d.published, published);
  assert.throws(() => commitImport(d, session, source, { [ready.rowId]: { action: 'create' } }));
});
import { CBO, classifyCbo, ensureRoleCatalog, normalizedName } from './cbo';
import { commitImport, parseImport, previewImport } from './professionalImport';
const s = { userId: 'gestor', activeUnitId: 'u1' };
test('catálogo completo por CBO textual, ignore e desconhecido; IDs e publicações preservados', () => {
  const expected = `111415|Dirigente do Serviço Público;131205|Diretor de Serviços de Saúde;131210|Gerente de Serviços de Saúde;142105|Gerente Administrativo;212310|Técnico de Informática;221105|IGNORE;223208|Odontologia;223405|Farmacêutica;223505|Enfermeiro;223565|Enfermeiro;225124|Pediatra;225125|Médico;225150|Médico;225320|Médico;251605|Assistente Social;252405|Supervisor de RH;313220|Técnico de Informática;314115|Técnico de Manutenção/Refrigeração;317210|Técnico de Informática;322205|Técnico de Enfermagem;322405|Técnico Saúde Bucal;324115|Técnico de Radiologia;324120|Técnico de Radiologia;324205|Técnico Laboratório;325110|Técnico Laboratório;325115|Assistente Farmácia;410105|Supervisor de RH;411010|Administrativo;414105|Almoxarifado;422105|Recepcionista;513425|Copa;514310|Técnico de Manutenção/Refrigeração;514320|Auxiliar de Serviços Gerais;514325|Técnico de Manutenção/Refrigeração;515110|Maqueiro;515135|Motorista de Ambulância;515215|Técnico Laboratório;516335|Roupeiro;516345|Roupeiro;516405|Roupeiro;517415|Agente de Portaria;715615|Técnico de Manutenção/Refrigeração;725705|Técnico de Manutenção/Refrigeração;782320|Motorista de Ambulância;225133|Psiquiatra;251510|Psicólogo;223710|Nutricionista;410205|Supervisor de Almoxarifado;513115|Rouparia;223605|Fisioterapeuta`;
  assert.equal(Object.keys(CBO).length, expected.split(';').length);
  for (const item of expected.split(';')) { const [code, name] = item.split('|'); assert.equal(CBO[code], name === 'IGNORE' ? null : name); }
  assert.equal(classifyCbo('221105').status, 'ignored'); assert.equal(classifyCbo('000123').cbo, '000123'); assert.equal(classifyCbo('000123').status, 'unknown');
  const d = seed(), before = structuredClone(d); ensureRoleCatalog(d); ensureRoleCatalog(d);
  assert.deepEqual(d.roles.slice(0, before.roles.length), before.roles); assert.deepEqual(d.professionals, before.professionals); assert.deepEqual(d.published, before.published);
  assert.equal(d.roles.filter(r => normalizedName(r.name) === 'medico').length, 1);
  assert.ok(d.roles.some(r => r.name === 'Roupeiro')); assert.ok(d.roles.some(r => r.name === 'Rouparia'));
});
test('parser descarta identificadores sensíveis, equipe e linhas ignoradas; preserva CBO textual', () => {
  const parsed = parseImport('NOME;CBO;CPF;CNS;EQUIPE;CARGO\n"Pessoa Fictícia, Teste";000123;PRIVATE_A;PRIVATE_B;A;\nNome Ignorado;221105;PRIVATE_C;PRIVATE_D;B;', 'batch');
  const json = JSON.stringify(parsed); assert.ok(!json.includes('PRIVATE_')); assert.ok(!json.includes('Nome Ignorado'));
  assert.equal(parsed.ignored, 1); assert.equal(parsed.rows[0].cbo, '000123'); assert.equal(parsed.rows[0].name, 'Pessoa Fictícia, Teste');
  assert.throws(() => parseImport('NOME;NOME;CBO\nA;B;223505', 'batch'));
});
test('prévia não grava; importação explícita não altera escalas, modelos ou cadastros anteriores', () => {
  const d = seed(); const before = structuredClone(d);
  const source = parseImport('NOME;CBO\nPessoa Fictícia Nova;225124\nNome Sem Código;000123', 'batch');
  const preview = previewImport(d, s, source); assert.deepEqual(d, before); assert.equal(preview.rows[1].status, 'review');
  const totals = commitImport(d, s, source, { [preview.rows[0].rowId]: { action: 'create' } });
  assert.equal(totals.created, 1); assert.equal(totals.review, 1);
  assert.deepEqual(d.professionals.slice(0, before.professionals.length), before.professionals); assert.deepEqual(d.schedules, before.schedules); assert.deepEqual(d.published, before.published); assert.deepEqual(d.members, before.members); assert.deepEqual(d.teams, before.teams);
  const saved = structuredClone(d); assert.throws(() => commitImport(d, s, source, { [preview.rows[0].rowId]: { action: 'create', reviewed: true } })); assert.deepEqual(d, saved);
  assert.doesNotThrow(() => previewImport(d, { userId: 'admin', activeUnitId: 'u0' }, source));
  assert.throws(() => previewImport(d, { userId: 'gestor', activeUnitId: 'u0' }, source));
});
test('homônimos, repetidos e divergência de cargo exigem revisão; sem sobrescrita ou associação automática', () => {
  const d = seed(), name = d.professionals.find(p => p.id === 'u1p0')!.fullName;
  const source = parseImport(`NOME;CBO;CARGO\n${name};225125;Médico\nPessoa Fictícia Repetida;223505;Enfermeiro\nPessoa Fictícia Repetida;223505;Enfermeiro\nOutra Pessoa Fictícia;225124;Médico`, 'batch');
  const rows = previewImport(d, s, source).rows; assert.ok(rows.every(r => r.status === 'review'));
  const before = structuredClone(d); assert.throws(() => commitImport(d, s, source, { [rows[0].rowId]: { action: 'link', professionalId: 'u1p0' } })); assert.deepEqual(d, before);
  const totals = commitImport(d, s, source, { [rows[0].rowId]: { action: 'link', professionalId: 'u1p0', reviewed: true } });
  assert.equal(totals.linked, 1); assert.equal(d.professionals.length, before.professionals.length); assert.deepEqual(d.published, before.published);
});

test('possível correspondência em outra unidade não gera duplicata e não revela IDs ao gestor', () => {
  const d = seed(); const name = d.professionals.find(p => p.id === 'u0p0')!.fullName;
  const source = parseImport(`NOME;CBO\n${name};225125`, 'batch');
  const row = previewImport(d, s, source).rows[0];
  assert.equal(row.status, 'review'); assert.equal(row.restrictedMatch, true); assert.deepEqual(row.candidates, []);
  const before = structuredClone(d); assert.throws(() => commitImport(d, s, source, { [row.rowId]: { action: 'create', reviewed: true } })); assert.deepEqual(d, before);
  const admin = { userId: 'admin', activeUnitId: 'u1' };
  const totals = commitImport(d, admin, source, { [row.rowId]: { action: 'link', professionalId: 'u0p0', reviewed: true } });
  assert.equal(totals.linked, 1); assert.equal(d.professionals.length, before.professionals.length);
  assert.ok(d.links.some(l => l.professionalId === 'u0p0' && l.unitId === 'u1'));
});
