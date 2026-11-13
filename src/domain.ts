import { validateRegime, workAssignment } from "./services/workRegimes";
import type {
  Data,
  Session,
  Schedule,
  Professional,
  Team,
  UserAccess,
  Unit,
  WorkAssignment,
  Shift,
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

export function teamAdditions(d: Data, s: Session, input: Assembly, teamId: string) {
  scope(d, s, input.unitId);
  if (!d.teams.some(t => t.id === teamId && t.unitId === input.unitId && t.active))
    throw Error("Equipe inválida.");
  const activeRoles = new Set(d.roles.filter(r => r.active).map(r => r.id));
  const eligible = new Map(available(d, input.unitId).map(p => [p.id, p]));
  const additions = new Map<string, { professional: Professional; assignment?: WorkAssignment }>();
  for (const member of d.members) {
    if (member.teamId !== teamId) continue;
    const professional = eligible.get(member.professionalId);
    if (!professional || professional.roleId !== member.roleId || !activeRoles.has(member.roleId)
      || input.selections[member.roleId]?.includes(professional.id)) continue;
    let assignment = member.workAssignment && workAssignment(member.workAssignment);
    if (assignment) {
      try { validateRegime(assignment.workRegime, input.shift, assignment.startTime); }
      catch { assignment = undefined; }
    }
    additions.set(professional.id, { professional, assignment });
  }
  return [...additions.values()];
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
    (input.teamId && !d.teams.some(
      (t) => t.id === input.teamId && t.unitId === s.activeUnitId && t.active,
    )) ||
    !d.roles.some((r) => r.id === input.roleId && r.active)
  )
    throw Error("Informe data e cargo válidos e, se indicada, uma equipe ativa da unidade.");
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
      workAssignment: before.members.find(m => m.professionalId === id)?.workAssignment,
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
  unitId: string; date: string; shift: Shift; teamId?: string;
  workRegime?: Schedule["workRegime"]; startTime?: string;
  selections: Record<string, string[]>;
  workAssignments?: Record<string, WorkAssignment>;
  confirmed: Record<string, boolean>;
}

export function assemblyContext(input: Assembly) {
  return JSON.stringify([input.unitId, input.date, input.shift, input.teamId || null]);
}

function legacyAssemblyContext(input: Assembly) {
  const regime = input.workRegime || "12x36";
  return JSON.stringify([input.unitId, input.date, input.shift, input.teamId, regime,
    regime === "diarist" ? input.startTime || "08:00" : null]);
}

export function resumeAssembly(d: Data, s: Session, input: Assembly): Assembly {
  scope(d, s, input.unitId);
  const selections: Assembly["selections"] = {};
  const confirmed: Assembly["confirmed"] = {};
  const workAssignments: NonNullable<Assembly["workAssignments"]> = {};
  const saved = d.assemblyConfirmations?.[assemblyContext(input)]
    ?? d.assemblyConfirmations?.[legacyAssemblyContext(input)];
  for (const [roleId, composition] of Object.entries(saved || {})) {
    if (!d.roles.some(r => r.id === roleId && r.active)) continue;
    const ids = Array.isArray(composition) ? composition : composition.professionalIds;
    const allowed = new Set(available(d, input.unitId, roleId).map(p => p.id));
    selections[roleId] = ids.filter(id => allowed.has(id));
    for (const id of selections[roleId]) {
      workAssignments[id] = workAssignment(Array.isArray(composition) ? input : composition.workAssignments[id] || {});
    }
    confirmed[roleId] = selections[roleId].length === ids.length
      && (Array.isArray(composition) || composition.confirmed !== false);
  }
  return { ...input, workRegime: undefined, startTime: undefined, selections, workAssignments, confirmed };
}

function roleComposition(d: Data, input: Assembly, roleId: string) {
  const professionalIds = [...new Set(input.selections[roleId] || [])];
  const allowed = new Map(available(d, input.unitId, roleId).map(p => [p.id, p]));
  const workAssignments = Object.fromEntries(professionalIds.map(id => {
    const professional = allowed.get(id);
    if (!professional) throw Error("Profissional indisponível para esta unidade e cargo.");
    const assignment = workAssignment(input.workAssignments?.[id] || input);
    try {
      validateRegime(assignment.workRegime, input.shift, assignment.startTime);
    } catch (error) {
      throw Error(`${professional.fullName}: ${(error as Error).message}`);
    }
    return [id, assignment];
  }));
  return { professionalIds, workAssignments };
}

