import type { Data } from "./models";
import hashes from "./legacyDemoHashes.json";

export async function previewLegacyCleanup(data: Data) {
  const cleaned = structuredClone(data);
  const counts: Record<string, number> = {};
  const encoder = new TextEncoder();
  async function filter<T>(rows: T[], key: keyof typeof hashes, preserve = (_row: T) => false) {
    const known = new Set(hashes[key]);
    const matches = await Promise.all(rows.map(async row => {
      if (preserve(row)) return false;
      const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(row)));
      return known.has(Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join(""));
    }));
    counts[key] = matches.filter(Boolean).length;
    return rows.filter((_, index) => !matches[index]);
  }
  cleaned.schedules = await filter(data.schedules, "schedules");
  cleaned.published = await filter(data.published, "published");
  cleaned.events = await filter(data.events, "events");
  const retainedSchedules = [...cleaned.schedules, ...cleaned.published];
  const eventText = JSON.stringify(cleaned.events);
  cleaned.teams = await filter(data.teams, "teams", team =>
    retainedSchedules.some(s => s.teamId === team.id) || eventText.includes(JSON.stringify(team.id))
    || Object.keys(data.assemblyConfirmations || {}).some(key => key.includes(JSON.stringify(team.id))));
  const removedTeams = new Set(data.teams.filter(t => !cleaned.teams.some(x => x.id === t.id)).map(t => t.id));
  // A team with an edited or newly added member is retained with its original links.
  const remainingMembers = await filter(data.members, "members", member => !removedTeams.has(member.teamId));
  const keepTeams = new Set(remainingMembers.map(m => m.teamId));
  cleaned.teams = data.teams.filter(t => !removedTeams.has(t.id) || keepTeams.has(t.id));
  cleaned.members = await filter(data.members, "members", member => cleaned.teams.some(t => t.id === member.teamId));
  counts.teams = data.teams.length - cleaned.teams.length;
  const protectedIds = new Set([...retainedSchedules.flatMap(s => s.professionalIds),
    ...cleaned.members.map(m => m.professionalId), ...(data.professionalMappings || []).map(m => m.professionalId)]);
  const otherRefs = eventText + JSON.stringify(data.assemblyConfirmations || {});
  const candidateLinks = await filter(data.links, "links");
  candidateLinks.forEach(link => protectedIds.add(link.professionalId));
  cleaned.professionals = await filter(data.professionals, "professionals", p =>
    protectedIds.has(p.id) || otherRefs.includes(JSON.stringify(p.id)));
  const keptPeople = new Set(cleaned.professionals.map(p => p.id));
  cleaned.links = await filter(data.links, "links", link => keptPeople.has(link.professionalId));
  return { cleaned, counts };
}
