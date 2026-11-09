import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Building2,
  CalendarDays,
  Clock3,
  Sun,
  Moon,
  Users,
  Layers,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  UserRound,
  Settings2,
  Monitor,
  Maximize,
  Minimize,
  RefreshCw,
  WifiOff,
  Info,
  Accessibility,
  HandHeart,
  Play,
  Pause,
  Image,
  ArrowUpRight,
  X,
} from "lucide-react";
import type { Data, Professional } from "../models";
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
const fmtDate = (date: string) =>
  new Date(date + "T12:00:00-03:00").toLocaleDateString("pt-BR", {
    timeZone: ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const fmtUpdated = (date: string) =>
  new Date(date).toLocaleString("pt-BR", { timeZone: ZONE });
const roleIcon = (name: string) =>
  name.toLowerCase().includes("médic")
    ? Stethoscope
    : name.toLowerCase().includes("enferm")
      ? HeartPulse
      : name.toLowerCase().includes("maqueir")
        ? Accessibility
        : name.toLowerCase().includes("fisio")
          ? HandHeart
          : name.toLowerCase().includes("administr")
            ? Users
            : UserRound;
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
  const lastInteraction = useRef(0);
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
  useEffect(() => {
    if (
      !tv ||
      !autoscroll ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const pause = () => {
      lastInteraction.current = Date.now();
    };
    ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"].forEach(
      (type) => window.addEventListener(type, pause, { passive: true }),
    );
    let bottomSince = 0;
    const id = setInterval(() => {
      if (
        document.hidden ||
        controls ||
        Date.now() - lastInteraction.current < 15000
      )
        return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max < 2) return;
      if (window.scrollY >= max - 2) {
        if (!bottomSince) bottomSince = Date.now();
        if (Date.now() - bottomSince > 7000) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          lastInteraction.current = Date.now();
          bottomSince = 0;
        }
      } else {
        bottomSince = 0;
        window.scrollBy({ top: 1, behavior: "instant" });
      }
    }, 85);
    return () => {
      clearInterval(id);
      ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"].forEach(
        (type) => window.removeEventListener(type, pause),
      );
    };
  }, [tv, autoscroll, controls]);
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
      <InstitutionalHeader
        controls={controls}
        onToggle={() => setControls(!controls)}
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
              Rolagem automática no modo TV
            </label>
            <span>
              Pausa por 15 segundos após interação. Respeita a preferência de
              movimento reduzido.
            </span>
          </div>
        </section>
      )}
      <main className="pd-main">
        <div className="pd-toolbar">
          <span>
            <span
              className={"pd-status-dot " + (offline || error ? "warning" : "")}
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
        <section className="pd-hero">
          <div className="pd-hero-copy">
            <span className="pd-overline">
              <Building2 size={14} />
              UNIDADE DE DEMONSTRAÇÃO
            </span>
            <h1>
              {unit?.name ||
                (busy ? "Carregando unidade…" : "Unidade não encontrada")}
            </h1>
            <p>Profissionais escalados para cuidar, em cada plantão.</p>
            <div className="pd-hero-tags">
              <span>
                <ShieldCheck size={15} />
                Somente escalas publicadas
              </span>
              <span>
                <Layers size={15} />
                Organização por função
              </span>
            </div>
          </div>
          <div className="pd-clock-block">
            <span className="pd-clock-label">
              <Clock3 size={13} />
              {simulation ? "HORÁRIO SIMULADO" : "HORÁRIO DE SÃO PAULO"}
            </span>
            <DigitalClock date={tick} />
            <span className="pd-calendar-date">
              {new Intl.DateTimeFormat("pt-BR", {
                timeZone: ZONE,
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(tick)}
            </span>
            <span className="pd-zone">America/Sao_Paulo · UTC−03:00</span>
          </div>
          <div className="pd-hero-watermark">
            <Activity />
          </div>
        </section>
        <ShiftIndicator clock={clock} simulated={Boolean(simulation)} />
        {simulation && (
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
              <div className="pd-kpis">
                <Metric
                  label="Profissionais escalados"
                  value={result.total}
                  icon={Users}
                  text="Pessoas únicas neste plantão"
                  featured
                />
                <Metric
                  label="Funções com escalados"
                  value={result.functions}
                  icon={Layers}
                  text="Composição por cargo"
                />
                <Metric
                  label="Médicos escalados"
                  value={result.doctors}
                  icon={Stethoscope}
                  text="Equipe médica do plantão"
                />
                <Metric
                  label="Enfermagem escalada"
                  value={result.nursing}
                  icon={HeartPulse}
                  text="Enfermeiros e técnicos"
                />
              </div>
              <div className="pd-section-title">
                <div>
                  <span className="pd-overline">QUEM CUIDA NESTE PLANTÃO</span>
                  <h2>Equipes por função</h2>
                </div>
                <span>
                  {result.groups.length} funções <span>·</span>{" "}
                  {isDay ? "Diurno" : "Noturno"} <span>·</span>{" "}
                  {source === "example"
                    ? "Cenário ilustrativo"
                    : "Publicações locais"}
                </span>
              </div>
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
              <div className="pd-role-grid">
                {result.groups.map((group) => (
                  <RoleCard
                    key={group.role.id}
                    name={group.role.name}
                    professionals={group.professionals}
                    state={group.state}
                  />
                ))}
              </div>
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
function DigitalClock({ date }: { date: Date }) {
  return (
    <time className="pd-digital-clock" dateTime={date.toISOString()}>
      {saoPauloClock(date).time}
    </time>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
  text,
  featured = false,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  text: string;
  featured?: boolean;
}) {
  return (
    <section className={"pd-metric " + (featured ? "featured" : "")}>
      <div>
        <span>{label}</span>
        <Icon size={21} />
      </div>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{text}</small>
    </section>
  );
}
function RoleCard({
  name,
  professionals,
  state,
}: {
  name: string;
  professionals: (Professional & { sector?: string })[];
  state: "published" | "empty" | "missing";
}) {
  const Icon = roleIcon(name);
  const complementary = professionals.some((p) => p.specialty || p.sector);
  return (
    <section className="pd-role-card">
      <header>
        <span className="pd-role-icon">
          <Icon size={22} />
        </span>
        <div>
          <h3>{name}</h3>
          <span>
            {state === "missing"
              ? "Sem escala cadastrada"
              : state === "empty"
                ? "Escala publicada sem profissionais"
                : "Profissionais escalados"}
          </span>
        </div>
        <b className="pd-role-count">
          {String(professionals.length).padStart(2, "0")}
        </b>
      </header>
      {professionals.length ? (
        <div className="pd-professionals">
          <div className="pd-list-head">
            <span>PROFISSIONAL</span>
            {complementary && (
              <span>
                {professionals.some((p) => p.sector)
                  ? "ESPECIALIDADE / SETOR"
                  : "ESPECIALIDADE"}
              </span>
            )}
          </div>
          {professionals.map((p, i) => (
            <div className="pd-professional" key={p.id}>
              <span className="pd-person-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <b>{p.fullName}</b>
              {(p.specialty || p.sector) && (
                <span className="pd-specialty">{p.specialty || p.sector}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="pd-role-empty">
          <UserRound size={23} />
          <p>Nenhum profissional escalado</p>
          <small>
            {state === "missing"
              ? "Aguardando publicação para esta função."
              : "Publicação recebida sem nomes para esta função."}
          </small>
        </div>
      )}
      <footer>
        <span
          className={"pd-status-dot " + (state === "missing" ? "muted" : "")}
        />
        {state === "missing" ? "Aguardando escala" : "Versão publicada"}
      </footer>
    </section>
  );
}

function InstitutionalHeader({
  controls,
  onToggle,
}: {
  controls: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="pd-header">
      <div className="pd-institution">
        <div
          className="pd-logo-placeholder"
          aria-label="Espaço reservado para logo oficial"
        >
          <Image size={24} />
          <span>
            LOGO OFICIAL<small>Prefeitura do Rio · Rio Saúde</small>
          </span>
        </div>
        <div className="pd-header-separator" />
        <div>
          <span className="pd-overline">RIO SAÚDE</span>
          <b>Painel de escalas</b>
        </div>
      </div>
      <span className="pd-demo-badge">
        DADOS FICTÍCIOS <span>DEMONSTRAÇÃO</span>
      </span>
      <button
        className="pd-button"
        aria-label="Demonstração"
        aria-expanded={controls}
        onClick={onToggle}
      >
        <Settings2 size={17} />
        <span>Demonstração</span>
      </button>
    </header>
  );
}

function ShiftIndicator({
  clock,
  simulated,
}: {
  clock: ReturnType<typeof saoPauloClock>;
  simulated: boolean;
}) {
  const isDay = clock.shift === "day";
  return (
    <section
      className="pd-shift-bar"
      key={clock.shift + clock.referenceDate}
      aria-live="polite"
    >
      <div className="pd-shift-symbol">
        {isDay ? <Sun size={25} /> : <Moon size={25} />}
      </div>
      <div>
        <span className="pd-overline">PLANTÃO ATIVO</span>
        <h2>
          Plantão {isDay ? "diurno" : "noturno"}{" "}
          <span>{isDay ? "07h às 19h" : "19h às 07h"}</span>
        </h2>
      </div>
      <div className="pd-reference">
        <span>DATA DE REFERÊNCIA DA ESCALA</span>
        <b>{fmtDate(clock.referenceDate)}</b>
      </div>
      <span className="pd-auto-badge">
        <span className="pd-status-dot" />
        {simulated ? "Simulação de horário" : "Troca automática"}
      </span>
    </section>
  );
}
