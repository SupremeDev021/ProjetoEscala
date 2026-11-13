import test from "node:test";
import assert from "node:assert/strict";
import { seed as originalSeed } from "./seed";
import {
  key,
  saveSchedule,
  saveProfessional,
  toggleProfessional,
  saveTeam,
  saveUnit,
  saveAccess,
  available,
  scope,
  todaySaoPaulo,
  publishAssembly,
  copyPublication,
  confirmAssemblyRole,
  resumeAssembly,
  clearAssemblyConfirmations,
  type Assembly,
} from "./domain";
function seed() {
  const d = originalSeed();
  for (const x of [...d.schedules, ...d.published]) if (x.date === "2026-11-06") x.date = todaySaoPaulo();
  return d;
}
const manager = { userId: "gestor", activeUnitId: "u1" };
test("confirmações restauram seleções por contexto sem alterar a publicação", () => {
  const d = seed();
  const professionalId = available(d, "u1", "r0")[0].id;
  const input: Assembly = {
    unitId: "u1", date: todaySaoPaulo(), shift: "day", teamId: d.teams.find(t => t.unitId === "u1")!.id,
    selections: { r0: [professionalId], r1: [] }, confirmed: {},
  };
  const published = structuredClone(d.published);
  const schedules = structuredClone(d.schedules);
  confirmAssemblyRole(d, manager, input, "r1");
  confirmAssemblyRole(d, manager, input, "r0");
  assert.deepEqual(d.published, published);
  assert.deepEqual(d.schedules, schedules);

  const reloaded = JSON.parse(JSON.stringify(d)) as typeof d;
  assert.deepEqual(resumeAssembly(reloaded, manager, input).selections, input.selections);
  assert.deepEqual(resumeAssembly(reloaded, manager, input).confirmed, { r0: true, r1: true });
  for (const context of [
    { date: "2026-01-01" }, { shift: "night" }, { teamId: "outra-equipe" },
    { workRegime: "24h" }, { workRegime: "diarist", startTime: "09:00" },
  ] satisfies Partial<Assembly>[]) {
    assert.deepEqual(resumeAssembly(reloaded, manager, { ...input, ...context }).confirmed, {});
  }
  assert.deepEqual(resumeAssembly(reloaded, { userId: "admin", activeUnitId: "u2" },
    { ...input, unitId: "u2" }).confirmed, {});
  assert.throws(() => confirmAssemblyRole(reloaded, manager, { ...input, unitId: "u2" }, "r0"));

  reloaded.professionals.find(p => p.id === professionalId)!.active = false;
  assert.equal(resumeAssembly(reloaded, manager, input).confirmed.r0, false);
  assert.equal(resumeAssembly(reloaded, manager, input).confirmed.r1, true);
  clearAssemblyConfirmations(reloaded, manager, input);
  assert.deepEqual(resumeAssembly(reloaded, manager, input).confirmed, {});
});
test("rascunho mantém a publicação; publicar substitui a chave sem duplicar nem alterar o modelo", () => {
  const d = seed();
  const old = structuredClone(
    d.schedules.find(
      (x) => x.unitId === "u1" && x.roleId === "r0" && x.shift === "day",
    )!,
  );
  const members = structuredClone(d.members);
  const edited = { ...old, professionalIds: ["u1p12"] };
  saveSchedule(d, manager, edited, false);
  assert.deepEqual(
    d.published.find((x) => key(x) === key(old))!.professionalIds,
    old.professionalIds,
  );
  assert.equal(d.schedules.filter((x) => key(x) === key(old)).length, 1);
  saveSchedule(d, manager, edited, true);
  assert.deepEqual(
    d.published.find((x) => key(x) === key(old))!.professionalIds,
    ["u1p12"],
  );
  assert.equal(d.published.filter((x) => key(x) === key(old)).length, 1);
  assert.deepEqual(d.members, members);
  assert.equal(d.schedules.find((x) => key(x) === key(old))!.version, 3);
  assert.equal(d.events[0].action, "Publicar");
});
test("gestor não escreve em outra unidade nem administra acessos", () => {
  const d = seed();
  assert.throws(() => scope(d, { ...manager, activeUnitId: "u0" }));
  assert.throws(() => saveSchedule(d, manager, d.schedules[0], false));
  assert.throws(() => saveTeam(d, manager, d.teams[0], []));
  assert.throws(() =>
    saveTeam(d, manager, { ...d.teams[0], unitId: "u1" }, []),
  );
  assert.throws(() =>
    saveUnit(d, manager, { id: "x", name: "Unidade teste", active: true }),
  );
  assert.throws(() => saveAccess(d, manager, d.users[0]));
  assert.throws(() => toggleProfessional(d, manager, "u0p0"));
});
test("cadastro, desativação e reativação preservam escalas e histórico; nomes se refletem por id", () => {
  const d = seed();
  const schedules = structuredClone(d.schedules);
  const p = {
    id: "new",
    fullName: "Pessoa Fictícia Teste",
    roleId: "r0",
    active: true,
  };
  saveProfessional(d, manager, p);
  assert.ok(available(d, "u1").some((x) => x.id === "new"));
  toggleProfessional(d, manager, p.id);
  assert.ok(!available(d, "u1").some((x) => x.id === p.id));
  toggleProfessional(d, manager, p.id);
  assert.ok(available(d, "u1").some((x) => x.id === p.id));
  const deactivation = d.events.find(
    (e) => e.entityId === p.id && e.action === "Desativar",
  )!;
  assert.equal((deactivation.after as { active: boolean }).active, false);
  const membersBeforeRename = structuredClone(d.members);
  saveProfessional(d, manager, {
    ...d.professionals.find((x) => x.id === "u1p0")!,
    fullName: "Novo Nome Fictício",
  });
  assert.deepEqual(d.schedules, schedules);
  assert.deepEqual(d.members, membersBeforeRename);
  assert.equal(d.events.filter((e) => e.entityId === "new").length, 3);
  const edited = d.events.find((e) => e.entityId === "u1p0")!;
  assert.notEqual(
    (edited.before as { fullName: string }).fullName,
    (edited.after as { fullName: string }).fullName,
  );
});
test("modelo editado vale apenas para montagens futuras", () => {
  const d = seed();
  const old = structuredClone(d.schedules);
  saveTeam(
    d,
    manager,
    d.teams.find((t) => t.id === "u1A")!,
    ["u1p12"],
  );
  assert.deepEqual(
    d.members.filter((m) => m.teamId === "u1A").map((m) => m.professionalId),
    ["u1p12"],
  );
  assert.deepEqual(d.schedules, old);
});
test("publicação exige nomes e rejeita novos vínculos inativos ou de outro cargo", () => {
  const d = seed();
  const x = d.schedules.find((x) => x.unitId === "u1" && x.roleId === "r0")!;
  assert.throws(() =>
    saveSchedule(d, manager, { ...x, professionalIds: [] }, true),
  );
  assert.throws(() =>
    saveSchedule(d, manager, { ...x, professionalIds: ["u0p0"] }, true),
  );
  assert.throws(() =>
    saveSchedule(d, manager, { ...x, professionalIds: ["u1p1"] }, true),
  );
  toggleProfessional(d, manager, "u1p12");
  assert.throws(() =>
    saveSchedule(d, manager, { ...x, professionalIds: ["u1p12"] }, true),
  );
});
test("unidades e associações são locais e auditáveis; não revogar perfil ativo", () => {
  const d = seed();
  const s = { userId: "admin", activeUnitId: "u0" };
  saveUnit(d, s, {
    id: "newunit",
    name: "Unidade Fictícia Teste",
    active: true,
  });
  saveAccess(d, s, {
    id: "newuser",
    email: "novo@exemplo.com",
    displayName: "Usuário Exemplo",
    role: "unit_manager",
    unitIds: ["newunit"],
    active: true,
  });
  assert.ok(d.users.some((u) => u.id === "newuser"));
  assert.throws(() =>
    saveAccess(d, s, {
      ...d.users.find((u) => u.id === "admin")!,
      active: false,
    }),
  );
  assert.throws(() =>
    saveAccess(d, s, { ...d.users[0], email: "real@outro.com" }),
  );
  assert.throws(() =>
    saveUnit(d, s, { ...d.units.find((u) => u.id === "u0")!, active: false }),
  );
});

