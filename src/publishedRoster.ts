import type { Data } from "./models";
import { ensureRoleCatalog, normalizedName } from "./imports/cbo";
import roster from "./publishedRoster.json";

export function withPublishedRoster(data: Data): Data {
  ensureRoleCatalog(data);
  const people = new Map(data.professionals.map(p => [p.id, p]));
  const occupied = new Set(data.links.flatMap(link => {
    const person = people.get(link.professionalId);
    return person ? [JSON.stringify([link.unitId, normalizedName(person.fullName)])] : [];
  }));
  for (const [id, fullName, roleId, unitId] of roster) {
    const key = JSON.stringify([unitId, normalizedName(fullName)]);
    if (people.has(id) || occupied.has(key) || !data.units.some(u => u.id === unitId) ||
        !data.roles.some(r => r.id === roleId)) continue;
    const person = { id, fullName, roleId, active: true };
    data.professionals.push(person);
    data.links.push({ professionalId: id, unitId, active: true });
    people.set(id, person);
    occupied.add(key);
  }
  return data;
}
