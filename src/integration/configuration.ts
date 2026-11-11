import type { Data, Session, Shift } from '../models';
import { event, scope } from '../domain';
import { defaultRules, type PunchRules } from '../services/pontoFacialService';
export interface IntegrationConfig {
  unitId: string;
  enabled: boolean;
  provider: 'Biofinger';
  manufacturer: 'Hikvision';
  externalUnitId: string;
  equipmentIds: string[];
  documentedServiceUrl: string;
  credentialReference: string;
  pollSeconds: number;
  rules: Record<Shift, PunchRules>;
}
export const integrationStatus = 'Aguardando configuração da integração';
export const newConfig = (unitId: string): IntegrationConfig => ({
  unitId, enabled: false, provider: 'Biofinger', manufacturer: 'Hikvision', externalUnitId: '',
  equipmentIds: [], documentedServiceUrl: '', credentialReference: '', pollSeconds: 30,
  rules: { day: { ...defaultRules }, night: { ...defaultRules } },
});
export function readConfig(d: Data, s: Session): IntegrationConfig {
  scope(d, s);
  return structuredClone(d.integrationConfigs?.find(x => x.unitId === s.activeUnitId) || newConfig(s.activeUnitId));
}
export function validateConfig(c: IntegrationConfig) {
  if (c.provider !== 'Biofinger' || c.manufacturer !== 'Hikvision' || typeof c.enabled !== 'boolean') throw Error('Provedor ou fabricante inválido.');
  // Opaque non-national identifiers. Never accept credential values in these fields.
  const safeId = (id: string) => /^[A-Za-z0-9._:-]{1,80}$/.test(id) && !/^\d{11}$|^\d{15}$/.test(id);
  if (c.externalUnitId && !safeId(c.externalUnitId)) throw Error('Identificador externo inválido; não utilize documentos pessoais.');
  if (c.equipmentIds.some(id => !safeId(id)) || new Set(c.equipmentIds).size !== c.equipmentIds.length) throw Error('Equipamentos inválidos ou duplicados.');
  if (c.documentedServiceUrl) {
    const url = new URL(c.documentedServiceUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('Utilize apenas uma URL HTTPS documentada, sem credenciais ou parâmetros.');
  }
  if (c.credentialReference && !/^server:[a-z][a-z0-9-]{0,50}$/.test(c.credentialReference)) throw Error('Informe somente um alias como server:biofinger-unidade. Nunca informe o segredo.');
  if (!Number.isInteger(c.pollSeconds) || c.pollSeconds < 30 || c.pollSeconds > 3600) throw Error('Intervalo permitido: 30 a 3600 segundos.');
  for (const shift of ['day', 'night'] as const) {
    const r = c.rules[shift];
    if (!r || !Number.isInteger(r.earlyMinutes) || r.earlyMinutes < 0 || r.earlyMinutes > 720 || !Number.isInteger(r.lateMinutes) || r.lateMinutes <= 0 || r.lateMinutes > 720 || r.dayHour !== 7 || r.nightHour !== 19)
      throw Error('Janela inválida. Preserve as viradas de 07h e 19h; tolerância de 0–720 e confirmação de 1–720 minutos.');
  }
}
export function saveConfig(d: Data, s: Session, input: IntegrationConfig) {
  scope(d, s, input.unitId); validateConfig(input);
  // Allowlist only: drops any injected secret, status, or fabricated sync timestamp.
  const c: IntegrationConfig = {
    unitId: input.unitId, enabled: input.enabled, provider: 'Biofinger', manufacturer: 'Hikvision',
    externalUnitId: input.externalUnitId, equipmentIds: [...input.equipmentIds],
    documentedServiceUrl: input.documentedServiceUrl, credentialReference: input.credentialReference,
    pollSeconds: input.pollSeconds, rules: { day: { earlyMinutes: input.rules.day.earlyMinutes, lateMinutes: input.rules.day.lateMinutes, dayHour: 7, nightHour: 19 }, night: { earlyMinutes: input.rules.night.earlyMinutes, lateMinutes: input.rules.night.lateMinutes, dayHour: 7, nightHour: 19 } },
  };
  const before = d.integrationConfigs?.find(x => x.unitId === c.unitId);
  d.integrationConfigs = [...(d.integrationConfigs || []).filter(x => x.unitId !== c.unitId), c];
  event(d, s, 'Integração Ponto Facial', c.unitId, 'Configurar', before, c);
}