function assembly(): Assembly {
  return { unitId: "u1", date: todaySaoPaulo(), shift: "day", teamId: "u1A",
    selections: { r0: ["u1p0", "u1p0"] }, confirmed: Object.fromEntries(seed().roles.map(r => [r.id, true])) };
}
test("data atual de São Paulo e bloqueio de datas diferentes em todas as gravações", () => {
  assert.equal(todaySaoPaulo(new Date("2026-11-12T02:59:59Z")), "2026-11-11");
  assert.equal(todaySaoPaulo(new Date("2026-11-12T03:00:00Z")), "2026-11-12");
  const d = seed(); const before = structuredClone(d);
  assert.throws(() => publishAssembly(d, manager, { ...assembly(), date: "2000-01-01" }));
  assert.throws(() => saveSchedule(d, manager, { ...d.schedules.find(x => x.unitId === "u1")!, date: "2000-01-01" }, false));
  assert.deepEqual(d, before);
});
test("publicação conjunta atualiza seis cargos, limpa vazios, preserva modelos e outras unidades", () => {
  const d = seed(); const before = structuredClone(d);
  publishAssembly(d, manager, assembly());
  const published = d.published.filter(x => x.unitId === "u1" && x.date === todaySaoPaulo() && x.shift === "day" && x.teamId === "u1A");
  assert.equal(published.length, 6);
  assert.deepEqual(published.find(x => x.roleId === "r0")!.professionalIds, ["u1p0"]);
  assert.ok(published.filter(x => x.roleId !== "r0").every(x => x.professionalIds.length === 0));
  assert.ok(published.every(x => x.version === 2));
  assert.equal(new Set(published.map(key)).size, 6);
  assert.equal(d.events.length - before.events.length, 6);
  assert.deepEqual(d.members, before.members);
  assert.deepEqual(d.published.filter(x => x.unitId !== "u1"), before.published.filter(x => x.unitId !== "u1"));
  publishAssembly(d, manager, assembly());
  assert.ok(d.published.filter(x => published.some(p => key(p) === key(x))).every(x => x.version === 3));
});
test("falha em qualquer etapa não altera estado nem dashboard", () => {
  for (const input of [
    { ...assembly(), confirmed: { r0: true } },
    { ...assembly(), selections: {} },
    { ...assembly(), selections: { r0: ["u1p0"], r5: ["u0p5"] } },
    { ...assembly(), selections: { r0: ["u1p1"] } },
    { ...assembly(), teamId: "u0A" },
    { ...assembly(), unitId: "u0" },
  ]) { const d = seed(); const before = structuredClone(d); assert.throws(() => publishAssembly(d, manager, input)); assert.deepEqual(d, before); }
  const d = seed(); d.professionals.find(p => p.id === "u1p0")!.active = false;
  const before = structuredClone(d); assert.throws(() => publishAssembly(d, manager, assembly())); assert.deepEqual(d, before);
});
test("cópia completa e antiga preserva origem, filtra inválidos e exige confirmações novas", () => {
  const d = seed();
  const source = d.published.filter(x => x.unitId === "u1" && x.shift === "day");
  source[0].date = "2020-01-01";
  source.forEach(x => x.date = "2020-01-01");
  d.professionals.find(p => p.id === "u1p0")!.active = false;
  source[0].professionalIds.push("u0p0", "u1p1");
  const before = structuredClone(d);
  const copy = copyPublication(d, manager, source);
  assert.equal(copy.assembly.date, todaySaoPaulo()); assert.deepEqual(copy.assembly.confirmed, {});
  assert.equal(copy.ignored.length, 3); assert.equal(Object.keys(copy.assembly.selections).length, 6);
  assert.deepEqual(d, before);
  assert.throws(() => publishAssembly(d, manager, copy.assembly));
  assert.throws(() => copyPublication(d, { userId: "admin", activeUnitId: "u0" }, source));
  assert.equal(Object.keys(copyPublication(d, manager, [source[0]]).assembly.selections).length, 1);
});
