import type { Data, Session } from '../models';
import { event, scope } from '../domain';
import { classifyCbo, ensureRoleCatalog, normalizedName } from './cbo';
export interface ImportRow { rowId: string; line: number; name: string; cbo: string; declaredRole: string; malformed?: boolean }
export interface PreviewRow extends ImportRow { role?: string; status: 'ready' | 'review'; reasons: string[]; candidates: string[]; restrictedMatch: boolean }
export interface ImportPreview { rows: PreviewRow[]; ignored: number }
export type ImportDecision = { action: 'create' | 'link' | 'skip'; professionalId?: string; reviewed?: boolean };
// Small RFC4180-style reader supporting separators, quoted fields and escaped quotes.
// Unselected columns are discarded immediately; no source text is returned or persisted.
export function parseImport(text: string, batchId: string, mode: 'cbo' | 'cargo' = 'cbo'): { rows: ImportRow[]; ignored: number } {
  if (text.length > 1_000_000) throw Error('Arquivo muito grande para a prévia local.');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const table: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if ((c === delimiter || c === '\n' || c === undefined) && !quoted) {
      row.push(value.replace(/\r$/, '')); value = '';
      if (c !== delimiter) { if (row.some(x => x.trim())) table.push(row); row = []; }
    } else if (c !== undefined) value += c;
  }
  if (quoted) throw Error('Há aspas não fechadas. Revise o arquivo.');
  const headers = (table.shift() || []).map(x => normalizedName(x.replace(/^\uFEFF/, '')));
  const required = mode === 'cargo' ? 'cargo' : 'cbo';
  if (headers.filter(x => x === 'nome').length !== 1 || headers.filter(x => x === required).length !== 1)
    throw Error(`Informe exatamente uma coluna NOME e uma ${required.toUpperCase()}.`);
  const nameIndex = headers.indexOf('nome'), cboIndex = headers.indexOf('cbo'), roleIndex = headers.indexOf('cargo');
  let ignored = 0;
  const rows = table.flatMap((cells, i) => {
    const cbo = mode === 'cargo' ? '' : (cells[cboIndex] || '').trim();
    if (classifyCbo(cbo).status === 'ignored') { ignored++; return []; }
    return [{ rowId: `${batchId}:${i + 2}`, line: i + 2, name: (cells[nameIndex] || '').trim(), cbo,
      declaredRole: roleIndex >= 0 ? (cells[roleIndex] || '').trim() : '', malformed: cells.length !== headers.length }];
  });
  return { rows, ignored };
}
export function previewImport(d: Data, s: Session, source: { rows: ImportRow[]; ignored: number }): ImportPreview {
  const user = scope(d, s);
  const visible = d.professionals.filter(p => d.links.some(l => l.professionalId === p.id && (user.role === 'global_admin' || l.unitId === s.activeUnitId)));
  const rows = source.rows.map(row => {
    const role = row.cbo ? classifyCbo(row.cbo).role
      : d.roles.find(r => r.active && normalizedName(r.name) === normalizedName(row.declaredRole))?.name;
    const reasons: string[] = [];
    if (!role) reasons.push(row.cbo ? 'CBO desconhecido; revisar classificação.' : 'Cargo ausente ou sem correspondência no catálogo ativo.');
    if (row.name.length < 3 || !row.name.includes(' ')) reasons.push('Nome completo incompleto.');
    if (row.malformed) reasons.push('Quantidade de colunas incompatível.');
    if (row.cbo && row.declaredRole && role && normalizedName(row.declaredRole) !== normalizedName(role)) reasons.push('CARGO de origem difere do mapeamento CBO.');
    if (source.rows.filter(x => normalizedName(x.name) === normalizedName(row.name)).length > 1) reasons.push('Nome repetido no arquivo; não mesclar por nome.');
    const candidates = visible.filter(p => normalizedName(p.fullName) === normalizedName(row.name)).map(p => p.id);
    const restrictedMatch = d.professionals.some(p => normalizedName(p.fullName) === normalizedName(row.name) && !visible.some(v => v.id === p.id));
    if (restrictedMatch) reasons.push('Possível correspondência fora da unidade; encaminhe para revisão pelo administrador geral.');
    if (candidates.length) reasons.push('Possível correspondência: confirme a identidade antes de associar ou criar uma pessoa distinta.');
    if (d.importedRows?.includes(row.rowId)) reasons.push('Linha deste lote já processada.');
    return { ...row, role, candidates, restrictedMatch, reasons, status: reasons.length ? 'review' as const : 'ready' as const };
  });
  return { rows, ignored: source.ignored };
}
export function commitImport(d: Data, s: Session, source: { rows: ImportRow[]; ignored: number }, decisions: Record<string, ImportDecision>) {
  const preview = previewImport(d, s, source); const next = structuredClone(d); ensureRoleCatalog(next);
  const totals = { created: 0, linked: 0, ignored: preview.ignored, review: 0 };
  const targets = new Set<string>();
  for (const row of preview.rows) {
    const choice = decisions[row.rowId];
    if (!choice || choice.action === 'skip') { if (row.status === 'review') totals.review++; else totals.ignored++; continue; }
    if (!row.role || row.malformed || row.name.length < 3 || !row.name.includes(' ') || next.importedRows?.includes(row.rowId)) throw Error('Corrija ou deixe a linha pendente; nada foi gravado.');
    if (row.restrictedMatch) throw Error('Correspondência fora da unidade: solicite revisão do administrador geral.');
    if (row.status === 'review' && !choice.reviewed) throw Error('Confirme a revisão individual; não associamos pessoas apenas pelo nome.');
    const role = next.roles.find(r => normalizedName(r.name) === normalizedName(row.role!))!;
    if (!role.active) throw Error('Cargo inativo; revise a classificação.');
    let professionalId: string;
    if (choice.action === 'link') {
      const p = next.professionals.find(p => p.id === choice.professionalId);
      if (!choice.reviewed || !p || !row.candidates.includes(p.id) || p.roleId !== role.id || !p.active || targets.has(p.id)) throw Error('Associação inválida ou duplicada. Nenhum cadastro será substituído.');
      professionalId = p.id;
      if (!next.links.some(l => l.professionalId === p.id && l.unitId === s.activeUnitId)) next.links.push({ professionalId: p.id, unitId: s.activeUnitId, active: true });
      else if (!next.links.some(l => l.professionalId === p.id && l.unitId === s.activeUnitId && l.active)) throw Error('Vínculo inativo: reative pelo cadastro após revisão.');
      targets.add(p.id); totals.linked++;
    } else if (choice.action === 'create') {
      professionalId = crypto.randomUUID();
      next.professionals.push({ id: professionalId, fullName: row.name, roleId: role.id, active: true });
      next.links.push({ professionalId, unitId: s.activeUnitId, active: true }); totals.created++;
    } else throw Error('Decisão de importação inválida.');
    next.importedRows = [...(next.importedRows || []), row.rowId];
    event(next, s, 'Importação', professionalId, choice.action === 'create' ? 'Criar profissional' : 'Vincular profissional', undefined, { professionalId, roleId: role.id });
  }
  Object.assign(d, next); return totals;
}
export const fictionalImport = 'NOME;CBO;CARGO;EQUIPE\nPessoa Fictícia Aurora;223505;Enfermeiro;A\nPessoa Fictícia Bento;225124;Pediatra;B\nPessoa Fictícia Revisão;000123;Cargo a revisar;\nPessoa Fictícia Ignorada;221105;;';
