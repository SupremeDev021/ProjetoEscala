import {
  Sun,
  Moon,
  Settings2,
  Monitor,
  Maximize,
  Minimize,
} from "lucide-react";
import { saoPauloClock, ZONE } from "./data";
type Clock = ReturnType<typeof saoPauloClock>;
const logos = import.meta.glob("../assets/logo-rio-saude.{png,svg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const logo = Object.values(logos)[0] as string | undefined;
export const roleLabel = (name: string) =>
  ({
    Médico: "Médicos",
    Enfermeiro: "Enfermeiros",
    "Técnico de Enfermagem": "Técnicos de Enfermagem",
    Maqueiro: "Maqueiros",
    Fisioterapeuta: "Fisioterapeutas",
    Administrativo: "Equipe administrativa",
  })[name] || name;
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
  const Icon = clock.shift === "day" ? Sun : Moon;
  return (
    <header className="rs-header">
      <div className="rs-topline">
        <div className="rs-brand">
          {logo ? (
            <img src={logo} alt="Prefeitura do Rio / Rio Saúde" />
          ) : (
            <div className="rs-logo-slot">
              <b>Rio Saúde</b>
              <small>Espaço reservado para logo oficial</small>
            </div>
          )}
          <span />
          <div>
            <b>PAINEL DE ESCALAS</b>
            <small>Dados fictícios · Demonstração</small>
          </div>
        </div>
        <div className="rs-actions">
          <button
            className={"pd-button " + (tv ? "pd-active" : "")}
            onClick={onToggleTv}
            aria-pressed={tv}
          >
            <Monitor size={16} />
            <span>{tv ? "Sair do modo TV" : "Modo TV"}</span>
          </button>
          <button
            className="pd-button"
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={onFullscreen}
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            className="pd-button"
            aria-label="Demonstração"
            aria-expanded={controls}
            onClick={onToggleControls}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
      <div className="rs-unit-line">
        <div>
          <span className="rs-eyebrow">UNIDADE</span>
          <h1>{unitName}</h1>
        </div>
        <div className="rs-clock">
          <span className="rs-eyebrow">
            {simulated ? "HORÁRIO SIMULADO" : "HORÁRIO DE SÃO PAULO"}
          </span>
          <time dateTime={now.toISOString()}>{clock.time}</time>
          <span>
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: ZONE,
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(now)}
          </span>
          <small className="pd-reference">
            Escala de{" "}
            {new Date(
              clock.referenceDate + "T12:00:00-03:00",
            ).toLocaleDateString("pt-BR", {
              timeZone: ZONE,
              day: "2-digit",
              month: "long",
            })}
          </small>
          <div className="rs-shift" aria-live="polite">
            <Icon size={16} />
            <h2>Plantão {clock.shift === "day" ? "diurno" : "noturno"}</h2>
            <span>{clock.shift === "day" ? "07h às 19h" : "19h às 07h"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
