import type { Data, Session, UserAccess } from "../models";

export const defaultLocalEmail = "admin@exemplo.com";
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const authorizedUnits = (data: Data, user: UserAccess) => data.units.filter(unit =>
  unit.active && (user.role === "global_admin" || user.unitIds.includes(unit.id)));

export function resolveLocalSession(data: Data, session: Session): Session | null {
  const user = data.users.find(account => account.id === session.userId && account.active);
  if (!user) return null;
  const units = authorizedUnits(data, user);
  const unit = units.find(item => item.id === session.activeUnitId) || units[0];
  return unit ? { userId: user.id, activeUnitId: unit.id } : null;
}

export function startLocalSession(data: Data, email = defaultLocalEmail): Session | null {
  const identity = normalizeEmail(email);
  if (!/^[^@\s]+@exemplo\.com$/.test(identity)) return null;
  const matches = data.users.filter(account => normalizeEmail(account.email) === identity);
  if (matches.length !== 1) return null;
  return resolveLocalSession(data, { userId: matches[0].id, activeUnitId: matches[0].unitIds[0] || "" });
}
