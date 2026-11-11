import { useState } from 'react';
import type { Data, Session } from '../models';
import { integrationStatus, readConfig, saveConfig } from '../integration/configuration';
import { readMappings, removeMapping, saveMapping } from '../integration/mappings';
interface Props { d: Data; s: Session; change: (f: (d: Data) => void, message?: string) => boolean }
export function IntegrationPage({ d, s, change }: Props) {
  const [config, setConfig] = useState(() => readConfig(d, s));
  const [equipment, setEquipment] = useState(config.equipmentIds.join(', '));
  const [professionalId, setProfessional] = useState('');
  const [externalId, setExternal] = useState('');
  const mappings = readMappings(d, s);
  const professionals = d.professionals.filter(p => d.links.some(l => l.professionalId === p.id && l.unitId === s.activeUnitId && l.active));
  const field = (name: keyof typeof config, value: unknown) => setConfig(x => ({ ...x, [name]: value }));
  return <>
    <div className="pagetitle"><div><span className="eyebrow">CONFIGURAÇÃO POR UNIDADE</span><h1>Integração Ponto Facial</h1><p>{d.units.find(u => u.id === s.activeUnitId)?.name} · Preparação Biofinger / Hikvision</p></div></div>
    <div className="callout"><div><b>{integrationStatus}</b><p>Demonstração local. Habilitar esta configuração não estabelece conexão. Não há backend ou documentação oficial disponível; nenhum equipamento é acessado pelo navegador.</p></div></div>
    <section className="panel integration-panel"><h2>Configuração da unidade</h2>
      <p>Situação: <b>{integrationStatus}</b><br />Última sincronização real: <b>Nunca realizada</b></p>
      <form onSubmit={e => { e.preventDefault(); change(x => saveConfig(x, s, { ...config, equipmentIds: equipment.split(',').map(x => x.trim()).filter(Boolean) }), 'Configuração demonstrativa salva. A integração continua aguardando backend e documentação.'); }}>
        <div className="formgrid">
          <label className="field"><span>Integração habilitada (intenção de configuração)</span><input type="checkbox" checked={config.enabled} onChange={e => field('enabled', e.target.checked)} /></label>
          <label className="field"><span>Provedor</span><input readOnly value="Biofinger" /></label>
          <label className="field"><span>Fabricante do equipamento</span><input readOnly value="Hikvision" /></label>
          <label className="field"><span>Identificador externo da unidade</span><input value={config.externalUnitId} maxLength={80} onChange={e => field('externalUnitId', e.target.value)} /></label>
          <label className="field"><span>Identificadores dos equipamentos (separados por vírgula)</span><input value={equipment} onChange={e => setEquipment(e.target.value)} /></label>
          <label className="field"><span>Endereço HTTPS do serviço, quando documentado</span><input type="url" placeholder="Deixar vazio até receber documentação oficial" value={config.documentedServiceUrl} onChange={e => field('documentedServiceUrl', e.target.value)} /></label>
          <label className="field"><span>Referência da credencial no servidor (apenas alias)</span><input aria-label="Referência da credencial no servidor (apenas alias)" placeholder="server:biofinger-unidade" value={config.credentialReference} onChange={e => field('credentialReference', e.target.value)} autoComplete="off" maxLength={58} /><small>Nunca cole senhas, tokens ou chaves. O valor da credencial não é solicitado nem exibido.</small></label>
          <label className="field"><span>Intervalo de consulta (segundos)</span><input type="number" min={30} max={3600} value={config.pollSeconds} onChange={e => field('pollSeconds', Number(e.target.value))} /></label>
          {(['day', 'night'] as const).map(shift => <fieldset key={shift} className="integration-rules"><legend>{shift === 'day' ? 'Diurno · 07h–19h' : 'Noturno · 19h–07h do dia seguinte'}</legend>
            <label className="field"><span>Antecedência permitida (minutos)</span><input type="number" min={0} max={720} value={config.rules[shift].earlyMinutes} onChange={e => setConfig(x => ({ ...x, rules: { ...x.rules, [shift]: { ...x.rules[shift], earlyMinutes: Number(e.target.value) } } }))} /></label>
            <label className="field"><span>Janela após o início (minutos, limitada ao fim da jornada)</span><input type="number" min={1} max={720} value={config.rules[shift].lateMinutes} onChange={e => setConfig(x => ({ ...x, rules: { ...x.rules, [shift]: { ...x.rules[shift], lateMinutes: Number(e.target.value) } } }))} /></label>
          </fieldset>)}
        </div>
        <p>As viradas de 07h/19h são preservadas. Em 24 horas, a marcação de entrada da jornada pode confirmar os dois segmentos; diaristas respeitam a janela de 8 horas.</p>
        <button className="btn primary">Salvar configuração demonstrativa</button>
      </form>
    </section>
    <section className="panel integration-panel"><h2>Relacionar profissionais ao Biofinger</h2><p>Relação explícita entre IDs, exclusiva desta unidade. Não associar apenas pelo nome. Não utilize CPF ou CNS.</p>
      <form className="filters" onSubmit={e => { e.preventDefault(); if (change(x => saveMapping(x, s, { unitId: s.activeUnitId, professionalId, externalProfessionalId: externalId }), 'Relação demonstrativa de identificadores salva.')) setExternal(''); }}>
        <label className="field"><span>Profissional da unidade</span><select required value={professionalId} onChange={e => { setProfessional(e.target.value); setExternal(mappings.find(m => m.professionalId === e.target.value)?.externalProfessionalId || ''); }}><option value="">Selecione após conferir a identidade</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.fullName} · ID interno: {p.id}</option>)}</select></label>
        <label className="field"><span>Identificador no Biofinger</span><input required maxLength={80} value={externalId} autoComplete="off" onChange={e => setExternal(e.target.value)} /></label>
        <button className="btn primary">Salvar relação</button>
      </form>
      <div className="tablewrap"><table><thead><tr><th>Profissional</th><th>ID interno</th><th>ID Biofinger</th><th>Ação</th></tr></thead><tbody>{mappings.map(m => <tr key={m.professionalId}><td><b>{d.professionals.find(p => p.id === m.professionalId)?.fullName}</b></td><td>{m.professionalId}</td><td>{m.externalProfessionalId}</td><td><button className="btn" onClick={() => change(x => removeMapping(x, s, m.professionalId), 'Relação removida.')}>Remover relação</button></td></tr>)}</tbody></table></div>
      {!mappings.length && <p>Nenhum identificador relacionado nesta unidade.</p>}
    </section>
  </>;
}