export function confirmAssemblyRole(d: Data, s: Session, input: Assembly, roleId: string) {
  scope(d, s, input.unitId);
  if (input.date !== todaySaoPaulo()) throw Error("A montagem deve usar o dia atual de São Paulo.");
  if (input.teamId && !d.teams.some(t => t.id === input.teamId && t.unitId === input.unitId && t.active))
    throw Error("Equipe inválida.");
  if (!d.roles.some(r => r.id === roleId && r.active)) throw Error("Cargo inválido.");
  if (!["day", "night"].includes(input.shift)) throw Error("Turno inválido.");
  const composition = roleComposition(d, input, roleId);
  const confirmations = d.assemblyConfirmations ??= {};
  const context = assemblyContext(input);
  if (!confirmations[context]) {
    confirmations[context] = Object.fromEntries(Object.keys(input.confirmed)
      .filter(id => input.confirmed[id] && d.roles.some(r => r.id === id && r.active))
      .map(id => [id, roleComposition(d, input, id)]));
  }
  confirmations[context][roleId] = composition;
}

export function clearAssemblyConfirmations(d: Data, s: Session, input: Assembly) {
  scope(d, s, input.unitId);
  const prefix = assemblyContext(input).slice(0, -1);
  for (const context of Object.keys(d.assemblyConfirmations || {})) {
    if (context === prefix + "]" || context.startsWith(prefix + ",")) delete d.assemblyConfirmations![context];
  }
}

export function publishAssembly(d: Data, s: Session, input: Assembly) {
  scope(d, s, input.unitId);
  if (input.date !== todaySaoPaulo()) throw Error("A montagem deve usar o dia atual de São Paulo.");
  if (!["day", "night"].includes(input.shift) || (input.teamId && !d.teams.some(t => t.id === input.teamId && t.unitId === input.unitId && t.active)))
    throw Error("Equipe ou turno inválido.");
  const individual = !!input.workAssignments || (input.workRegime === "24h" && input.shift === "night");
  const legacyAssignment = individual ? undefined : workAssignment(input);
  if (legacyAssignment) validateRegime(legacyAssignment.workRegime, input.shift, legacyAssignment.startTime);
  const roles = d.roles.filter(r => r.active);
  if (!roles.length || roles.some(r => !input.confirmed[r.id])) throw Error("Confirme todos os cargos antes de publicar.");
  if (!roles.some(r => input.selections[r.id]?.length)) throw Error("Selecione pelo menos um profissional na montagem.");
  const timestamp = new Date().toISOString();
  const publicationId = crypto.randomUUID();
  const shifts = legacyAssignment?.workRegime === "24h" ? ["day", "night"] as const : [input.shift];
  const records = roles.flatMap(r => {
    const composition = roleComposition(d, input, r.id);
    return shifts.map(shift => {
      const target = { unitId: input.unitId, date: input.date, shift, teamId: input.teamId, roleId: r.id };
      const old = d.schedules.find(x => key(x) === key(target));
      const published = d.published.find(x => key(x) === key(target));
      return { ...target, id: old?.id || published?.id || crypto.randomUUID(), professionalIds: composition.professionalIds,
        ...(individual && { workAssignments: composition.workAssignments }),
        ...legacyAssignment, publicationId,
        status: "published" as const, version: Math.max(old?.version || 0, published?.version || 0) + 1, updatedAt: timestamp };
    });
  });
  // Build and audit on an isolated copy: failures never leave a partial publication.
  const next = structuredClone(d);
  for (const record of records) {
    const old = next.schedules.find(x => key(x) === key(record));
    const oldPublication = next.published.find(x => key(x) === key(record));
    if (record.workAssignments && record.shift === "day" && oldPublication?.workRegime === "24h" && oldPublication.publicationId) {
      const pairedNight = (x: Schedule) => x.shift === "night" && x.publicationId === oldPublication.publicationId
        && key({ ...x, shift: "day" }) === key(record);
      for (const previous of next.published.filter(pairedNight)) {
        event(next, s, "Escala", previous.id, "Substituir cobertura noturna", previous);
      }
      next.schedules = next.schedules.filter(x => !pairedNight(x));
      next.published = next.published.filter(x => !pairedNight(x));
    }
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
  if (first.teamId && !d.teams.some(t => t.id === first.teamId && t.unitId === first.unitId && t.active))
    throw Error("A equipe de origem está inativa ou indisponível.");
  const selections: Record<string, string[]> = {};
  const workAssignments: Record<string, WorkAssignment> = {};
  const ignored = new Set<string>();
  for (const record of records) {
    const allowed = d.roles.some(r => r.id === record.roleId && r.active) ? available(d, first.unitId, record.roleId) : [];
    const ids = record.professionalIds.filter(id => {
      if (allowed.some(p => p.id === id)) {
        workAssignments[id] = workAssignment(record.workAssignments?.[id] || record);
        return true;
      }
      ignored.add(d.professionals.find(p => p.id === id)?.fullName || id); return false;
    });
    selections[record.roleId] = [...new Set([...(selections[record.roleId] || []), ...ids])];
  }
  return { assembly: { unitId: first.unitId, date: todaySaoPaulo(), shift: first.workRegime === "24h" ? "day" : first.shift, teamId: first.teamId, workRegime: first.workRegime || "12x36", startTime: first.startTime, selections, workAssignments, confirmed: {} } as Assembly, ignored: [...ignored] };
}

export function publicationPeople(records: Schedule[]) {
  const people = new Map<string, { id: string; roleId: string; assignment: WorkAssignment }>();
  for (const record of records) {
    for (const id of record.professionalIds) {
      if (!people.has(id)) people.set(id, { id, roleId: record.roleId, assignment: workAssignment(record.workAssignments?.[id] || record) });
    }
  }
  return [...people.values()];
}

type PartialCopyEntry = { id: string; roleId?: string; assignment?: WorkAssignment; issue?: string; duplicate?: boolean };

export function previewPartialCopy(d: Data, s: Session, source: Schedule[], target: Assembly, selected: Record<string, WorkAssignment>) {
  scope(d, s, target.unitId);
  if (target.teamId && !d.teams.some(t => t.id === target.teamId && t.unitId === target.unitId && t.active))
    throw Error("Equipe de destino inválida.");
  if (!source.length) throw Error("Publicação vazia.");
  for (const record of source) scope(d, { ...s, activeUnitId: record.unitId }, record.unitId);
  const parsed = new Date(target.date + "T00:00:00Z");
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== target.date || target.date < todaySaoPaulo()
    || !["day", "night"].includes(target.shift)) throw Error("Escolha a data atual ou futura e um turno válido.");
  const draft = resumeAssembly(d, s, target);
  const matching = (record: Schedule) => record.unitId === target.unitId && record.date === target.date
    && record.shift === target.shift && (record.teamId || undefined) === (target.teamId || undefined);
  const context = assemblyContext(target);
  const existing = { ...d.assemblyConfirmations?.[context] };
  const records = [...d.published.filter(matching), ...d.schedules.filter(matching)];
  for (const record of records) {
    if (Object.hasOwn(draft.selections, record.roleId)) continue;
    existing[record.roleId] = { professionalIds: record.professionalIds,
      workAssignments: Object.fromEntries(publicationPeople([record]).map(p => [p.id, p.assignment])), confirmed: false };
  }
  for (const [roleId, ids] of Object.entries(draft.selections)) {
    if (!Object.hasOwn(existing, roleId)) existing[roleId] = { professionalIds: ids,
      workAssignments: Object.fromEntries(ids.map(id => [id, draft.workAssignments![id]])), confirmed: draft.confirmed[roleId] };
  }
  for (const [roleId, composition] of Object.entries(existing)) {
    draft.selections[roleId] = Array.isArray(composition) ? composition : composition.professionalIds;
  }
  const present = new Set(Object.values(draft.selections).flat());
  const sourcePeople = new Map(publicationPeople(source).map(p => [p.id, p]));
  const eligible = new Map(available(d, target.unitId).map(p => [p.id, p]));
  return {
    existing,
    entries: Object.entries(selected).map(([id, assignment]): PartialCopyEntry => {
      const person = sourcePeople.get(id);
      const professional = eligible.get(id);
      if (!person || !professional || professional.roleId !== person.roleId || !d.roles.some(r => r.id === person.roleId && r.active))
        return { id, issue: "Sem vínculo elegível para este cargo na unidade de destino." };
      if (present.has(id)) return { ...person, duplicate: true };
      try { validateRegime(assignment.workRegime, target.shift, assignment.startTime); }
      catch (error) { return { ...person, issue: (error as Error).message }; }
      return { ...person, assignment };
    }),
  };
}

