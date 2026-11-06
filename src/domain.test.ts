import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "./seed";
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
} from "./domain";
const manager = { userId: "gestor", activeUnitId: "u1" };
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
