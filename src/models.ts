export type Shift = "day" | "night";
export interface Unit {
  id: string;
  name: string;
  active: boolean;
}
export interface UserAccess {
  id: string;
  email: string;
  displayName: string;
  role: "global_admin" | "unit_manager";
  unitIds: string[];
  active: boolean;
}
export interface Role {
  id: string;
  name: string;
  active: boolean;
}
export interface Professional {
  id: string;
  fullName: string;
  roleId: string;
  specialty?: string;
  active: boolean;
}
export interface ProfessionalUnit {
  professionalId: string;
  unitId: string;
  active: boolean;
}
export interface Team {
  id: string;
  unitId: string;
  name: string;
  shift?: Shift;
  active: boolean;
}
export interface TeamMember {
  teamId: string;
  professionalId: string;
  roleId: string;
}
export interface Schedule {
  id: string;
  unitId: string;
  date: string;
  shift: Shift;
  teamId: string;
  roleId: string;
  professionalIds: string[];
  status: "draft" | "published";
  version: number;
  updatedAt: string;
}
export interface AuditEvent {
  id: string;
  actor: string;
  unitId: string;
  entity: string;
  entityId: string;
  action: string;
  timestamp: string;
  before?: unknown;
  after?: unknown;
}
export interface Data {
  units: Unit[];
  users: UserAccess[];
  roles: Role[];
  professionals: Professional[];
  links: ProfessionalUnit[];
  teams: Team[];
  members: TeamMember[];
  schedules: Schedule[];
  published: Schedule[];
  events: AuditEvent[];
}
export interface Session {
  userId: string;
  activeUnitId: string;
}
