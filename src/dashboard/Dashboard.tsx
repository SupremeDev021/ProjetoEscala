import { useCallback, useEffect, useRef, useState } from "react";
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
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
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
      ? projectDashboard(data, unit.id, clock.referenceDate, clock.shift)
      : null;
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else setMessage("Use a opção de tela cheia do seu navegador.");
    } catch {
      setMessage("O navegador exige que a tela cheia seja ativada pelo botão.");
    }
  }
  return (
    <div
      className={`modern-dashboard ${tv ? "tv-mode" : ""} ${clock.shift === "day" ? "is-day" : "is-night"}`}
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
              {result.state === "missing" && (
                <div className="pd-empty-banner">
                  <div>
                    <b>Nenhuma escala publicada para este plantão</b>
                    <p>Aguardando publicação para {unit.name}.</p>
                  </div>
                </div>
              )}
              <RoleCarousel
                key={`${unit.id}|${clock.referenceDate}|${clock.shift}`}
                groups={result.groups}
                total={result.total}
                auto
                suspended={false}
                tv={tv}
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
