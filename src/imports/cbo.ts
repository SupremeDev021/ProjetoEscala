import type { Data, Role } from '../models';
// Codes are strings; no numeric coercion, no inferred grouping.
export const CBO: Readonly<Record<string, string | null>> = Object.freeze({
  '111415': 'Dirigente do Serviço Público', '131205': 'Diretor de Serviços de Saúde',
  '131210': 'Gerente de Serviços de Saúde', '142105': 'Gerente Administrativo',
  '212310': 'Técnico de Informática', '221105': null, '223208': 'Odontologia',
  '223405': 'Farmacêutica', '223505': 'Enfermeiro', '223565': 'Enfermeiro',
  '225124': 'Pediatra', '225125': 'Médico', '225150': 'Médico', '225320': 'Médico',
  '251605': 'Assistente Social', '252405': 'Supervisor de RH', '313220': 'Técnico de Informática',
  '314115': 'Técnico de Manutenção/Refrigeração', '317210': 'Técnico de Informática',
  '322205': 'Técnico de Enfermagem', '322405': 'Técnico Saúde Bucal',
  '324115': 'Técnico de Radiologia', '324120': 'Técnico de Radiologia',
  '324205': 'Técnico Laboratório', '325110': 'Técnico Laboratório', '325115': 'Assistente Farmácia',
  '410105': 'Supervisor de RH', '411010': 'Administrativo', '414105': 'Almoxarifado',
  '422105': 'Recepcionista', '513425': 'Copa', '514310': 'Técnico de Manutenção/Refrigeração',
  '514320': 'Auxiliar de Serviços Gerais', '514325': 'Técnico de Manutenção/Refrigeração',
  '515110': 'Maqueiro', '515135': 'Motorista de Ambulância', '515215': 'Técnico Laboratório',
  '516335': 'Roupeiro', '516345': 'Roupeiro', '516405': 'Roupeiro', '517415': 'Agente de Portaria',
  '715615': 'Técnico de Manutenção/Refrigeração', '725705': 'Técnico de Manutenção/Refrigeração',
  '782320': 'Motorista de Ambulância', '225133': 'Psiquiatra', '251510': 'Psicólogo',
  '223710': 'Nutricionista', '410205': 'Supervisor de Almoxarifado', '513115': 'Rouparia',
  '223605': 'Fisioterapeuta',
});
export const normalizedName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
export function classifyCbo(code: string) {
  const cbo = code.trim();
  if (!Object.hasOwn(CBO, cbo)) return { cbo, status: 'unknown' as const, role: undefined };
  return { cbo, status: CBO[cbo] === null ? 'ignored' as const : 'classified' as const, role: CBO[cbo] || undefined };
}
export function ensureRoleCatalog(d: Data): Data {
  // Additive migration only. IDs, inactive flags, people and publications are untouched.
  for (const name of new Set(Object.values(CBO).filter((x): x is string => x !== null))) {
    if (!d.roles.some(r => normalizedName(r.name) === normalizedName(name))) {
      const code = Object.keys(CBO).find(c => CBO[c] === name)!;
      let id = `cbo-${code}`;
      while (d.roles.some(r => r.id === id)) id += '-new';
      d.roles.push({ id, name, active: true } satisfies Role);
    }
  }
  return d;
}
