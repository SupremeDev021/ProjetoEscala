import type { Data, Session } from '../models';
import { event, scope } from '../domain';
export interface ProfessionalMapping { unitId: string; professionalId: string; externalProfessionalId: string }
export function readMappings(d: Data, s: Session) {
  scope(d, s); return (d.professionalMappings || []).filter(m => m.unitId === s.activeUnitId);
}
export function saveMapping(d: Data, s: Session, m: ProfessionalMapping) {
  scope(d, s, m.unitId);
  if (!d.professionals.some(p => p.id === m.professionalId) || !d.links.some(l => l.professionalId === m.professionalId && l.unitId === m.unitId && l.active)) throw Error('Profissional sem vínculo ativo com a unidade.');
  if (!/^[A-Za-z0-9._:-]{1,80}$/.test(m.externalProfessionalId) || /^\d{11}$|^\d{15}$/.test(m.externalProfessionalId)) throw Error('Use o identificador externo, nunca CPF ou CNS.');
  const mappings = d.professionalMappings || [];
  if (mappings.some(x => x.unitId === m.unitId && x.externalProfessionalId === m.externalProfessionalId && x.professionalId !== m.professionalId)) throw Error('Identificador externo já relacionado nesta unidade.');
  const before = mappings.find(x => x.unitId === m.unitId && x.professionalId === m.professionalId);
  const clean = { unitId: m.unitId, professionalId: m.professionalId, externalProfessionalId: m.externalProfessionalId };
  d.professionalMappings = [...mappings.filter(x => x.unitId !== m.unitId || x.professionalId !== m.professionalId), clean];
  event(d, s, 'Mapeamento Biofinger', m.professionalId, 'Relacionar identificadores', before, clean);
}
export function removeMapping(d: Data, s: Session, professionalId: string) {
  scope(d, s);
  const before = readMappings(d, s).find(m => m.professionalId === professionalId);
  d.professionalMappings = (d.professionalMappings || []).filter(m => m.unitId !== s.activeUnitId || m.professionalId !== professionalId);
  event(d, s, 'Mapeamento Biofinger', professionalId, 'Remover relação', before);
}
