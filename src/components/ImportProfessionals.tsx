import { useMemo, useState } from 'react';
import type { Data, Session } from '../models';
import { commitImport, fictionalImport, parseImport, previewImport, type ImportDecision, type ImportRow } from '../imports/professionalImport';
interface Props { d: Data; s: Session; change: (f: (d: Data) => void, message?: string) => boolean }
export function ImportProfessionals({ d, s, change }: Props) {
  const [text, setText] = useState(fictionalImport);
  const [source, setSource] = useState<{ rows: ImportRow[]; ignored: number } | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ImportDecision>>({});
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState('');
  const preview = useMemo(() => source ? previewImport(d, s, source) : null, [d, s, source]);
  const counts = { created: 0, linked: 0, ignored: preview?.ignored || 0, review: 0 };
  for (const row of preview?.rows || []) {
    const decision = decisions[row.rowId];
    if (decision?.action === 'create') counts.created++;
    else if (decision?.action === 'link') counts.linked++;
    else if (row.status === 'review') counts.review++;
    else counts.ignored++;
  }
  const decide = (id: string, decision: Partial<ImportDecision>) => { setDecisions(x => ({ ...x, [id]: { ...(x[id] || { action: 'skip' as const }), ...decision } })); setConfirm(false); };
  return <section className="panel integration-panel">
    <h2>Prévia de importação · CER BARRA</h2>
    <p className="callout">Somente dados fictícios nesta demonstração. Não cole nem carregue a listagem real: não há autenticação ou backend seguros. CPF, CNS e EQUIPE não são importados. A origem nunca altera equipes ou escalas.</p>
    {import.meta.env.DEV && <label className="field"><span>CSV/TSV de teste fictício (NOME, CBO e CARGO opcional)</span><textarea rows={7} value={text} onChange={e => { setText(e.target.value); setSource(null); setConfirm(false); }} /></label>}
    <button className="btn" onClick={() => { try { const parsed = parseImport(import.meta.env.DEV ? text : fictionalImport, crypto.randomUUID()); setSource(parsed); setText(fictionalImport); setDecisions({}); setConfirm(false); setError(''); setResult(''); } catch (e) { setError((e as Error).message); } }}>Preparar prévia fictícia</button>
    {error && <p role="alert" className="error">{error}</p>}
    {preview && <>
      <p>{counts.created} serão criados · {counts.linked} associados/vinculados · {counts.ignored} ignorados · {counts.review} para revisão. Linhas do CBO ignorado: {preview.ignored} (somente quantidade).</p>
      <div className="tablewrap"><table><thead><tr><th>Nome</th><th>CBO</th><th>Cargo classificado</th><th>Resultado / pendências</th><th>Decisão explícita</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.rowId}><td><b>{row.name}</b></td><td>{row.cbo}</td><td>{row.role || 'Revisar CBO'}</td><td>{row.reasons.join(' ') || 'Classificado; aguarda decisão'}</td><td>
        <label className="field"><span>Ação para {row.name}</span><select value={decisions[row.rowId]?.action === 'link' ? decisions[row.rowId]?.professionalId : decisions[row.rowId]?.action || 'skip'} onChange={e => decide(row.rowId, ['skip', 'create'].includes(e.target.value) ? { action: e.target.value as 'skip' | 'create', professionalId: undefined } : { action: 'link', professionalId: e.target.value })}>
          <option value="skip">Deixar pendente / ignorar</option>
          {row.role && !row.restrictedMatch && !row.malformed && !d.importedRows?.includes(row.rowId) && <option value="create">Criar pessoa distinta</option>}
          {row.candidates.map(id => <option key={id} value={id}>Associar após verificar identidade: {d.professionals.find(p => p.id === id)?.fullName} · {id}</option>)}
        </select></label>
        {(row.status === 'review' || decisions[row.rowId]?.action === 'link') && <label><input type="checkbox" checked={decisions[row.rowId]?.reviewed || false} onChange={e => decide(row.rowId, { reviewed: e.target.checked })} />Revisei individualmente a identidade e as pendências; não associei apenas pelo nome</label>}
      </td></tr>)}</tbody></table></div>
      {!confirm ? <button className="btn primary" disabled={!counts.created && !counts.linked} onClick={() => setConfirm(true)}>Revisar gravação explícita</button> : <div className="callout"><div><p>Confirmar {counts.created} criações e {counts.linked} associações/vínculos? {counts.ignored} ignorados e {counts.review} pendentes. Nenhum cadastro será sobrescrito.</p><button className="btn" onClick={() => setConfirm(false)}>Voltar</button><button className="btn primary" onClick={() => {
        let totals: ReturnType<typeof commitImport> | undefined;
        if (source && change(x => { totals = commitImport(x, s, source, decisions); }, 'Importação fictícia concluída. Escalas e equipes preservadas.')) {
          setResult(`${totals!.created} criados; ${totals!.linked} associados/vinculados; ${totals!.ignored} ignorados; ${totals!.review} para revisão.`); setSource(null); setDecisions({});
        } setConfirm(false);
      }}>Confirmar gravação fictícia</button></div></div>}
    </>}
    {result && <p role="status">{result}</p>}
  </section>;
}
