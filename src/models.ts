import type { IntegrationConfig } from "./integration/configuration";
import type { ProfessionalMapping } from "./integration/mappings";
export type WorkRegime = "12x36" | "24h" | "diarist";
export interface WorkAssignment {
  workRegime: WorkRegime;
  startTime?: string;
}
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
  workAssignment?: WorkAssignment;
}
export interface Schedule {
  id: string;
  unitId: string;
  date: string;
  shift: Shift;
  teamId?: string;
  roleId: string;
  professionalIds: string[];
  workAssignments?: Record<string, WorkAssignment>;
  coverageOrigin?: { date: string; shift: Shift };
  workRegime?: WorkRegime;
  startTime?: string;
  publicationId?: string;
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
  integrationConfigs?: IntegrationConfig[];
  professionalMappings?: ProfessionalMapping[];
  importedRows?: string[];
  assemblyConfirmations?: Record<string, Record<string, string[] | {
    professionalIds: string[];
    workAssignments: Record<string, WorkAssignment>;
    confirmed?: boolean;
  }>>;
}
export interface Session {
  userId: string;
  activeUnitId: string;
}
