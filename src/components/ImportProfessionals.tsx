import { useMemo, useState } from 'react';
import type { Data, Session } from '../models';
import { commitImport, parseImport, previewImport, type ImportDecision, type ImportRow } from '../imports/professionalImport';
interface Props { d: Data; s: Session; change: (f: (d: Data) => void, message?: string) => boolean }
export function ImportProfessionals({ d, s, change }: Props) {
  const [text, setText] = useState('');
  const [verifiedUnit, setVerifiedUnit] = useState(false);
  const localImport = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
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
    <h2>Prévia de importação · {d.units.find(u => u.id === s.activeUnitId)?.name}</h2>
    <p className="callout">Use uma aba por unidade. Exporte a aba do Excel como CSV UTF-8 ou cole os campos NOME e CARGO. CPF, CNS e equipe ficam fora da importação. O login local é fictício. Use dados reais somente em ambiente restrito.</p>
    <label className="field"><span>CSV ou TSV da unidade ativa</span><textarea rows={5} value={text} onChange={e => { setText(e.target.value); setSource(null); setConfirm(false); setVerifiedUnit(false); }} /></label>
    <label className="checklabel"><input type="checkbox" checked={verifiedUnit} onChange={e => { setVerifiedUnit(e.target.checked); setSource(null); setConfirm(false); }} /> Conferi que a listagem pertence à unidade ativa.</label>
    <button className="btn" disabled={!verifiedUnit || !text.trim()} onClick={async () => { try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()));
      const fileId = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      setSource(parseImport(text.trim(), s.activeUnitId + ':' + fileId, 'cargo')); setDecisions({}); setConfirm(false); setError(''); setResult('');
    } catch (e) { setError((e as Error).message); } }}>Preparar prévia local</button>
    {error && <p role="alert" className="error">{error}</p>}
    {preview && <>
      <p>{counts.created} serão criados · {counts.linked} associados/vinculados · {counts.ignored} ignorados · {counts.review} para revisão.</p>
      <div className="tablewrap"><table><thead><tr><th>Nome</th><th>Cargo de origem</th><th>Cargo classificado</th><th>Resultado / pendências</th><th>Decisão explícita</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.rowId}><td><b>{row.name}</b></td><td>{row.declaredRole}</td><td>{row.role || 'Revisar cargo'}</td><td>{row.reasons.join(' ') || 'Classificado; aguarda decisão'}</td><td>
        <label className="field"><span>Ação para {row.name}</span><select value={decisions[row.rowId]?.action === 'link' ? decisions[row.rowId]?.professionalId : decisions[row.rowId]?.action || 'skip'} onChange={e => decide(row.rowId, ['skip', 'create'].includes(e.target.value) ? { action: e.target.value as 'skip' | 'create', professionalId: undefined } : { action: 'link', professionalId: e.target.value })}>
          <option value="skip">Deixar pendente / ignorar</option>
          {row.role && !row.restrictedMatch && !row.malformed && !d.importedRows?.includes(row.rowId) && <option value="create">Criar pessoa distinta</option>}
          {row.candidates.map(id => <option key={id} value={id}>Associar após verificar identidade: {d.professionals.find(p => p.id === id)?.fullName} · {id}</option>)}
        </select></label>
        {(row.status === 'review' || decisions[row.rowId]?.action === 'link') && <label><input type="checkbox" checked={decisions[row.rowId]?.reviewed || false} onChange={e => decide(row.rowId, { reviewed: e.target.checked })} />Revisei individualmente a identidade e as pendências; não associei apenas pelo nome</label>}
      </td></tr>)}</tbody></table></div>
      {!localImport ? <p>A gravação pela importação está disponível apenas na instalação local.</p> : !confirm ? <button className="btn primary" disabled={!counts.created && !counts.linked} onClick={() => setConfirm(true)}>Revisar gravação explícita</button> : <div className="callout"><div><p>Confirmar {counts.created} criações e {counts.linked} associações/vínculos? {counts.ignored} ignorados e {counts.review} pendentes. Nenhum cadastro será sobrescrito.</p><button className="btn" onClick={() => setConfirm(false)}>Voltar</button><button className="btn primary" onClick={() => {
        let totals: ReturnType<typeof commitImport> | undefined;
        if (source && verifiedUnit && change(x => { totals = commitImport(x, s, source, decisions); }, 'Importação local concluída. Escalas e equipes preservadas.')) {
          setResult(`${totals!.created} criados; ${totals!.linked} associados/vinculados; ${totals!.ignored} ignorados; ${totals!.review} para revisão.`); setSource(null); setDecisions({});
        } setConfirm(false);
      }}>Confirmar gravação local</button></div></div>}
    </>}
    {result && <p role="status">{result}</p>}
  </section>;
}
