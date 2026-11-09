import {
  Sun,
  Moon,
  Settings2,
  Monitor,
  Maximize,
  Minimize,
  Stethoscope,
  HeartPulse,
  Accessibility,
  HandHeart,
  Users,
  UserRound,
} from "lucide-react";
import type { Professional } from "../models";
import { saoPauloClock, ZONE } from "./data";
type Clock = ReturnType<typeof saoPauloClock>;
const logos = import.meta.glob("../assets/logo-rio-saude.{png,svg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const logo = Object.values(logos)[0] as string | undefined;
const roleLabel = (name: string) =>
  ({
    Médico: "Médicos",
    Enfermeiro: "Enfermeiros",
    "Técnico de Enfermagem": "Técnicos de Enfermagem",
    Maqueiro: "Maqueiros",
    Fisioterapeuta: "Fisioterapeutas",
    Administrativo: "Equipe administrativa",
  })[name] || name;
const iconFor = (name: string) => {
  const n = name.toLowerCase();
  return n.includes("médic")
    ? Stethoscope
    : n.includes("enferm")
      ? HeartPulse
      : n.includes("maqueir")
        ? Accessibility
        : n.includes("fisio")
          ? HandHeart
          : n.includes("administr")
            ? Users
            : UserRound;
};
export function CommandHeader({
  unitName,
  clock,
  now,
  simulated,
  controls,
  onToggleControls,
  tv,
  onToggleTv,
  fullscreen,
  onFullscreen,
}: {
  unitName: string;
  clock: Clock;
  now: Date;
  simulated: boolean;
  controls: boolean;
  onToggleControls: () => void;
  tv: boolean;
  onToggleTv: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
}) {
  const day = clock.shift === "day";
  const Icon = day ? Sun : Moon;
  return (
    <header className="cc-header">
      <div className="cc-masthead">
        <div className="cc-brand">
          {logo ? (
            <img
              className="cc-logo"
              src={logo}
              alt="Prefeitura do Rio de Janeiro / Rio Saúde"
            />
          ) : (
            <div
              className="cc-logo-slot"
              aria-label="Espaço reservado para logo oficial"
            >
              <b>RIO SAÚDE</b>
              <small>Logo oficial · aguardando arquivo</small>
            </div>
          )}
          <span className="cc-brand-divider" />
          <span className="cc-product">
            COMMAND CENTER<small>GESTÃO DE PLANTÕES</small>
          </span>
        </div>
        <div className="cc-header-actions">
          <span className="cc-demo-label">DADOS FICTÍCIOS</span>
          <button
            className={"pd-button " + (tv ? "pd-active" : "")}
            onClick={onToggleTv}
            aria-pressed={tv}
          >
            <Monitor size={16} />
            <span>{tv ? "Sair do modo TV" : "Modo TV"}</span>
          </button>
          <button
            className="pd-button cc-icon-button"
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={onFullscreen}
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            className="pd-button cc-icon-button"
            aria-label="Demonstração"
            title="Controles de demonstração"
            aria-expanded={controls}
            onClick={onToggleControls}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
      <div className="cc-heading">
        <div className="cc-unit">
          <span className="cc-eyebrow">CENTRAL DE ESCALAS</span>
          <h1>{unitName}</h1>
          <div
            className="cc-shift"
            aria-live="polite"
            key={clock.shift + clock.referenceDate}
          >
            <Icon size={17} />
            <h2>Plantão {day ? "diurno" : "noturno"}</h2>
            <span>{day ? "07h às 19h" : "19h às 07h"}</span>
            <i />
            <small>{simulated ? "Horário simulado" : "Troca automática"}</small>
          </div>
        </div>
        <div className="cc-clock">
          <span className="cc-eyebrow">
            {simulated ? "SIMULAÇÃO · SÃO PAULO" : "HORÁRIO DE SÃO PAULO"}
          </span>
          <time dateTime={now.toISOString()}>{clock.time}</time>
          <span>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: ZONE,
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(now)}
          </span>
        </div>
      </div>
    </header>
  );
}
export function CommandSummary({
  total,
  functions,
  clock,
}: {
  total: number;
  functions: number;
  clock: Clock;
}) {
  return (
    <section className="cc-summary" aria-label="Resumo do plantão">
      <div className="cc-summary-metric">
        <strong>{String(total).padStart(2, "0")}</strong>
        <span>Profissionais escalados</span>
      </div>
      <div className="cc-summary-metric">
        <strong>{String(functions).padStart(2, "0")}</strong>
        <span>Funções ocupadas</span>
      </div>
      <div className="cc-summary-detail">
        <span>PLANTÃO ATUAL</span>
        <b>{clock.shift === "day" ? "Diurno" : "Noturno"}</b>
      </div>
      <div className="cc-summary-detail pd-reference">
        <span>DATA DA ESCALA</span>
        <b>
          {new Date(clock.referenceDate + "T12:00:00-03:00").toLocaleDateString(
            "pt-BR",
            { timeZone: ZONE, day: "2-digit", month: "long", year: "numeric" },
          )}
        </b>
      </div>
    </section>
  );
}
export function RoleSection({
  name,
  professionals,
  state,
}: {
  name: string;
  professionals: (Professional & { sector?: string })[];
  state: "published" | "empty" | "missing";
}) {
  const Icon = iconFor(name);
  return (
    <section className="cc-role-section" aria-label={roleLabel(name)}>
      <header className="cc-role-heading">
        <span className="cc-role-icon">
          <Icon size={23} />
        </span>
        <h3>{roleLabel(name)}</h3>
        <span className="cc-role-counter">
          <b>{String(professionals.length).padStart(2, "0")}</b>
          <span>
            {professionals.length === 1 ? "PROFISSIONAL" : "PROFISSIONAIS"}
          </span>
        </span>
      </header>
      {professionals.length ? (
        <ol
          className="cc-name-list"
          aria-label={"Profissionais — " + roleLabel(name)}
        >
          {professionals.map((p, i) => (
            <li className="cc-name" key={p.id}>
              <span className="cc-name-number" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <b>{p.fullName}</b>
                {(p.specialty || p.sector) && (
                  <small>{p.specialty || p.sector}</small>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="cc-role-empty">
          <p>Nenhum profissional escalado</p>
          <span>
            {state === "missing"
              ? "Sem escala cadastrada"
              : "Escala publicada sem profissionais"}
          </span>
        </div>
      )}
    </section>
  );
}
