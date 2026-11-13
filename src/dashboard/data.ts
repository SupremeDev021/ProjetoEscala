import { publishedWorkWindows, scheduleWindow } from "../services/workRegimes";
import { ensureRoleCatalog } from "../imports/cbo";
import type { Data, Shift } from "../models";
import { initialData } from "../initialData";
import { STORAGE_KEY } from "../domain";
export const ZONE = "America/Sao_Paulo";
export function saoPauloClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  const shift: Shift = hour >= 7 && hour < 19 ? "day" : "night";
  const previous = new Date(date + "T12:00:00Z");
  previous.setUTCDate(previous.getUTCDate() - 1);
  return {
    date,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
    shift,
    referenceDate: hour < 7 ? previous.toISOString().slice(0, 10) : date,
  };
}
export const unitSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function projectDashboard(
  data: Data,
  unitId: string,
  date: string,
  shift: Shift,
  now?: number,
) {
  const rows = data.published.filter(
    (s) =>
      s.status === "published" &&
      s.unitId === unitId &&
      s.date === date &&
      s.shift === shift &&
      (s.workRegime !== "diarist" || now === undefined || (now >= scheduleWindow(s).start && now < scheduleWindow(s).end)),
  );
  const groups = data.roles
    .filter((r) => r.active || rows.some((s) => s.roleId === r.id))
    .map((role) => {
      const schedules = rows.filter((s) => s.roleId === role.id);
      const ids = [...new Set(schedules.flatMap((s) => s.professionalIds))];
      const professionals = data.professionals
        .filter(
          (p) =>
            ids.includes(p.id) &&
            p.roleId === role.id &&
            data.links.some(
              (l) => l.professionalId === p.id && l.unitId === unitId,
            ),
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
      return {
        role,
        professionals,
        state: !schedules.length
          ? ("missing" as const)
          : professionals.length
            ? ("published" as const)
            : ("empty" as const),
      };
    });
  const count = (match: (name: string) => boolean) =>
    groups
      .filter((g) => match(g.role.name.toLowerCase()))
      .reduce((n, g) => n + g.professionals.length, 0);
  return {
    groups,
    total: new Set(groups.flatMap((g) => g.professionals.map((p) => p.id)))
      .size,
    functions: groups.filter((g) => g.professionals.length).length,
    doctors: count((n) => n.includes("médic")),
    nursing: count((n) => n.includes("enferm")),
    state: !rows.length
      ? "missing"
      : groups.some((g) => g.professionals.length)
        ? "published"
        : "empty",
    updatedAt: rows
      .map((s) => s.updatedAt)
      .sort()
      .at(-1),
  };
}
export const dashboardRepository = {
  async load(): Promise<Data> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ensureRoleCatalog(initialData());
    const data = JSON.parse(raw) as Data;
    if (!Array.isArray(data.published) || !Array.isArray(data.roles) ||
        !Array.isArray(data.links) || !Array.isArray(data.professionals) || !Array.isArray(data.units))
      throw Error("Dados locais indisponíveis.");
    return ensureRoleCatalog({ ...data, published: publishedWorkWindows(data.published) });
  },
};
