import type { IntegrationConfig } from './configuration';
import type { ProfessionalMapping } from './mappings';
import type { BiofingerAdapter, ExternalPunch } from './biofingerAdapter';
import type { PontoFacialService, PunchRecord, ShiftContext } from '../services/pontoFacialService';
export function normalizeRecords(records: ExternalPunch[], config: IntegrationConfig, mappings: ProfessionalMapping[], c: ShiftContext): PunchRecord[] {
  if (c.unitId !== config.unitId) return [];
  return records.flatMap(r => {
    const matches = mappings.filter(m => m.unitId === c.unitId && m.externalProfessionalId === r.externalProfessionalId);
    if (matches.length !== 1 || mappings.filter(m => m.unitId === c.unitId && m.professionalId === matches[0].professionalId).length !== 1 ||
      r.externalUnitId !== config.externalUnitId || !config.equipmentIds.includes(r.equipmentId) || !c.professionalIds.includes(matches[0].professionalId)) return [];
    return [{ professionalId: matches[0].professionalId, unitId: c.unitId, timestamp: r.occurredAt, type: r.kind,
      equipmentId: r.equipmentId, validation: r.validation, received: r.received, shiftId: r.shiftId }];
  });
}
export class BiofingerQueryService implements PontoFacialService {
  lastSynchronization: string | null = null;
  lastSimulation: string | null = null;
  constructor(private adapter: BiofingerAdapter | null, private config: IntegrationConfig, private mappings: ProfessionalMapping[]) {}
  async load(c: ShiftContext): Promise<PunchRecord[]> {
    if (this.config.enabled !== true || !this.adapter || c.unitId !== this.config.unitId) return [];
    const result = await this.adapter.query(c);
    const completed = Date.parse(result.completedAt);
    if (!Number.isFinite(completed) || completed > Date.now()) throw Error('Consulta sem confirmação temporal válida.');
    const normalized = normalizeRecords(result.records, this.config, this.mappings, c);
    if (this.adapter.source === 'simulation') this.lastSimulation = result.completedAt;
    else if (this.adapter.source === 'server-validated') this.lastSynchronization = result.completedAt;
    else throw Error('Fonte de consulta não validada.');
    return normalized;
  }
}