export function savePartialCopy(d: Data, s: Session, source: Schedule[], target: Assembly, selected: Record<string, WorkAssignment>) {
  const { existing, entries } = previewPartialCopy(d, s, source, target, selected);
  if (entries.some(p => p.issue)) throw Error("Revise as incompatibilidades da cópia.");
  const additions = entries.filter(p => !p.duplicate);
  if (!additions.length) throw Error("Selecione ao menos um profissional que ainda não esteja no destino.");
  const next = structuredClone(existing);
  for (const entry of additions) {
    if (!entry.roleId || !entry.assignment) continue;
    const previous = next[entry.roleId];
    next[entry.roleId] = {
      professionalIds: [...(Array.isArray(previous) ? previous : previous?.professionalIds || []), entry.id],
      workAssignments: { ...(Array.isArray(previous) ? {} : previous?.workAssignments), [entry.id]: entry.assignment },
      confirmed: false,
    };
  }
  (d.assemblyConfirmations ??= {})[assemblyContext(target)] = next;
  event(d, s, "Escala", assemblyContext(target), "Copiar selecionados", undefined, {
    unitId: target.unitId, date: target.date, shift: target.shift, sourceDate: source[0].date,
    sourcePublicationId: source[0].publicationId, professionalIds: additions.map(p => p.id),
  });
}
