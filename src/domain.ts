import type {
  Data,
  Session,
  Schedule,
  Professional,
  Team,
  UserAccess,
  Unit,
} from "./models";
export const STORAGE_KEY = "rio-escalas-demo-v1";
export const key = (
  s: Pick<Schedule, "unitId" | "date" | "shift" | "teamId" | "roleId">,
) => [s.unitId, s.date, s.shift, s.teamId, s.roleId].join("|");
export function scope(d: Data, s: Session, unitId = s.activeUnitId) {
  const u = d.users.find((u) => u.id === s.userId);
  if (
    !u?.active ||
    !d.units.find((x) => x.id === unitId)?.active ||
    unitId !== s.activeUnitId ||
    (u.role !== "global_admin" && !u.unitIds.includes(unitId))
  )
    throw Error("Operação fora da unidade autorizada na simulação.");
  return u;
}
export function admin(d: Data, s: Session) {
  const u = scope(d, s);
  if (u.role !== "global_admin")
    throw Error("Acesso exclusivo do administrador geral.");
}
export function available(d: Data, unitId: string, roleId?: string) {
  return d.professionals.filter(
    (p) =>
      p.active &&
      (!roleId || p.roleId === roleId) &&
      d.links.some(
        (l) => l.unitId === unitId && l.professionalId === p.id && l.active,
      ),
  );
}
export function event(
  d: Data,
  s: Session,
  entity: string,
  entityId: string,
  action: string,
  before?: unknown,
  after?: unknown,
) {
  const u = scope(d, s);
  d.events.unshift({
    id: crypto.randomUUID(),
    actor: u.displayName,
    unitId: s.activeUnitId,
    entity,
    entityId,
    action,
    timestamp: new Date().toISOString(),
    before: structuredClone(before),
    after: structuredClone(after),
  });
}
export function saveSchedule(
  d: Data,
  s: Session,
  input: Schedule,
  publish: boolean,
) {
  scope(d, s, input.unitId);
  if (
    !input.date ||
    !d.teams.some(
      (t) => t.id === input.teamId && t.unitId === s.activeUnitId && t.active,
    ) ||
    !d.roles.some((r) => r.id === input.roleId && r.active)
  )
    throw Error("Preencha data, equipe e cargo válidos.");
  const old = d.schedules.find((x) => key(x) === key(input));
  const allowed = available(d, s.activeUnitId, input.roleId).map((p) => p.id);
  if (
    input.professionalIds.some(
      (id) => !allowed.includes(id) && !old?.professionalIds.includes(id),
    )
  )
    throw Error("Profissional indisponível para esta unidade e cargo.");
  if (publish && !input.professionalIds.length)
    throw Error("Selecione pelo menos um profissional.");
  const record = {
    ...input,
    professionalIds: [...new Set(input.professionalIds)],
    id: old?.id || crypto.randomUUID(),
    status: publish ? ("published" as const) : ("draft" as const),
    version: (old?.version || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  d.schedules = d.schedules.filter((x) => key(x) !== key(record));
  d.schedules.push(record);
  if (publish) {
    d.published = d.published.filter((x) => key(x) !== key(record));
    d.published.push(structuredClone(record));
  }
  event(
    d,
    s,
    "Escala",
    record.id,
    publish ? "Publicar" : old ? "Editar escala" : "Criar rascunho",
    old,
    record,
  );
}
export function saveProfessional(
  d: Data,
  s: Session,
  p: Professional,
  teamId?: string,
) {
  scope(d, s);
  const old = d.professionals.find((x) => x.id === p.id);
  if (
    old &&
    !d.links.some(
      (l) => l.professionalId === old.id && l.unitId === s.activeUnitId,
    )
  )
    throw Error("Cadastro fora da unidade.");
  if (p.fullName.trim().length < 3 || !d.roles.some((r) => r.id === p.roleId))
    throw Error("Informe nome completo e cargo.");
  if (
    old &&
    old.roleId !== p.roleId &&
    d.schedules.some((x) => x.professionalIds.includes(p.id))
  )
    throw Error(
      "O cargo tem escalas vinculadas. Cadastre um novo vínculo profissional para preservar o histórico.",
    );
  d.professionals = d.professionals.filter((x) => x.id !== p.id);
  d.professionals.push({ ...p, fullName: p.fullName.trim() });
  if (!old)
    d.links.push({
      professionalId: p.id,
      unitId: s.activeUnitId,
      active: true,
    });
  const defaultTeam =
    d.members.find(
      (m) =>
        m.professionalId === p.id &&
        d.teams.some((t) => t.id === m.teamId && t.unitId === s.activeUnitId),
    )?.teamId || "";
  if (
    teamId !== undefined &&
    (teamId !== defaultTeam || old?.roleId !== p.roleId)
  ) {
    d.members = d.members.filter(
      (m) =>
        !(
          m.professionalId === p.id &&
          d.teams.some((t) => t.id === m.teamId && t.unitId === s.activeUnitId)
        ),
    );
    if (teamId) {
      if (
        !d.teams.some(
          (t) => t.id === teamId && t.unitId === s.activeUnitId && t.active,
        )
      )
        throw Error("Equipe inválida.");
      d.members.push({ teamId, professionalId: p.id, roleId: p.roleId });
    }
  }
  event(d, s, "Profissional", p.id, old ? "Editar" : "Cadastrar", old, p);
}
export function toggleProfessional(d: Data, s: Session, id: string) {
  scope(d, s);
  const p = d.professionals.find((p) => p.id === id);
  if (
    !p ||
    !d.links.some((l) => l.professionalId === id && l.unitId === s.activeUnitId)
  )
    throw Error("Profissional fora da unidade.");
  const before = structuredClone(p);
  p.active = !p.active;
  event(
    d,
    s,
    "Profissional",
    id,
    p.active ? "Reativar" : "Desativar",
    before,
    p,
  );
}
export function saveTeam(d: Data, s: Session, t: Team, ids: string[]) {
  scope(d, s, t.unitId);
  const old = d.teams.find((x) => x.id === t.id);
  if (old && old.unitId !== s.activeUnitId)
    throw Error("Equipe fora da unidade autorizada.");
  if (!t.name.trim()) throw Error("Informe o nome da equipe.");
  if (ids.some((id) => !available(d, s.activeUnitId).some((p) => p.id === id)))
    throw Error("Seleção inválida.");
  const before = {
    team: old,
    members: d.members.filter((m) => m.teamId === t.id),
  };
  d.teams = d.teams.filter((x) => x.id !== t.id);
  d.teams.push(t);
  d.members = d.members.filter((m) => m.teamId !== t.id);
  ids.forEach((id) =>
    d.members.push({
      teamId: t.id,
      professionalId: id,
      roleId: d.professionals.find((p) => p.id === id)!.roleId,
    }),
  );
  event(d, s, "Equipe", t.id, "Alterar equipe", before, {
    team: t,
    members: ids,
  });
}
export function saveUnit(d: Data, s: Session, u: Unit) {
  admin(d, s);
  if (!u.name.trim()) throw Error("Informe a unidade.");
  if (!u.active && u.id === s.activeUnitId)
    throw Error("Selecione outra unidade antes de desativar a unidade ativa.");
  const old = d.units.find((x) => x.id === u.id);
  d.units = d.units.filter((x) => x.id !== u.id);
  d.units.push(u);
  event(d, s, "Unidade", u.id, old ? "Editar" : "Cadastrar", old, u);
}
export function saveAccess(d: Data, s: Session, u: UserAccess) {
  admin(d, s);
  if (
    !/^[^@\s]+@exemplo\.com$/.test(u.email) ||
    !u.displayName.trim() ||
    !u.unitIds.length ||
    u.unitIds.some((id) => !d.units.some((x) => x.id === id && x.active))
  )
    throw Error("Use um e-mail @exemplo.com, nome e unidade ativa.");
  if (u.id === s.userId && !u.active)
    throw Error("Não é possível revogar o perfil ativo.");
  const old = d.users.find((x) => x.id === u.id);
  d.users = d.users.filter((x) => x.id !== u.id);
  d.users.push(u);
  event(d, s, "Acesso", u.id, u.active ? "Autorizar" : "Revogar", old, u);
}
