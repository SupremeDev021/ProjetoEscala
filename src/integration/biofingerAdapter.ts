import type { PunchRecord, ShiftContext } from '../services/pontoFacialService';
// Application-side contract, NOT a statement of the vendor's wire format or capabilities.
export interface ExternalPunch {
  externalProfessionalId: string;
  externalUnitId: string;
  equipmentId: string;
  occurredAt: string;
  kind: 'entry' | 'exit';
  validation: PunchRecord['validation'];
  received: boolean;
  shiftId: string;
}
export interface AdapterResult { records: ExternalPunch[]; completedAt: string }
export interface BiofingerAdapter {
  readonly source: 'server-validated' | 'simulation';
  query(context: ShiftContext): Promise<AdapterResult>;
}
// Intentionally no fetch, credentials, endpoint, or device implementation in the frontend.
