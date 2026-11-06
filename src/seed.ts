import type { Data, Schedule } from "./models";
export const DEMO_DATE = "2026-11-06";
export function seed(): Data {
  const units = [
    "UPA ROCHA MIRANDA",
    "CER BARRA",
    "UPA CIDADE DE DEUS",
    "UPA SEPETIBA",
  ].map((name, i) => ({ id: `u${i}`, name, active: true }));
  const roles = [
    "Médico",
    "Enfermeiro",
    "Técnico de Enfermagem",
    "Maqueiro",
    "Fisioterapeuta",
    "Administrativo",
  ].map((name, i) => ({ id: `r${i}`, name, active: true }));
  const first = [
    "Aurora",
    "Bento",
    "Celina",
    "Dário",
    "Estela",
    "Fabiano",
    "Gaia",
    "Hélio",
    "Íris",
    "Jonas",
    "Kiara",
    "Luan",
  ];
  const last = ["Vale Azul", "Monte Claro", "Rio Sereno", "Campo Dourado"];
  const professionals = units.flatMap((u, i) =>
    Array.from({ length: 18 }, (_, j) => ({
      id: `${u.id}p${j}`,
      fullName: `${first[j % 12]} ${last[i]} ${j >= 12 ? "Luz" : ""}`.trim(),
      roleId: `r${j % 6}`,
      specialty:
        j % 6 === 0 ? "Clínica geral" : j % 6 === 1 ? "Urgência" : undefined,
      active: true,
    })),
  );
  const teams = units.flatMap((u) =>
    ["A", "B", "C", "D"].map((name) => ({
      id: `${u.id}${name}`,
      unitId: u.id,
      name,
      active: true,
    })),
  );
  const members = teams.flatMap((t) =>
    professionals
      .filter(
        (p) =>
          p.id.startsWith(t.unitId) &&
          Number(p.id.split("p")[1]) < (t.name === "B" ? 12 : 6),
      )
      .map((p) => ({ teamId: t.id, professionalId: p.id, roleId: p.roleId })),
  );
  const schedules: Schedule[] = units.flatMap((u) =>
    roles.flatMap((r) =>
      (["day", "night"] as const).map((shift) => ({
        id: `${u.id}-${r.id}-${shift}`,
        unitId: u.id,
        date: DEMO_DATE,
        shift,
        teamId: `${u.id}A`,
        roleId: r.id,
        professionalIds: professionals
          .filter((p) => p.id.startsWith(u.id) && p.roleId === r.id)
          .slice(0, shift === "day" ? 2 : 1)
          .map((p) => p.id),
        status: "published" as const,
        version: 1,
        updatedAt: "2026-11-06T10:00:00Z",
      })),
    ),
  );
  schedules.push({
    ...schedules[0],
    id: "initial-draft",
    date: "2026-11-07",
    status: "draft",
  });
  return {
    units,
    roles,
    professionals,
    links: professionals.map((p) => ({
      professionalId: p.id,
      unitId: p.id.slice(0, 2),
      active: true,
    })),
    teams,
    members,
    schedules,
    published: structuredClone(
      schedules.filter((s) => s.status === "published"),
    ),
    users: [
      {
        id: "admin",
        email: "admin@exemplo.com",
        displayName: "Alex Modelo",
        role: "global_admin",
        unitIds: units.map((u) => u.id),
        active: true,
      },
      {
        id: "gestor",
        email: "gestor.cerbarra@exemplo.com",
        displayName: "Marina Exemplo",
        role: "unit_manager",
        unitIds: ["u1"],
        active: true,
      },
    ],
    events: [
      {
        id: "seed-event",
        actor: "Alex Modelo",
        unitId: "u1",
        entity: "Escala",
        entityId: "seed",
        action: "Publicar",
        timestamp: "2026-11-06T10:00:00Z",
        after: "Versão inicial de demonstração publicada.",
      },
    ],
  };
}
