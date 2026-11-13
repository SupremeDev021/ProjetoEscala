import type { Data } from "./models";

export function initialData(): Data {
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
  return { units, roles, professionals: [], links: [], teams: [], members: [], schedules: [], published: [], events: [],
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
  };
}
