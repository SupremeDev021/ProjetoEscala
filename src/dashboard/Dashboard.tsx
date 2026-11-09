import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Building2,
  CalendarDays,
  Clock3,
  Monitor,
  Maximize,
  Minimize,
  RefreshCw,
  WifiOff,
  Info,
  Play,
  Pause,
  ArrowUpRight,
  X,
} from "lucide-react";
import type { Data } from "../models";
import {
  dashboardRepository,
  projectDashboard,
  saoPauloClock,
  unitSlug,
  ZONE,
  type DataSource,
} from "./data";
import { STORAGE_KEY } from "../domain";
import "./dashboard.css";
import { CommandHeader } from "./CommandLayout";
import { RoleCarousel } from "./RoleCarousel";
const fmtUpdated = (date: string) =>
  new Date(date).toLocaleString("pt-BR", { timeZone: ZONE });
function useClock(simulation: string, playing: boolean) {
  const [real, setReal] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
  }, [simulation]);
  useEffect(() => {
    let previous = Date.now();
    const sync = () => {
      const next = Date.now();
      setReal(new Date(next));
      if (playing && simulation) setElapsed((e) => e + next - previous);
      previous = next;
    };
    const timer = setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [playing, simulation]);
  return simulation
    ? new Date(new Date(simulation + ":00-03:00").getTime() + elapsed)
    : real;
}
export function DashboardPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [source, setSource] = useState<DataSource>("local");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [controls, setControls] = useState(false);
  const [simulation, setSimulation] = useState("");
  const [simInput, setSimInput] = useState("2026-11-10T18:59");
  const [playing, setPlaying] = useState(true);
  const [tv, setTv] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);
  const [message, setMessage] = useState("");
  const tick = useClock(simulation, playing);
  const clock = saoPauloClock(tick);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setBusy(true);
    try {
      const next = await dashboardRepository.load(source, revision);
      if (id === request.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (id === request.current) setError((e as Error).message);
    } finally {
      if (id === request.current) setBusy(false);
    }
  }, [source, revision]);
  useEffect(() => {
    void refresh();
    const update = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) void refresh();
    };
    const online = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) void refresh();
    };
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("storage", update);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    document.addEventListener("visibilitychange", focus);
    return () => {
      request.current++;
      window.removeEventListener("storage", update);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  useEffect(() => {
    const fn = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
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
      ? projectDashboard(data, unit.id, clock.referenceDate, clock.shift)
      : null;
  const isDay = clock.shift === "day";
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setMessage("Tela cheia indisponível neste navegador. Use o modo TV.");
    } catch {
      setMessage("O navegador não permitiu tela cheia. Use o modo TV.");
    }
  }
  const preset = (value: string) => {
    setSource("example");
    setSimulation(value);
    setSimInput(value);
    setPlaying(true);
  };
  return (
    <div
      className={`modern-dashboard ${tv ? "tv-mode" : ""} ${isDay ? "is-day" : "is-night"}`}
    >
      <CommandHeader
        unitName={
          unit?.name ||
          (busy ? "Carregando unidade…" : "Unidade não encontrada")
        }
        clock={clock}
        now={tick}
        simulated={Boolean(simulation)}
        controls={controls}
        onToggleControls={() => setControls(!controls)}
        tv={tv}
        onToggleTv={() => setTv(!tv)}
        fullscreen={fullscreen}
        onFullscreen={toggleFullscreen}
      />
      {controls && (
        <section className="pd-controls" aria-label="Painel de demonstração">
          <div className="pd-control-title">
            <div>
              <b>Explore a demonstração</b>
              <p>
                Os controles abaixo não alteram cadastros, equipes ou escalas
                administrativas.
              </p>
            </div>
            <button
              aria-label="Fechar painel de demonstração"
              onClick={() => setControls(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="pd-controls-grid">
            <label>
              Unidade ilustrativa
              <select
                value={unit?.id || ""}
                onChange={(e) => {
                  const u = data?.units.find((u) => u.id === e.target.value);
                  if (u) navigate("/painel/unidade/" + unitSlug(u.name));
                }}
              >
                <option value="" disabled>
                  Selecione a unidade
                </option>
                {data?.units
                  .filter((u) => u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Fonte de dados
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as DataSource)}
              >
                <option value="local">
                  Publicações do administrativo local
                </option>
                <option value="example">
                  Cenário fictício · 10 e 11/11/2026
                </option>
              </select>
            </label>
            <label>
              Simular horário de São Paulo
              <input
                type="datetime-local"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
              />
            </label>
            <button
              className="pd-button pd-primary"
              disabled={!simInput}
              onClick={() => {
                setSimulation(simInput);
                setPlaying(true);
              }}
            >
              Aplicar horário
            </button>
          </div>
          <div className="pd-presets">
            <span>Testar viradas:</span>
            {[
              ["06:59", "2026-11-11T06:59"],
              ["07:00", "2026-11-11T07:00"],
              ["18:59", "2026-11-10T18:59"],
              ["19:00", "2026-11-10T19:00"],
              ["03:00 · dia seguinte", "2026-11-11T03:00"],
            ].map(([label, value]) => (
              <button
                className="pd-button"
                key={value}
                onClick={() => preset(value)}
              >
                {label}
              </button>
            ))}
            <button
              className="pd-button"
              onClick={() => {
                setSource("local");
                setSimulation("");
              }}
            >
              Voltar ao horário real
            </button>
          </div>
          <div className="pd-control-bottom">
            <label>
              <input
                type="checkbox"
                checked={autoscroll}
                onChange={(e) => setAutoscroll(e.target.checked)}
              />
              Reprodução automática dos slides
            </label>
            <span>
              Um cargo por slide · 10 segundos por página · pausa durante a
              interação.
            </span>
          </div>
        </section>
      )}
      <main className="pd-main">
        {controls && (
          <div className="pd-toolbar">
            <span>
              <span
                className={
                  "pd-status-dot " + (offline || error ? "warning" : "")
                }
              />
              {error
                ? "Dados indisponíveis"
                : offline
                  ? "Sem conexão · dados locais"
                  : "Visualização de escalas publicadas"}
            </span>
            <div>
              <button
                className={"pd-button " + (tv ? "pd-active" : "")}
                aria-pressed={tv}
                onClick={() => setTv(!tv)}
              >
                <Monitor size={16} />
                {tv ? "Sair do modo TV" : "Modo TV"}
              </button>
              <button className="pd-button" onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                <span>{fullscreen ? "Sair da tela cheia" : "Tela cheia"}</span>
              </button>
              <button
                className="pd-button"
                disabled={busy}
                onClick={() => {
                  if (source === "example") setRevision((r) => r + 1);
                  else void refresh();
                  setMessage(
                    source === "example"
                      ? "Atualização simulada: composição fictícia ampliada."
                      : "Publicações locais consultadas novamente.",
                  );
                }}
              >
                <RefreshCw size={16} className={busy ? "pd-spin" : ""} />
                <span>
                  {source === "example"
                    ? "Simular atualização"
                    : "Atualizar dados"}
                </span>
              </button>
            </div>
          </div>
        )}
        {(offline || error) && (
          <div className="pd-alert" role="status">
            <WifiOff size={18} />
            <span>
              {error
                ? `${error} ${data ? "Exibindo a última leitura disponível." : "Tente atualizar os dados."}`
                : "Sem conexão com a rede. A demonstração continua com dados locais; não há sincronização com um servidor."}
            </span>
          </div>
        )}
        {simulation && controls && (
          <div className="pd-sim-notice">
            <Clock3 size={16} />
            <span>
              Simulador ativo ·{" "}
              {source === "example"
                ? "Cenário fictício independente"
                : "Publicações locais"}{" "}
              · {playing ? "Relógio em execução" : "Relógio pausado"}
            </span>
            <button className="pd-button" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
              {playing ? "Pausar relógio" : "Continuar relógio"}
            </button>
            <button onClick={() => setSimulation("")}>Usar horário real</button>
          </div>
        )}
        {busy && !data ? (
          <div className="pd-loading" role="status">
            <RefreshCw className="pd-spin" />
            Carregando escalas publicadas…
          </div>
        ) : !unit ? (
          <section className="pd-empty">
            <Building2 size={35} />
            <h2>Unidade não encontrada</h2>
            <p>
              Confira o endereço ou escolha uma unidade no painel de
              demonstração.
            </p>
            <button className="pd-button" onClick={() => setControls(true)}>
              Selecionar unidade
            </button>
          </section>
        ) : (
          result && (
            <>
              {result.state === "missing" && (
                <div className="pd-empty-banner">
                  <CalendarDays size={25} />
                  <div>
                    <b>Sem escala cadastrada para publicação</b>
                    <p>
                      Nenhuma escala publicada nesta unidade, data e plantão.
                      Rascunhos não são exibidos.
                    </p>
                  </div>
                  {!simulation && (
                    <button
                      className="pd-button"
                      onClick={() => {
                        preset("2026-11-10T14:00");
                        setControls(true);
                      }}
                    >
                      Explorar cenário fictício
                      <ArrowUpRight size={15} />
                    </button>
                  )}
                </div>
              )}
              <RoleCarousel
                key={`${unit.id}|${clock.referenceDate}|${clock.shift}`}
                groups={result.groups}
                tv={tv}
                total={result.total}
                auto={autoscroll}
                suspended={controls}
              />
            </>
          )
        )}
        <footer className="pd-footer">
          <div>
            <Activity size={19} />
            <span>
              <b>Painel de Escalas — Rio Saúde</b>
              <small>
                {unit?.name || "Unidade indisponível"} · Dados fictícios /
                Demonstração
              </small>
            </span>
          </div>
          <div className="pd-last-updated">
            <span>Última atualização dos dados</span>
            <b>
              {result?.updatedAt
                ? fmtUpdated(result.updatedAt)
                : "Nenhuma publicação neste plantão"}
            </b>
          </div>
          <span
            className={
              "pd-published-tag " +
              (error
                ? "unavailable"
                : result?.state === "missing" || !result
                  ? "missing"
                  : "")
            }
          >
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
        <div className="pd-disclaimer">
          <span>
            <Info size={14} />
            Escalados não representam presença confirmada.
          </span>
          <span>Acesso demonstrativo, não adequado a dados reais</span>
        </div>
        <p className="pd-access-note">
          Simulação de acesso - sem autenticação real · Identidade ilustrativa,
          sem vínculo com portal oficial.
        </p>
      </main>
      {message && (
        <div className="pd-feedback" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
