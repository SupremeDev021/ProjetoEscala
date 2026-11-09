import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../seed";
import { saoPauloClock, projectDashboard, unitSlug } from "./data";
test("transições exatas de 07h e 19h em São Paulo", () => {
  for (const [time, shift, date] of [
    ["2026-11-10T18:59:59-03:00", "day", "2026-11-10"],
    ["2026-11-10T19:00:00-03:00", "night", "2026-11-10"],
    ["2026-11-11T06:59:59-03:00", "night", "2026-11-10"],
    ["2026-11-11T07:00:00-03:00", "day", "2026-11-11"],
  ]) {
    const c = saoPauloClock(new Date(time));
    assert.equal(c.shift, shift);
    assert.equal(c.referenceDate, date);
  }
});
test("madrugada mantém data de início, inclusive virada de ano e mês", () => {
  assert.equal(
    saoPauloClock(new Date("2027-01-01T03:00:00-03:00")).referenceDate,
    "2026-12-31",
  );
  assert.equal(
    saoPauloClock(new Date("2026-12-01T00:00:00-03:00")).referenceDate,
    "2026-11-30",
  );
  assert.equal(
    saoPauloClock(new Date("2026-11-10T22:00:00Z")).time,
    "19:00:00",
  );
});
test("filtra unidade, data, turno e publicações; separa funções e calcula indicadores", () => {
  const d = seed();
  d.published.push({
    ...d.published[0],
    id: "draft-leak",
    unitId: "u1",
    status: "draft",
    professionalIds: ["u1p12"],
  });
  const r = projectDashboard(d, "u1", "2026-11-06", "day");
  assert.equal(r.total, 12);
  assert.equal(r.functions, 6);
  assert.equal(r.doctors, 2);
  assert.equal(r.nursing, 4);
  for (const g of r.groups) {
    assert.ok(
      g.professionals.every(
        (p) => p.roleId === g.role.id && p.id.startsWith("u1"),
      ),
    );
    assert.deepEqual(
      g.professionals.map((p) => p.fullName),
      g.professionals
        .map((p) => p.fullName)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    );
  }
  assert.ok(!r.groups[0].professionals.some((p) => p.id === "u1p12"));
});
test("deduplica nomes e distingue escala ausente de publicação vazia", () => {
  const d = seed();
  d.published.push({
    ...d.published.find((x) => x.unitId === "u1" && x.shift === "day")!,
    id: "other-team",
    teamId: "u1B",
  });
  assert.equal(projectDashboard(d, "u1", "2026-11-06", "day").total, 12);
  assert.equal(projectDashboard(d, "u1", "2026-12-01", "day").state, "missing");
  d.published = d.published.map((s) => ({ ...s, professionalIds: [] }));
  const r = projectDashboard(d, "u1", "2026-11-06", "day");
  assert.equal(r.state, "empty");
  assert.equal(r.groups[0].state, "empty");
  assert.equal(r.total, 0);
});
test("novos cargos aparecem sem alterar componentes e vínculos cruzados são omitidos", () => {
  const d = seed();
  d.roles.push({ id: "new", name: "Psicólogo", active: true });
  d.published[0].professionalIds.push("u1p0");
  const r = projectDashboard(d, "u0", "2026-11-06", "day");
  assert.ok(r.groups.some((g) => g.role.id === "new" && g.state === "missing"));
  assert.ok(!r.groups[0].professionals.some((p) => p.id === "u1p0"));
  assert.equal(unitSlug("UPA CIDADE DE DEUS"), "upa-cidade-de-deus");
});
