import { newConfig } from "../integration/configuration";
import { normalizeRecords } from "../integration/queryService";
import { scheduleWindow } from "../services/workRegimes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, RefreshCw, WifiOff } from "lucide-react";
import type { Data } from "../models";
import {
  dashboardRepository,
  projectDashboard,
  saoPauloClock,
  unitSlug,
  ZONE,
} from "./data";
import { STORAGE_KEY } from "../domain";
import { CommandHeader } from "./CommandLayout";
import { RoleCarousel } from "./RoleCarousel";
import { confirmedProfessionals, simulatedPontoFacialService, shiftId, type ShiftContext } from '../services/pontoFacialService';
import "./dashboard.css";
import "./refinement.css";
export function DashboardPage() {
  const { slug } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [tv, setTv] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const request = useRef(0);
  const ownsFullscreen = useRef(false);
  const [controls, setControls] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [punchState, setPunchState] = useState<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() });
  const [simulate, setSimulate] = useState(false);
  useEffect(() => {
    const show = () => {
      setControls(true);
      clearTimeout(controlsTimer.current);
      controlsTimer.current = setTimeout(() => setControls(false), 5000);
    };
    window.addEventListener('pointermove', show);
    window.addEventListener('pointerdown', show);
    window.addEventListener('keydown', show);
    return () => {
      clearTimeout(controlsTimer.current);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      window.removeEventListener('keydown', show);
    };
  }, []);
  const autoFullscreenAttempted = useRef(false);
  useEffect(() => {
    if (!tv) return;
    const enter = async () => {
      if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
      try {
        await document.documentElement.requestFullscreen();
        ownsFullscreen.current = true;
        setFullscreen(true);
      } catch {
        // Browsers may require a gesture. TV layout and slides continue unchanged.
      }
    };
    if (!autoFullscreenAttempted.current) {
      autoFullscreenAttempted.current = true;
      void enter();
    }
    const activate = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('button, input, select, a, summary')) return;
      if (event instanceof KeyboardEvent && ['Escape', 'Tab'].includes(event.key)) return;
      if (navigator.userActivation?.isActive) void enter();
    };
    window.addEventListener('pointerdown', activate);
    window.addEventListener('keydown', activate);
    return () => {
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [tv]);
  const clock = saoPauloClock(now);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setBusy(true);
    try {
      const next = await dashboardRepository.load("local");
      if (id === request.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) void refresh();
    };
    const sync = () => {
      setNow(new Date());
      if (!document.hidden) void refresh();
    };
    const online = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) void refresh();
    };
    const timer = setInterval(() => setNow(new Date()), 1000);
    window.addEventListener("storage", storage);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      request.current++;
      clearInterval(timer);
      window.removeEventListener("storage", storage);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [refresh]);
  useEffect(() => {
    const sync = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) ownsFullscreen.current = false;
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(id);
  }, [message]);
  const unit = slug
    ? data?.units.find((u) => unitSlug(u.name) === slug && u.active)
    : data?.units.find((u) => u.id === "u1" && u.active) ||
      data?.units.find((u) => u.active);
  const result =
    data && unit
      ? projectDashboard(data, unit.id, clock.referenceDate, clock.shift, now.getTime())
      : null;
  const peopleKey = result?.groups.flatMap(g => g.professionals.map(p => p.id)).sort().join('|') || '';
  const context = useMemo<ShiftContext>(() => {
    const c: ShiftContext = { unitId: unit?.id || '', referenceDate: clock.referenceDate,
      shift: clock.shift, professionalIds: peopleKey ? peopleKey.split('|') : [], windows: {} };
    for (const record of data?.published || []) {
      if (record.unitId !== c.unitId || record.date !== c.referenceDate || record.shift !== c.shift || !record.workRegime) continue;
      const window = scheduleWindow(record);
      for (const id of record.professionalIds) if (c.professionalIds.includes(id)) {
        // Duplicate entries for one person prefer the longest active scheduled coverage.
        const old = c.windows![id];
        const candidate = { ...window, shiftIds: record.workRegime === '24h' ? [`${c.unitId}|${c.referenceDate}|day`, `${c.unitId}|${c.referenceDate}|night`] : [shiftId(c)] };
        if (!old || candidate.end - candidate.start > old.end - old.start) c.windows![id] = candidate;
      }
    }
    return c;
  }, [unit?.id, clock.referenceDate, clock.shift, peopleKey, data]);
  const integration = data?.integrationConfigs?.find(c => c.unitId === unit?.id);
  const contextKey = shiftId(context);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        // Real adapter remains unavailable. DEV simulation passes an explicit synthetic ID map.
        const raw = import.meta.env.DEV && simulate ? await simulatedPontoFacialService.load(context) : [];
        const demoConfig = { ...newConfig(context.unitId), externalUnitId: `demo-unit-${context.unitId}`, equipmentIds: ['simulated'] };
        const demoMappings = context.professionalIds.map(id => ({ unitId: context.unitId, professionalId: id, externalProfessionalId: `demo-${id}` }));
        const records = normalizeRecords(raw.map(r => ({ externalProfessionalId: `demo-${r.professionalId}`, externalUnitId: demoConfig.externalUnitId,
          equipmentId: 'simulated', occurredAt: r.timestamp, kind: r.type, validation: r.validation, received: r.received, shiftId: r.shiftId })), demoConfig, demoMappings, context);
        if (active) setPunchState({ key: shiftId(context), ids: confirmedProfessionals(records, context, Date.now(), integration?.rules[context.shift]) });
      } catch {
        if (active) setPunchState({ key: shiftId(context), ids: new Set() });
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), (integration?.pollSeconds || 30) * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [context, simulate, integration]);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement && ownsFullscreen.current) { await document.exitFullscreen(); ownsFullscreen.current = false; }
      else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen(); ownsFullscreen.current = true; }
      else setMessage("Use a opção de tela cheia do seu navegador.");
    } catch {
      setMessage("O navegador exige que a tela cheia seja ativada pelo botão.");
    }
  }
  return (
    <div
      className={`modern-dashboard ${tv ? "tv-mode" : ""} ${controls ? "controls-visible" : "controls-hidden"} ${clock.shift === "day" ? "is-day" : "is-night"}`}
    >
      <CommandHeader
        unitName={
          unit?.name ||
          (busy ? "Carregando unidade…" : "Unidade não encontrada")
        }
        clock={clock}
        now={now}
        tv={tv}
        onToggleTv={() => setTv(!tv)}
        fullscreen={fullscreen}
        onFullscreen={toggleFullscreen}
      />
      <main className="pd-main">
        {import.meta.env.DEV && !tv && <details className="ponto-dev">
          <summary>Testes de ponto — dados fictícios</summary>
          <label><input type="checkbox" checked={simulate} onChange={e => setSimulate(e.target.checked)} /> Ativar simulação (IDs fictícios explicitamente relacionados)</label>
          <p>Primeiro profissional confirmado; segundo registra após 30 segundos. Os demais mantêm o visual original.</p>
          {result?.groups.flatMap(g => g.professionals).map(p => <button key={p.id} disabled={!simulate} onClick={() => simulatedPontoFacialService.register(context, p.id)}>Simular entrada de {p.fullName}</button>)}
          <p>O LED aparece na próxima consulta, sem recarregar. Simulação somente; não representa sincronização Biofinger.</p>
        </details>}

        {(offline || error) && (
          <div className="pd-alert" role="status">
            <WifiOff size={18} />
            <span>
              {error
                ? `${error} ${data ? "Exibindo a última leitura disponível." : ""}`
                : "Sem conexão com a rede. Exibindo publicações locais."}
            </span>
          </div>
        )}
        {busy && !data ? (
          <div className="pd-loading" role="status">
            <RefreshCw className="pd-spin" />
            Carregando escalas publicadas…
          </div>
        ) : !unit ? (
          <section className="pd-empty">
            <Building2 size={30} />
            <h2>Unidade não encontrada</h2>
            <p>Confira o endereço do painel da unidade.</p>
          </section>
        ) : (
          result && (
            <>
              <RoleCarousel
                key={`${unit.id}|${clock.referenceDate}|${clock.shift}`}
                groups={result.groups}
                total={result.total}
                auto
                suspended={false}
                tv={tv}
                confirmed={punchState.key === contextKey ? punchState.ids : new Set()}
              />
            </>
          )
        )}
        <footer className="pd-footer">
          <div>
            <b>Painel de Escalas — Rio Saúde</b>
          </div>
          <div className="pd-last-updated">
            <span>Última atualização dos dados</span>
            <b>
              {result?.updatedAt
                ? new Date(result.updatedAt).toLocaleString("pt-BR", {
                    timeZone: ZONE,
                  })
                : "Sem publicação neste plantão"}
            </b>
          </div>
          <span className="pd-published-tag">
            <span className="pd-status-dot" />
            {error
              ? "Indisponível"
              : result?.state === "published"
                ? "Publicada"
                : result?.state === "empty"
                  ? "Publicada sem profissionais"
                  : "Não cadastrada"}
          </span>
        </footer>
      </main>
      {message && (
        <div className="pd-feedback" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
