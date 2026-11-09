import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Users } from "lucide-react";
import { roleLabel } from "./CommandLayout";
import type { projectDashboard } from "./data";
type Group = ReturnType<typeof projectDashboard>["groups"][number];
export function RoleCarousel({
  groups,
  total,
  auto,
  suspended,
  tv,
}: {
  groups: Group[];
  total: number;
  auto: boolean;
  suspended: boolean;
  tv: boolean;
}) {
  const rank = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("médic")
      ? 0
      : n.includes("técnic")
        ? 1
        : n.includes("enferm")
          ? 2
          : n.includes("maqueir")
            ? 3
            : 4;
  };
  const ordered = [...groups].sort(
    (a, b) => rank(a.role.name) - rank(b.role.name),
  );
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [nav, setNav] = useState(0);
  const heldUntil = useRef(0);
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const sync = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  const columns = size.width >= 1000 ? 2 : 1;
  const rows = Math.max(
    1,
    Math.min(8, Math.floor((size.height - 600) / (tv ? 100 : 80))),
  );
  const capacity = columns * rows;
  const signature = ordered
    .map((g) => g.role.id + ":" + g.professionals.map((p) => p.id).join(","))
    .join("|");
  useEffect(() => {
    setIndex(0);
    setPage(0);
  }, [signature, capacity]);
  const group = ordered[Math.min(index, ordered.length - 1)];
  const pageCount = Math.max(
    1,
    Math.ceil((group?.professionals.length || 0) / capacity),
  );
  const currentPage = Math.min(page, pageCount - 1);
  const running = auto && playing && !suspended && !hover;
  useEffect(() => {
    if (!running || !ordered.length) return;
    const timer = setInterval(() => {
      if (document.hidden || Date.now() < heldUntil.current) return;
      if (currentPage + 1 < pageCount) setPage(currentPage + 1);
      else {
        setPage(0);
        setIndex((i) => (i + 1) % ordered.length);
      }
    }, 10000);
    const resume = () => {
      heldUntil.current = Date.now() + 10000;
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [running, index, currentPage, pageCount, ordered.length, signature, nav]);
  const move = (direction: number) => {
    heldUntil.current = Date.now() + 15000;
    setNav((v) => v + 1);
    if (direction > 0 && currentPage < pageCount - 1) setPage(currentPage + 1);
    else if (direction < 0 && currentPage > 0) setPage(currentPage - 1);
    else {
      setIndex((i) => (i + direction + ordered.length) % ordered.length);
      setPage(0);
    }
  };
  if (!group)
    return (
      <section className="rs-empty">
        Nenhuma função cadastrada para esta unidade.
      </section>
    );
  const people = group.professionals.slice(
    currentPage * capacity,
    (currentPage + 1) * capacity,
  );
  return (
    <section
      className="rs-carousel"
      aria-label="Slides por função"
      aria-roledescription="carrossel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement
        )
          return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <article
        className="rs-slide"
        key={`${group.role.id}-${currentPage}`}
        aria-roledescription="slide"
        aria-label={`${roleLabel(group.role.name)}, slide ${index + 1} de ${ordered.length}`}
      >
        <header className="rs-slide-heading">
          <div>
            <span className="rs-eyebrow">EQUIPE DO PLANTÃO</span>
            <h2>{roleLabel(group.role.name)}</h2>
            <p>
              <Users size={15} />
              <b>{group.professionals.length}</b>{" "}
              {group.professionals.length === 1
                ? "profissional escalado"
                : "profissionais escalados"}
            </p>
          </div>
          <span className="rs-slide-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
            <small>/{String(ordered.length).padStart(2, "0")}</small>
          </span>
        </header>
        {people.length ? (
          <ol
            className={
              "rs-people " +
              (columns === 2 && people.length > rows ? "two-columns" : "")
            }
            start={currentPage * capacity + 1}
          >
            {people.map((p, i) => (
              <li key={p.id}>
                <span aria-hidden="true">
                  {String(currentPage * capacity + i + 1).padStart(2, "0")}
                </span>
                <div>
                  <b>{p.fullName}</b>
                  {(p.specialty ||
                    (p as typeof p & { sector?: string }).sector) && (
                    <small>
                      {p.specialty ||
                        (p as typeof p & { sector?: string }).sector}
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rs-empty">
            <Users size={27} />
            <p>Nenhum profissional escalado</p>
            <small>
              {group.state === "missing"
                ? "Sem escala publicada para esta função."
                : "Escala publicada sem profissionais."}
            </small>
          </div>
        )}
      </article>
      <nav className="rs-navigation" aria-label="Navegação dos slides">
        <div className="rs-slide-position">
          <b>
            Slide {index + 1} de {ordered.length}
          </b>
          {pageCount > 1 && (
            <span>
              Página {currentPage + 1} de {pageCount} desta função
            </span>
          )}
          <small>{total} profissionais escalados no plantão</small>
        </div>
        <div className="rs-slide-controls">
          <button aria-label="Slide anterior" onClick={() => move(-1)}>
            <ChevronLeft size={19} />
          </button>
          <button
            aria-label={
              playing ? "Pausar apresentação" : "Retomar apresentação"
            }
            aria-pressed={!playing}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button aria-label="Próximo slide" onClick={() => move(1)}>
            <ChevronRight size={19} />
          </button>
        </div>
        <span className="rs-playback">
          {running ? "Troca automática · 10s" : "Apresentação pausada"}
        </span>
      </nav>
    </section>
  );
}
