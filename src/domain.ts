import { validateRegime } from "./services/workRegimes";
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
  if (input.date !== todaySaoPaulo()) throw Error("A montagem deve usar o dia atual de São Paulo.");
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
    [...d.schedules, ...d.published].some((x) => x.professionalIds.includes(p.id))
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


export function todaySaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export interface Assembly {
  unitId: string; date: string; shift: Schedule["shift"]; teamId: string;
  workRegime?: Schedule["workRegime"]; startTime?: string;
  selections: Record<string, string[]>;
  confirmed: Record<string, boolean>;
}
export function publishAssembly(d: Data, s: Session, input: Assembly) {
  scope(d, s, input.unitId);
  if (input.date !== todaySaoPaulo()) throw Error("A montagem deve usar o dia atual de São Paulo.");
  if (!["day", "night"].includes(input.shift) || !d.teams.some(t => t.id === input.teamId && t.unitId === input.unitId && t.active))
    throw Error("Equipe ou turno inválido.");
  validateRegime(input.workRegime, input.shift, input.startTime);
  const roles = d.roles.filter(r => r.active);
  if (!roles.length || roles.some(r => !input.confirmed[r.id])) throw Error("Confirme todos os cargos antes de publicar.");
  if (!roles.some(r => input.selections[r.id]?.length)) throw Error("Selecione pelo menos um profissional na montagem.");
  const timestamp = new Date().toISOString();
  const publicationId = crypto.randomUUID();
  const shifts = input.workRegime === "24h" ? ["day", "night"] as const : [input.shift];
  const records = roles.flatMap(r => shifts.map(shift => {
    const ids = [...new Set(input.selections[r.id] || [])];
    const allowed = available(d, input.unitId, r.id);
    if (ids.some(id => !allowed.some(p => p.id === id))) throw Error("Profissional indisponível para esta unidade e cargo.");
    const target = { unitId: input.unitId, date: input.date, shift, teamId: input.teamId, roleId: r.id };
    const old = d.schedules.find(x => key(x) === key(target));
    const published = d.published.find(x => key(x) === key(target));
    return { ...target, id: old?.id || published?.id || crypto.randomUUID(), professionalIds: ids,
      workRegime: input.workRegime || "12x36", startTime: input.workRegime === "diarist" ? input.startTime || "08:00" : undefined, publicationId,
      status: "published" as const, version: Math.max(old?.version || 0, published?.version || 0) + 1, updatedAt: timestamp };
  }));
  // Build and audit on an isolated copy: failures never leave a partial publication.
  const next = structuredClone(d);
  for (const record of records) {
    const old = next.schedules.find(x => key(x) === key(record));
    next.schedules = next.schedules.filter(x => key(x) !== key(record));
    next.published = next.published.filter(x => key(x) !== key(record));
    next.schedules.push(record);
    next.published.push(structuredClone(record));
    event(next, s, "Escala", record.id, "Publicar", old, record);
  }
  Object.assign(d, next);
}
export function copyPublication(d: Data, s: Session, records: Schedule[]) {
  if (!records.length) throw Error("Publicação vazia.");
  const first = records[0];
  scope(d, s, first.unitId);
  if (records.some(x => x.unitId !== first.unitId || x.date !== first.date || (x.shift !== first.shift && !(first.workRegime === "24h" && first.publicationId && x.publicationId === first.publicationId)) || x.teamId !== first.teamId || x.status !== "published"))
    throw Error("Publicação incompatível.");
  if (!d.teams.some(t => t.id === first.teamId && t.unitId === first.unitId && t.active)) throw Error("A equipe de origem está inativa ou indisponível.");
  const selections: Record<string, string[]> = {};
  const ignored = new Set<string>();
  for (const record of records) {
    const allowed = d.roles.some(r => r.id === record.roleId && r.active) ? available(d, first.unitId, record.roleId) : [];
    selections[record.roleId] = record.professionalIds.filter(id => {
      if (allowed.some(p => p.id === id)) return true;
      ignored.add(d.professionals.find(p => p.id === id)?.fullName || id); return false;
    });
  }
  return { assembly: { unitId: first.unitId, date: todaySaoPaulo(), shift: first.workRegime === "24h" ? "day" : first.shift, teamId: first.teamId, workRegime: first.workRegime || "12x36", startTime: first.startTime, selections, confirmed: {} } as Assembly, ignored: [...ignored] };
}
