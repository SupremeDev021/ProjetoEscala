import { IntegrationPage } from "./components/IntegrationPage";
import { regimeLabel, validateRegime, workAssignment, workRegimes } from "./services/workRegimes";
import logo from "../logorsbranco.png";
import { authorizedUnits, resolveLocalSession, startLocalSession } from "./services/localLogin";
import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  CalendarDays,
  Users,
  LayoutGrid,
  History,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Search,
  Plus,
  Check,
  X,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  Monitor,
  Save,
  Send,
  UserRound,
  ClipboardList,
  Menu,
  Copy,
  Eye,
  Pencil,
  Power,
  Info,
} from "lucide-react";
import type {
  Data,
  Session,
  Schedule,
  Professional,
  Team,
  UserAccess,
  Unit,
  Shift,
  WorkAssignment,
  WorkRegime,
} from "./models";
import { initialData } from "./initialData";
import { withPublishedRoster } from "./publishedRoster";
import { previewLegacyCleanup } from "./legacyCleanup";
import {
  STORAGE_KEY,
  key,
  available,
  admin,
  publishAssembly,
  resumeAssembly,
  confirmAssemblyRole,
  teamAdditions,
  publicationPeople,
  previewPartialCopy,
  savePartialCopy,
  clearAssemblyConfirmations,
  copyPublication,
  todaySaoPaulo,
  type Assembly,
  saveProfessional,
  toggleProfessional,
  saveTeam,
  saveUnit,
  saveAccess,
} from "./domain";
import "./style.css";
import { DashboardPage } from "./dashboard/Dashboard";
import { unitSlug } from "./dashboard/data";
const baseUrl = import.meta.env.BASE_URL;
const AppRouter = baseUrl === "/" ? BrowserRouter : HashRouter;
const dateLabel = (v: string) =>
  new Date(v + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
const timeLabel = (v: string) => new Date(v).toLocaleString("pt-BR");
const shiftLabel = (s: Shift) =>
  s === "day" ? "Diurno · 07h–19h" : "Noturno · 19h–07h";
function load(): Data {
  try {
    const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (x?.published && x?.links && x?.users) return withPublishedRoster(x);
  } catch {}
  return withPublishedRoster(initialData());
}
type Ctx = {
  d: Data;
  s: Session;
  user: UserAccess;
  unit: Unit;
  change: (f: (d: Data) => void, msg?: string) => boolean;
  setUnit: (id: string) => void;
  login: () => boolean;
  logout: () => void;
  toast: (v: string) => void;
};
const Context = createContext<Ctx>(null!);
const useApp = () => useContext(Context);
function App() {
  const [d, setD] = useState(load);
  const [storedSession, setS] = useState<Session>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("rio-session") || "null") || {
          userId: "",
          activeUnitId: "u1",
        }
      );
    } catch {
      return { userId: "", activeUnitId: "u1" };
    }
  });
  const [notice, setNotice] = useState("");
  const s = resolveLocalSession(d, storedSession) || { userId: "", activeUnitId: "" };
  useEffect(() => {
    if (s.userId) sessionStorage.setItem("rio-session", JSON.stringify(s));
    else sessionStorage.removeItem("rio-session");
    if (s.userId !== storedSession.userId || s.activeUnitId !== storedSession.activeUnitId) setS(s);
  }, [s.userId, s.activeUnitId, storedSession]);
  useEffect(() => {
    const fn = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setD(load());
    };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const user = d.users.find((u) => u.id === s.userId && u.active)!;
  const unit = d.units.find((u) => u.id === s.activeUnitId)!;
  const change = (
    f: (x: Data) => void,
    msg = "Alterações salvas.",
  ) => {
    try {
      const next = structuredClone(d);
      f(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setD(next);
      setNotice(msg);
      return true;
    } catch (e) {
      setNotice((e as Error).message);
      return false;
    }
  };
  const login = () => {
    const data = load();
    const next = startLocalSession(data, import.meta.env.DEV ? import.meta.env.VITE_LOCAL_GOOGLE_EMAIL : undefined);
    if (!next) return false;
    setD(data);
    setS(next);
    return true;
  };
  return (
    <Context.Provider
      value={{
        d,
        s,
        user,
        unit,
        change,
        setUnit: (id) => {
          if (
            user && authorizedUnits(d, user).some(u => u.id === id)
          )
            setS({ ...s, activeUnitId: id });
        },
        login,
        logout: () => setS({ ...s, userId: "" }),
        toast: setNotice,
      }}
    >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/painel/unidade/:slug" element={<DashboardPage />} />
        <Route element={<Layout />}>
          <Route
            path="/escala"
            element={<SchedulePage key={s.activeUnitId + s.userId} />}
          />
          <Route
            path="/cadastros"
            element={<Professionals key={s.activeUnitId} />}
          />
          <Route path="/equipes" element={<Teams key={s.activeUnitId} />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/integracao-ponto-facial" element={<IntegrationRoute key={s.activeUnitId + s.userId} />} />
          <Route path="/administracao" element={<Administration />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="notfound">
              <h1>404</h1>
              <h2>Esta página não foi encontrada.</h2>
              <Link className="btn primary" to="/">
                Voltar ao início
              </Link>
            </div>
          }
        />
      </Routes>
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => {
      if (el.open) el.close();
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">RIO SAÚDE</span>
          <h2>{title}</h2>
        </div>
        <button className="iconbtn" aria-label="Fechar modal" onClick={onClose}>
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Confirm({
  title,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modalbody">{children}</div>
      <footer>
        <button className="btn" onClick={onClose}>
          Voltar
        </button>
        <button className="btn primary" onClick={onConfirm}>
          Confirmar
        </button>
      </footer>
    </Modal>
  );
}
function Login() {
  const { login, user } = useApp();
  const nav = useNavigate();
  const [denied, setDenied] = useState(false);
  if (user) return <Navigate to="/escala" replace />;
  return <div className="entry-page">
    <header className="entry-header"><div>
      <img src={logo} alt="Prefeitura do Rio / Rio Saúde" />
      <span><b>RIOSAÚDE · DGOVI</b><small>TECNOLOGIA EM SAÚDE</small></span>
    </div></header>
    <main className="entry-main">
      <section className="entry-card" aria-labelledby="entry-title">
        <h1 id="entry-title">PAINEL ESCALA</h1>
        <button className="btn primary" onClick={() => {
          if (login()) nav("/escala", { replace: true });
          else setDenied(true);
        }}>Entrar com Google</button>
        {denied && <p role="alert">Acesso não autorizado. Solicite autorização ao administrador.</p>}
      </section>
    </main>
    <footer>Tecnologia em Saúde · DGOVI · RioSaúde</footer>
  </div>;
}
import { Outlet } from "react-router-dom";
const navItems = [
  ["/escala", "Montagem de escala", CalendarDays],
  ["/cadastros", "Profissionais", Users],
  ["/equipes", "Equipes padrão", LayoutGrid],
  ["/historico", "Histórico", History],
  ["/integracao-ponto-facial", "Integração Ponto Facial", ShieldCheck],
  ["/administracao", "Administração geral", Building2],
] as const;
function Layout() {
  const { user, unit, d, s, setUnit, logout } = useApp();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("rio-sidebar-collapsed") === "true");
  const toggleSidebar = () => {
    localStorage.setItem("rio-sidebar-collapsed", String(!collapsed));
    setCollapsed(!collapsed);
  };
  const [pending, setPending] = useState("");
  const loc = useLocation();
  const nav = useNavigate();
  const dirty = () => Boolean(document.querySelector('[data-dirty="true"]'));
  const guarded = (e: React.MouseEvent, path: string) => {
    if (dirty()) {
      e.preventDefault();
      setPending(path);
    }
  };
  if (!user || !unit?.active) return <Navigate to="/" replace />;
  return (
    <div className={collapsed ? "app sidebar-collapsed" : "app"}>
      {mobile && (
        <button
          className="sidebarbackdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <button
          className="sidebarclose"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </button>
        <Link to="/escala" className="brand sidebar-brand" aria-label="Painel de escala" onClick={(e) => guarded(e, "/escala")}>
          <img src={logo} alt="" />
          <span>Painel de escala</span>
        </Link>
        <nav aria-label="Gestão de escalas">
          {navItems
            .filter(
              ([p]) => p !== "/administracao" || user.role === "global_admin",
            )
            .map(([path, name, Icon]) => (
              <NavLink
                key={path}
                to={path}
                title={name}
                aria-label={name}
                onClick={(e) => {
                  guarded(e, path);
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                <span>{name}</span>
                <ChevronRight className="nav-chevron" size={14} />
              </NavLink>
            ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="iconbtn desktop-sidebar-toggle" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-expanded={!collapsed} onClick={toggleSidebar}><Menu size={19} /></button>
            <button
              className="iconbtn mobiletoggle"
              aria-label="Abrir navegação"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <b>{navItems.find(([p]) => p === loc.pathname)?.[1]}</b>
          </div>
          <div className="topactions">
            <Building2 size={17} />
            {authorizedUnits(d, user).length > 1 ? (
              <select
                aria-label="Unidade ativa"
                value={s.activeUnitId}
                onChange={(e) => {
                  if (dirty()) {
                    setPending("unit:" + e.target.value);
                  } else setUnit(e.target.value);
                }}
              >
                {authorizedUnits(d, user)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            ) : (
              <b>{unit.name}</b>
            )}
            <span className="divider" />
            <span className="avatar">
              {user.displayName
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="profile">
              <b>{user.displayName}</b>
              <small>
                {user.role === "global_admin"
                  ? "Administrador geral"
                  : "Gestor da unidade"}
              </small>
            </div>
            <button
              className="iconbtn"
              title="Sair"
              aria-label="Sair"
              onClick={() => {
                if (dirty()) setPending("logout");
                else {
                  logout();
                  nav("/");
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
      {pending && (
        <Confirm
          title="Descartar alterações não salvas?"
          onClose={() => setPending("")}
          onConfirm={() => {
            if (pending.startsWith("unit:")) setUnit(pending.slice(5));
            else if (pending === "logout") {
              logout();
              nav("/");
            } else nav(pending);
            setPending("");
          }}
        >
          Você tem uma edição em andamento. As alterações ainda não salvas serão
          descartadas.
        </Confirm>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="pagetitle">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function RosterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="roster-group">
    <h3>{title}</h3>
    <ul className="member-list">{children}</ul>
  </section>;
}

function SchedulePage() {
  const { d, s, unit, change, toast } = useApp();
  const location = useLocation();
  const roles = d.roles.filter(r => r.active);
  const fresh = (): Assembly => {
    const params = new URLSearchParams(location.search);
    const date = params.get("data") || "";
    const parsed = new Date(date + "T00:00:00Z");
    const team = params.get("equipe");
    return { unitId: s.activeUnitId, date: !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === date
      && date >= todaySaoPaulo() ? date : todaySaoPaulo(), shift: params.get("turno") === "night" ? "night" : "day",
      teamId: d.teams.find(t => t.id === team && t.unitId === s.activeUnitId && t.active)?.id,
      selections: {}, confirmed: {} };
  };
  const contextStorageKey = JSON.stringify(["rio-assembly-context", s.userId, s.activeUnitId]);
  const [draft, setDraft] = useState(() => {
    const current = fresh();
    if (location.search) return resumeAssembly(d, s, current);
    try {
      const context = JSON.parse(sessionStorage.getItem(contextStorageKey) || "null");
      if (context?.date === current.date && (!context.teamId || d.teams.some(t => t.id === context.teamId && t.unitId === current.unitId && t.active))) {
        const { shift, teamId, workRegime, startTime } = context;
        return resumeAssembly(d, s, { ...current, shift, teamId, workRegime, startTime });
      }
    } catch {}
    return resumeAssembly(d, s, current);
  });
  const [roleId, setRoleId] = useState("");
  const [rolesOpen, setRolesOpen] = useState(false);
  const roleTrigger = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const [publish, setPublish] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [teamPicker, setTeamPicker] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const previewClose = useRef<HTMLButtonElement>(null);
  const hasChanges = (id: string) => Object.hasOwn(draft.selections, id) && !draft.confirmed[id];
  const dirty = Object.keys(draft.selections).some(hasChanges);
  const openAssembly = (next: Assembly) => {
    setDraft(next);
    setRoleId("");
    setRolesOpen(false);
    setSearch("");
    setPublish(false);
    setPending(null);
    setCopyNotice("");
    setTeamPicker(null);
  };
  const { date, shift, teamId } = draft;
  useEffect(() => {
    try {
      const previous = JSON.parse(sessionStorage.getItem(contextStorageKey) || "null");
      const legacy = previous?.date === date && previous?.shift === shift && previous?.teamId === teamId ? previous : {};
      sessionStorage.setItem(contextStorageKey, JSON.stringify({ date, shift, teamId, workRegime: legacy.workRegime, startTime: legacy.startTime }));
    } catch {}
  }, [contextStorageKey, date, shift, teamId]);
  useEffect(() => {
    const source = (location.state as { publication?: Schedule[] } | null)?.publication;
    if (!source) return;
    window.history.replaceState({ ...window.history.state, usr: null }, "");
    try {
      const result = copyPublication(d, s, source);
      openAssembly({ ...result.assembly, workRegime: undefined, startTime: undefined });
      setCopyNotice(result.ignored.length ? "Nomes desconsiderados: " + result.ignored.join(", ") : "Publicação copiada. Confirme todos os cargos antes de publicar.");
    } catch (e) { toast((e as Error).message); }
  }, [location.key]);
  useEffect(() => {
    const check = () => {
      if (todaySaoPaulo() > draft.date) {
        openAssembly(resumeAssembly(d, s, fresh())); toast("O dia mudou em São Paulo. A montagem foi reiniciada para o dia atual.");
      }
    };
    const unload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    const timer = window.setInterval(check, 1000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    window.addEventListener("beforeunload", unload);
    return () => { clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); window.removeEventListener("beforeunload", unload); };
  }, [d, s, draft.date, dirty]);
  const guard = (fn: () => void) => dirty ? setPending(() => fn) : fn();
  const parameter = (value: Partial<Assembly>) => guard(() => openAssembly(resumeAssembly(d, s, { ...draft, ...value })));
  const role = roles.find(r => r.id === roleId) || roles[0];
  const roleIndex = roles.findIndex(r => r.id === role?.id);
  const selectRole = (id: string) => {
    setRoleId(id);
    setSearch("");
    setRolesOpen(false);
  };
  const ids = draft.selections[role?.id] || [];
  const all = role ? available(d, s.activeUnitId, role.id) : [];
  const visible = all.filter(p => p.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const update = (next: string[]) => {
    if (next.length === ids.length && next.every(id => ids.includes(id))) return;
    setDraft(x => ({ ...x, selections: { ...x.selections, [role.id]: next }, confirmed: { ...x.confirmed, [role.id]: false } }));
  };
  const updateWorkAssignment = (id: string, assignment: WorkAssignment) => {
    setDraft(x => ({ ...x, workAssignments: { ...x.workAssignments, [id]: assignment },
      confirmed: { ...x.confirmed, [role.id]: false } }));
  };
  const teams = d.teams.filter(t => t.unitId === draft.unitId && t.active);
  const additions = teams.some(t => t.id === teamPicker) && teamPicker
    ? teamAdditions(d, s, draft, teamPicker) : [];
  const addTeam = () => {
    setDraft(current => {
      const selections = { ...current.selections };
      const workAssignments = { ...current.workAssignments };
      const confirmed = { ...current.confirmed };
      for (const { professional, assignment } of additions) {
        const { id, roleId } = professional;
        selections[roleId] = [...(selections[roleId] || []), id];
        if (assignment && !workAssignments[id]) workAssignments[id] = assignment;
        confirmed[roleId] = false;
      }
      return { ...current, selections, workAssignments, confirmed };
    });
    setTeamPicker(null);
  };
  const confirmRole = () => {
    const nextRole = roles[roleIndex + 1];
    const confirmed = { ...draft.confirmed, [role.id]: true };
    const completed = !nextRole && roles.every(r => confirmed[r.id]);
    if (!change(x => confirmAssemblyRole(x, s, draft, role.id),
      completed ? "Todos os cargos foram confirmados" : "Composição do cargo salva.")) return;
    setDraft(x => ({ ...x, confirmed }));
    if (nextRole) selectRole(nextRole.id);
  };
  const reset = () => {
    if (!change(x => clearAssemblyConfirmations(x, s, draft), "Montagem reiniciada.")) return;
    openAssembly({ ...draft, selections: {}, workAssignments: {}, confirmed: {} });
  };
  const roleLabel = (r: (typeof roles)[number]) => <>
    <span>{r.name}</span>
    {draft.confirmed[r.id] ? <span className="role-complete"><Check size={16} aria-hidden="true" /> Concluído</span>
      : hasChanges(r.id) && <span className="role-unsaved">Alterações não salvas</span>}
  </>;
  const isToday = draft.date === todaySaoPaulo();
  const ready = isToday && roles.length > 0 && roles.every(r => draft.confirmed[r.id]) && roles.some(r => draft.selections[r.id]?.length);
  const includes24h = roles.some(r => draft.selections[r.id]?.some(id => draft.workAssignments?.[id]?.workRegime === "24h"));
  const previewRoles = roles.filter(r => draft.selections[r.id]?.length);
  const previewCount = previewRoles.reduce((total, r) => total + draft.selections[r.id].length, 0);
  return <div data-dirty={dirty}>
    <PageTitle eyebrow="PLANEJAMENTO ASSISTENCIAL" title="Montagem de escala" subtitle="Confirme cada cargo e publique o plantão completo ao final.">
      {unit?.active ? <a className="btn" href={`${baseUrl}${baseUrl === "/" ? "" : "#/"}painel/unidade/${encodeURIComponent(unitSlug(unit.name))}`} target="_blank" rel="noreferrer"><Monitor size={17} /> Abrir dashboard</a>
        : <p>Selecione uma unidade para abrir o dashboard.</p>}
    </PageTitle>
    <div className="stats assemblystats">
      <Stat icon={<Building2 />} label="Unidade em gestão" value={unit.name} note="Unidade ativa" />
      <Stat icon={<Users />} label="Profissionais ativos" value={available(d, s.activeUnitId).length} note="Disponíveis para compor escalas" />
    </div>
    {copyNotice && <p role="status" className="callout">{copyNotice}</p>}
    <div className="assembly-workspace">
    <aside className="assembly-preview" data-open={previewOpen}>
      <div className="assembly-preview-launcher" hidden={previewOpen}>
      <button className="btn" ref={previewTrigger} aria-expanded={previewOpen}
        onClick={() => {
          setPreviewOpen(true);
          requestAnimationFrame(() => previewClose.current?.focus());
        }}><Eye size={16} /> Visualizar escala</button>
      </div>
      {previewOpen && <section id="assembly-preview" className="panel assembly-preview-panel" aria-labelledby="assembly-preview-title">
        <div className="assembly-preview-heading">
          <h2 id="assembly-preview-title">Prévia da escala em montagem</h2>
          <button className="iconbtn" ref={previewClose} aria-label="Fechar prévia" onClick={() => {
            setPreviewOpen(false);
            requestAnimationFrame(() => previewTrigger.current?.focus());
          }}><X size={17} /></button>
        </div>
        <dl className="assembly-preview-context">
          <div><dt>Unidade</dt><dd>{unit.name}</dd></div>
          <div><dt>Data da escala</dt><dd>{dateLabel(draft.date)}</dd></div>
          <div><dt>Turno</dt><dd>{shiftLabel(draft.shift)}</dd></div>
        </dl>
        <p className="assembly-preview-count">{previewCount} {previewCount === 1 ? "profissional" : "profissionais"} · {previewRoles.length} {previewRoles.length === 1 ? "cargo" : "cargos"}</p>
        <div className="assembly-preview-list">
          {previewRoles.length ? previewRoles.map(r => <RosterGroup key={r.id} title={r.name}>
            {draft.selections[r.id].map(id => <li key={id}>
              <span>{d.professionals.find(p => p.id === id)?.fullName || id}</span>
              <span>{regimeLabel(draft.workAssignments?.[id]?.workRegime)}</span>
            </li>)}
          </RosterGroup>) : <p>Nenhum profissional selecionado na montagem.</p>}
        </div>
      </section>}
    </aside>
    <div className="assembly-editor">
    <section className="panel assembly-context">
      <div className="sectionheading"><h2>Configuração Escala</h2></div>
      <div className="filters">
        <Field label="Unidade"><div className="readonly">{unit.name}</div></Field>
        <Field label="DATA DA ESCALA"><div className="readonly">{dateLabel(draft.date)}</div></Field>
        <Field label="Turno"><select aria-label="Turno" value={draft.shift} onChange={e => parameter({ shift: e.target.value as Shift })}><option value="day">Diurno — 07h às 19h</option><option value="night">Noturno — 19h às 07h</option></select></Field>
      </div>
    </section>
    {role ? <section className="panel peoplepanel">
      <div className="rolearea">
        <div className="role-picker" onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget)) setRolesOpen(false);
        }} onKeyDown={e => {
          if (e.key === "Escape" && rolesOpen) {
            setRolesOpen(false);
            roleTrigger.current?.focus();
          }
        }}>
          <span id="assembly-role-label">Cargo</span>
          <button type="button" className="role-trigger" ref={roleTrigger} aria-expanded={rolesOpen}
            aria-controls={rolesOpen ? "assembly-roles" : undefined} aria-labelledby="assembly-role-label assembly-current-role"
            onClick={() => setRolesOpen(!rolesOpen)}>
            <span id="assembly-current-role" className="role-label">{roleLabel(role)}</span>
            <ChevronDown size={17} aria-hidden="true" />
          </button>
          {rolesOpen && <ul id="assembly-roles" className="role-options" aria-labelledby="assembly-role-label">
            {roles.map(r => <li key={r.id}>
              <button type="button" aria-current={r.id === role.id ? "true" : undefined} onClick={() => {
                selectRole(r.id);
                roleTrigger.current?.focus();
              }}>{roleLabel(r)}</button>
            </li>)}
          </ul>}
        </div>
      </div>
      <div className="sectionheading"><div><h2>{role.name}</h2><p>{ids.length} profissionais selecionados</p></div>
        <button className="btn" disabled={!teams.length} onClick={() => setTeamPicker("")}><Plus size={16} /> Adicionar equipe</button>
      </div>
      <div className="searchbox"><Search size={17} /><input aria-label="Pesquisar profissional" value={search} placeholder="Pesquisar profissional pelo nome..." onChange={e => setSearch(e.target.value)} /></div>
      <div className="selectiontools"><button onClick={() => update([...new Set([...ids, ...visible.map(p => p.id)])])}>Selecionar todos visíveis</button><button onClick={() => update([])}>Limpar seleção</button></div>
      <div className="peoplelist">{visible.map(p => {
        const selected = ids.includes(p.id);
        const assignment = draft.workAssignments?.[p.id] || workAssignment({});
        const errorId = `work-error-${p.id}`;
        let workError = "";
        if (selected) {
          try { validateRegime(assignment.workRegime, draft.shift, assignment.startTime); }
          catch (error) { workError = (error as Error).message; }
        }
        return <div key={p.id} className={"person assembly-person " + (selected ? "checked" : "")}>
          <label><input type="checkbox" checked={selected}
            onChange={() => update(selected ? ids.filter(id => id !== p.id) : [...ids, p.id])} /> <b>{p.fullName}</b></label>
          {selected && <div className="person-work">
            <Field label="Jornada"><select aria-label={`Jornada de ${p.fullName}`} value={assignment.workRegime}
              title={regimeLabel(assignment.workRegime)} aria-describedby={workError ? errorId : undefined}
              onChange={e => updateWorkAssignment(p.id, workAssignment({ workRegime: e.target.value as WorkRegime, startTime: assignment.startTime }))}>
              {workRegimes.map(regime => <option key={regime} value={regime} title={regimeLabel(regime)}>{regime === "diarist" ? "Diarista · 8h" : regime === "24h" ? "24 horas" : regimeLabel(regime)}</option>)}
            </select></Field>
            {workError && <p id={errorId} role="alert">{workError}</p>}
          </div>}
        </div>;
      })}{!visible.length && <Empty text="Nenhum profissional encontrado para este cargo ou pesquisa." />}</div>
      <p className="listnote">Confirmar cargo salva a composição. O dashboard só muda após a publicação final.</p>
    </section> : <Empty text="Cadastre ao menos um cargo ativo para montar a escala." />}
    </div>
    <div className="assembly-actions">
      <p className="assembly-action-status" role="status">
        {roles.filter(r => draft.confirmed[r.id]).length} de {roles.length} cargos confirmados
        {role && !ids.length && " · Confirmar cargo registra uma composição vazia."}
      </p>
      <div className="assembly-buttons">
      <div className="role-navigation" aria-label="Navegação de cargos" role="group">
        <button className="btn" disabled={roleIndex <= 0} onClick={() => selectRole(roles[roleIndex - 1].id)}><ChevronLeft size={16} /> Voltar</button>
        <button className="btn" disabled={roleIndex < 0 || roleIndex === roles.length - 1} onClick={() => selectRole(roles[roleIndex + 1].id)}>Próximo <ChevronRight size={16} /></button>
      </div>
      <button className="btn" onClick={() => {
        if (Object.keys(draft.selections).length || Object.keys(draft.confirmed).length) setPending(() => reset);
        else reset();
      }}>Reiniciar montagem</button>
      <button className="btn" disabled={!role || !isToday || !!draft.confirmed[role.id]} onClick={confirmRole}><Check size={16} /> Confirmar cargo</button>
      {role && <button className="btn primary" disabled={!ready} onClick={() => setPublish(true)}><Send size={16} /> Publicar escala</button>}
    </div></div>
    </div>
    {!isToday && <p className="listnote">Rascunho para {dateLabel(draft.date)}. A confirmação e a publicação ficam disponíveis na data da escala.</p>}
    {teamPicker !== null && <Modal title="Adicionar equipe" onClose={() => setTeamPicker(null)}>
      <div className="modalbody">
        <Field label="Equipe"><select value={teamPicker} onChange={e => setTeamPicker(e.target.value)}>
          <option value="">Selecione uma equipe</option>
          {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select></Field>
        {teamPicker && (additions.length
          ? <ul className="team-preview" aria-label="Profissionais a incluir">{additions.map(({ professional, assignment }) =>
              <li key={professional.id}>{professional.fullName} · {roles.find(r => r.id === professional.roleId)?.name}
                {assignment && ` · ${regimeLabel(assignment.workRegime)}`}</li>)}</ul>
          : <p role="status">Nenhum novo profissional elegível nesta equipe.</p>)}
      </div>
      <footer>
        <button className="btn" onClick={() => setTeamPicker(null)}>Cancelar</button>
        <button className="btn primary" disabled={!additions.length} onClick={addTeam}>Confirmar inclusão</button>
      </footer>
    </Modal>}
    {pending && <Confirm title="Substituir a montagem ou seleção atual?" onClose={() => setPending(null)} onConfirm={() => { pending(); setPending(null); }}>As seleções afetadas serão descartadas. Deseja continuar?</Confirm>}
    {publish && <Confirm title="Publicar escala completa?" onClose={() => setPublish(false)} onConfirm={() => {
      if (todaySaoPaulo() !== draft.date) { openAssembly(resumeAssembly(d, s, fresh())); toast("O dia mudou. Revise a nova montagem."); return; }
      let next = fresh();
      if (change(x => {
        publishAssembly(x, s, draft);
        clearAssemblyConfirmations(x, s, draft);
        next = resumeAssembly(x, s, next);
      }, "Escala completa publicada. O dashboard recebeu a nova composição.")) openAssembly(next);
      else setPublish(false);
    }}><p>{unit.name} · {dateLabel(draft.date)} · {shiftLabel(draft.shift)}
      {draft.teamId && ` · Equipe ${d.teams.find(t => t.id === draft.teamId)?.name}`}</p>
      {includes24h && <p>Os profissionais com jornada de 24 horas também integram {draft.shift === "day" ? "o turno noturno desta data" : "o turno diurno do dia seguinte"}.</p>}
      <ul>{roles.map(r => <li key={r.id}>{r.name}: {draft.selections[r.id]?.length || 0} profissionais</li>)}</ul></Confirm>}
  </div>;
}
function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="stat">
      <div className="staticon">{icon}</div>
      <span>{label}</span>
      <strong className={typeof value === "string" ? "unitvalue" : ""}>
        {value}
      </strong>
      <small>{note}</small>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ClipboardList size={28} />
      <p>{text}</p>
    </div>
  );
}
function IntegrationRoute() {
  const { d, s, change } = useApp();
  return <IntegrationPage d={d} s={s} change={change} />;
}
function Professionals() {
  const { d, s, unit, change } = useApp();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Professional | null>(null);
  const [team, setTeam] = useState("");
  const [toggle, setToggle] = useState<Professional | null>(null);
  const [error, setError] = useState("");
  const list = d.professionals.filter(
    (p) =>
      d.links.some(
        (l) => l.professionalId === p.id && l.unitId === s.activeUnitId,
      ) &&
      p.fullName.toLowerCase().includes(search.toLowerCase()) &&
      (!role || p.roleId === role) &&
      (!status || String(p.active) === status),
  );
  const open = (p?: Professional) => {
    setEdit(
      p
        ? { ...p }
        : {
            id: crypto.randomUUID(),
            fullName: "",
            roleId: "r0",
            active: true,
          },
    );
    setTeam(
      p
        ? d.members.find(
            (m) =>
              m.professionalId === p.id &&
              d.teams.some(
                (t) => t.id === m.teamId && t.unitId === s.activeUnitId,
              ),
          )?.teamId || ""
        : "",
    );
    setError("");
  };
  return (
    <>
      <PageTitle
        eyebrow="PESSOAS & VÍNCULOS"
        title="Profissionais"
        subtitle="Uma visão organizada de quem faz parte da sua unidade."
      >
        <button className="btn primary" onClick={() => open()}>
          <Plus size={18} />
          Novo profissional
        </button>
      </PageTitle>
      <div className="callout">
        <Info size={18} />
        <span>
          Desativar um profissional preserva
          escalas anteriores e o histórico.
        </span>
      </div>
      <section className="panel">
        <div className="sectionheading">
          <div>
            <h2>Cadastros da unidade</h2>
            <p>
              {unit.name} · {list.length} profissionais encontrados
            </p>
          </div>
          <Badge tone="neutral">Vínculos por unidade</Badge>
        </div>
        <div className="tablefilters">
          <div className="searchbox">
            <Search size={17} />
            <input
              aria-label="Pesquisar nome"
              placeholder="Pesquisar nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtro de cargo"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Todos os cargos</option>
            {d.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtro de status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Equipe padrão</th>
                <th>Unidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.fullName}</b>
                  </td>
                  <td>{d.roles.find((r) => r.id === p.roleId)?.name}</td>
                  <td>
                    {d.members
                      .filter(
                        (m) =>
                          m.professionalId === p.id &&
                          d.teams.some(
                            (t) =>
                              t.id === m.teamId && t.unitId === s.activeUnitId,
                          ),
                      )
                      .map((m) => d.teams.find((t) => t.id === m.teamId)?.name)
                      .join(", ") || "—"}
                  </td>
                  <td>
                    {unit.name}
                    <small>
                      {
                        d.links.filter(
                          (l) => l.professionalId === p.id && l.active,
                        ).length
                      }{" "}
                      vínculo(s)
                    </small>
                  </td>
                  <td>
                    <Badge tone={p.active ? "green" : "neutral"}>
                      {p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td>
                    <div className="rowactions">
                      <button
                        aria-label={"Editar " + p.fullName}
                        onClick={() => open(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={
                          (p.active ? "Desativar " : "Reativar ") + p.fullName
                        }
                        onClick={() => setToggle(p)}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <Empty text="Nenhum profissional encontrado." />}
        </div>
      </section>
      {edit && (
        <Modal
          title={
            d.professionals.some((p) => p.id === edit.id)
              ? "Editar profissional"
              : "Novo profissional"
          }
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (edit.fullName.trim().length < 3) {
                setError("Informe um nome completo com ao menos 3 caracteres.");
                return;
              }
              if (change((x) => saveProfessional(x, s, edit, team)))
                setEdit(null);
            }}
          >
            <div className="modalbody formgrid">
              <Field label="Nome completo *">
                <input
                  required
                  minLength={3}
                  value={edit.fullName}
                  onChange={(e) =>
                    setEdit({ ...edit, fullName: e.target.value })
                  }
                />
              </Field>
              <Field label="Cargo *">
                <select
                  value={edit.roleId}
                  onChange={(e) => setEdit({ ...edit, roleId: e.target.value })}
                >
                  {d.roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Equipe padrão (opcional)">
                <select value={team} onChange={(e) => setTeam(e.target.value)}>
                  <option value="">Sem equipe padrão</option>
                  {d.teams
                    .filter((t) => t.unitId === s.activeUnitId && t.active)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Equipe {t.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Vínculo de unidade">
                <input readOnly value={unit.name} />
              </Field>
              <p className="muted small">
                O vínculo profissional/unidade é armazenado separadamente. Nomes
                atualizados são refletidos nas escalas; o histórico mantém o
                antes e o depois.
              </p>
              {error && <p className="error">{error}</p>}
            </div>
            <footer>
              <button
                type="button"
                className="btn"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </button>
              <button className="btn primary">Salvar profissional</button>
            </footer>
          </form>
        </Modal>
      )}
      {toggle && (
        <Confirm
          title={
            toggle.active ? "Desativar profissional?" : "Reativar profissional?"
          }
          onClose={() => setToggle(null)}
          onConfirm={() => {
            if (change((x) => toggleProfessional(x, s, toggle.id)))
              setToggle(null);
          }}
        >
          <b>{toggle.fullName}</b>
          <p>
            {toggle.active
              ? "Deixará de aparecer nas novas seleções. Escalas salvas e histórico serão preservados."
              : "Voltará a aparecer nas seleções da unidade."}
          </p>
        </Confirm>
      )}
    </>
  );
}
function Teams() {
  const { d, s, unit, change } = useApp();
  const [edit, setEdit] = useState<Team | null>(null);
  const [view, setView] = useState<Team | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [turn, setTurn] = useState("");
  const [role, setRole] = useState("");
  const viewedMembers = view ? d.members.filter(m => m.teamId === view.id)
    .map(m => ({ ...m, name: d.professionals.find(p => p.id === m.professionalId)?.fullName || m.professionalId }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) : [];
  const viewedRoles = [...new Set(viewedMembers.map(m => m.roleId))];
  const teams = d.teams.filter(
    (t) =>
      t.unitId === s.activeUnitId &&
      t.active &&
      (!turn || !t.shift || t.shift === turn),
  );
  const open = (t?: Team) => {
    setEdit(
      t
        ? { ...t }
        : {
            id: crypto.randomUUID(),
            name: "",
            unitId: s.activeUnitId,
            active: true,
          },
    );
    setIds(
      t
        ? d.members
            .filter(
              (m) =>
                m.teamId === t.id &&
                available(d, s.activeUnitId).some(
                  (p) => p.id === m.professionalId,
                ),
            )
            .map((m) => m.professionalId)
        : [],
    );
    setRole("");
  };
  return (
    <>
      <PageTitle
        eyebrow="MODELOS DE COMPOSIÇÃO"
        title="Equipes padrão"
        subtitle="Um ponto de partida para cada plantão. Flexibilidade para cada dia."
      >
        <button className="btn primary" onClick={() => open()}>
          <Plus size={17} />
          Nova equipe
        </button>
      </PageTitle>
      <div className="callout">
        <Info size={18} />
        <span>Alterar equipe padrão não modifica escalas já salvas</span>
      </div>
      <div className="tablefilters">
        <select
          aria-label="Filtrar turno padrão"
          value={turn}
          onChange={(e) => setTurn(e.target.value)}
        >
          <option value="">Todos os turnos</option>
          <option value="day">Diurno</option>
          <option value="night">Noturno</option>
        </select>
        <span className="muted small">
          {unit.name} · Modelos sem turno servem para ambos.
        </span>
      </div>
      <div className="teamgrid">
        {teams.map((t) => (
          <section className="panel teamcard" key={t.id}>
            <h2>Equipe {t.name}</h2>
            <button className="btn" onClick={() => setView(t)}>Visualizar equipe</button>
          </section>
        ))}
      </div>
      {!teams.length && (
        <Empty text="Nenhuma equipe cadastrada. Crie um modelo para começar." />
      )}
      {view && <Modal title={`Equipe ${view.name}`} onClose={() => setView(null)}>
        <div className="modalbody history-members">
          <p>{view.shift ? shiftLabel(view.shift) : "Diurno e noturno"}</p>
          {viewedRoles.length ? viewedRoles.map(id => <RosterGroup key={id} title={d.roles.find(r => r.id === id)?.name || id}>
            {viewedMembers.filter(m => m.roleId === id).map(m => <li key={m.professionalId}><span>{m.name}</span></li>)}
          </RosterGroup>) : <Empty text="Esta equipe não tem integrantes." />}
        </div>
        <footer>
          <button className="btn" onClick={() => setView(null)}>Fechar</button>
          <button className="btn primary" onClick={() => { open(view); setView(null); }}><Pencil size={16} /> Editar equipe</button>
        </footer>
      </Modal>}
      {edit && (
        <Modal
          title={"Modelo · Equipe " + (edit.name || "nova")}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                change(
                  (x) => saveTeam(x, s, edit, ids),
                  "Modelo salvo. As escalas existentes foram preservadas.",
                )
              )
                setEdit(null);
            }}
          >
            <div className="modalbody">
              <div className="formgrid">
                <Field label="Nome da equipe *">
                  <input
                    required
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </Field>
                <Field label="Turno padrão">
                  <select
                    value={edit.shift || ""}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        shift: (e.target.value || undefined) as
                          Shift | undefined,
                      })
                    }
                  >
                    <option value="">Ambos os turnos</option>
                    <option value="day">Diurno</option>
                    <option value="night">Noturno</option>
                  </select>
                </Field>
                <Field label="Unidade">
                  <input value={unit.name} readOnly />
                </Field>
                <Field label="Filtrar composição por cargo">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="">Todos os cargos</option>
                    {d.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="muted">
                {ids.length} profissionais selecionados · Alterar equipe padrão
                não modifica escalas já salvas
              </p>
              <div className="modalpeople">
                {available(d, s.activeUnitId, role || undefined).map((p) => (
                  <label className="person" key={p.id}>
                    <input
                      type="checkbox"
                      checked={ids.includes(p.id)}
                      onChange={() =>
                        setIds(
                          ids.includes(p.id)
                            ? ids.filter((id) => id !== p.id)
                            : [...ids, p.id],
                        )
                      }
                    />
                    <span>
                      <b>{p.fullName}</b>
                      <small>
                        {d.roles.find((r) => r.id === p.roleId)?.name}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <footer>
              <button
                className="btn"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </button>
              <button className="btn primary">Salvar modelo</button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
function PublicationModal({ records, mode, close }: {
  records: Schedule[]; mode: "view" | "partial"; close: () => void;
}) {
  const { d, s, user, change, setUnit } = useApp();
  const nav = useNavigate();
  const origin = records[0];
  const today = todaySaoPaulo();
  const [date, setDate] = useState(today);
  const [shift, setShift] = useState<Shift>(origin.shift);
  const [unitId, setUnitId] = useState(origin.unitId);
  const [teamId, setTeamId] = useState(origin.teamId || "");
  const [selected, setSelected] = useState<Record<string, WorkAssignment>>({});
  const people = publicationPeople(records);
  const name = (id: string) => d.professionals.find(p => p.id === id)?.fullName || id;
  const groups = [...new Set(people.map(p => p.roleId))];
  const target: Assembly = { unitId, date, shift, selections: {}, confirmed: {},
    teamId: d.teams.find(t => t.id === teamId && t.active && t.unitId === unitId)?.id };
  const session = { ...s, activeUnitId: unitId };
  let preview: ReturnType<typeof previewPartialCopy>["entries"] = [];
  let error = "";
  if (mode === "partial") {
    try { preview = previewPartialCopy(d, session, records, target, selected).entries; }
    catch (e) { error = (e as Error).message; }
  }
  const entries = preview.filter(p => !p.issue && !p.duplicate);
  const copy = () => {
    if (!change(x => savePartialCopy(x, session, records, target, selected), "Seleção copiada para o rascunho.")) return;
    if (unitId !== s.activeUnitId) setUnit(unitId);
    const params = new URLSearchParams({ data: date, turno: shift });
    if (target.teamId) params.set("equipe", target.teamId);
    nav(`/escala?${params}`);
  };
  return <Modal title={mode === "view" ? "Visualizar escala" : "Copiar selecionados"} onClose={close}>
    <div className="modalbody history-members">
      <p><b>{d.units.find(u => u.id === origin.unitId)?.name}</b> · {dateLabel(origin.date)} · {
        records.some(r => r.shift !== origin.shift) ? "Diurno e noturno" : shiftLabel(origin.shift)}
        {origin.teamId && ` · Equipe ${d.teams.find(t => t.id === origin.teamId)?.name || origin.teamId}`}</p>
      {mode === "partial" && <>
        <div className="partial-fields">
          {user.role === "global_admin" && <Field label="Unidade de destino"><select value={unitId} onChange={e => setUnitId(e.target.value)}>
            {d.units.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select></Field>}
          <Field label="Data de destino"><input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Turno de destino"><select value={shift} onChange={e => setShift(e.target.value as Shift)}>
            <option value="day">Diurno — 07h às 19h</option><option value="night">Noturno — 19h às 07h</option>
          </select></Field>
          <Field label="Equipe de destino"><select value={target.teamId || ""} onChange={e => setTeamId(e.target.value)}>
            <option value="">Composição sem equipe</option>
            {d.teams.filter(t => t.active && t.unitId === unitId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></Field>
        </div>
        <p>Destino da cópia · {target.teamId ? `Equipe ${d.teams.find(t => t.id === target.teamId)?.name}` : "Composição sem equipe"}</p>
        <div className="rowactions">
          <button className="btn" onClick={() => setSelected(Object.fromEntries(people.map(p => [p.id, selected[p.id] || p.assignment])))}>Selecionar todos</button>
          <button className="btn" onClick={() => setSelected({})}>Desmarcar todos</button>
        </div>
      </>}
      {!people.length && <Empty text="Esta escala não tem profissionais." />}
      {mode === "view" && groups.map(roleId => <RosterGroup key={roleId} title={d.roles.find(r => r.id === roleId)?.name || roleId}>
        {people.filter(p => p.roleId === roleId).map(p => <li key={p.id}>
          <span>{name(p.id)}</span>
          <span>{regimeLabel(p.assignment.workRegime)}{p.assignment.startTime && ` · ${p.assignment.startTime}`}</span>
        </li>)}
      </RosterGroup>)}
      {mode === "partial" && groups.map(roleId => <section key={roleId} className="history-role">
        <h3>{d.roles.find(r => r.id === roleId)?.name || roleId}</h3>
        <ul className="member-list">{people.filter(p => p.roleId === roleId).map(p => {
          const assignment = selected[p.id];
          const result = preview.find(row => row.id === p.id);
          return <li key={p.id}>
            <label><input type="checkbox" checked={!!assignment} onChange={e => {
              const next = { ...selected };
              if (e.target.checked) next[p.id] = p.assignment;
              else delete next[p.id];
              setSelected(next);
            }} /> {name(p.id)}</label>
            {assignment && !result?.duplicate ? <select aria-label={`Jornada de ${name(p.id)}`} value={assignment.workRegime}
              onChange={e => setSelected({ ...selected, [p.id]: workAssignment({ workRegime: e.target.value as WorkRegime,
                startTime: p.assignment.startTime }) })}>
              {workRegimes.map(regime => <option key={regime} value={regime}>{regimeLabel(regime)}</option>)}
            </select> : <span>{regimeLabel(p.assignment.workRegime)}{p.assignment.startTime && ` · ${p.assignment.startTime}`}</span>}
            {result?.issue && <small role="alert">{result.issue}</small>}
            {result?.duplicate && <small>Já está no destino. A jornada do destino será mantida.</small>}
          </li>;
        })}</ul>
      </section>)}
      {mode === "partial" && <section className="history-role">
        <h3>Prévia da cópia · {entries.length} a incluir</h3>
        {entries.length > 0 && <ul className="member-list">{entries.map(p => <li key={p.id}>{name(p.id)} · {p.assignment && regimeLabel(p.assignment.workRegime)}</li>)}</ul>}
        {error && <p role="alert">{error}</p>}
      </section>}
    </div>
    <footer>
      <button className="btn" onClick={close}>{mode === "view" ? "Fechar" : "Cancelar"}</button>
      {mode === "partial" && <button className="btn primary" onClick={copy}
        disabled={!!error || !entries.length || preview.some(p => p.issue)}>Confirmar cópia</button>}
    </footer>
  </Modal>;
}

function HistoryPage() {
  const { d, s, user, setUnit, toast } = useApp();
  const [unit, setUnitFilter] = useState("");
  const nav = useNavigate();
  const [copy, setCopy] = useState<Schedule[] | null>(null);
  const [publication, setPublication] = useState<{ records: Schedule[]; mode: "view" | "partial" } | null>(null);
  const publications = Object.values(d.published.filter(x => user.role === "global_admin" ? (!unit || x.unitId === unit) : x.unitId === s.activeUnitId).reduce<Record<string, Schedule[]>>((groups, x) => {
    const k = x.publicationId || [x.unitId, x.date, x.shift, x.teamId].join("|");
    (groups[k] ||= []).push(x); return groups;
  }, {}));
  const [detail, setDetail] = useState<Data["events"][number] | null>(null);
  const events = d.events.filter((e) =>
    user.role === "global_admin"
      ? !unit || unit === e.unitId
      : e.unitId === s.activeUnitId,
  );
  return (
    <>
      <PageTitle
        eyebrow="TRANSPARÊNCIA & RASTREABILIDADE"
        title={
          user.role === "global_admin"
            ? "Histórico global"
            : "Histórico da unidade"
        }
        subtitle="Consulte publicações e alterações registradas."
      />
      {user.role === "global_admin" && (
        <div className="tablefilters">
          <Field label="Unidade do evento">
            <select value={unit} onChange={(e) => setUnitFilter(e.target.value)}>
              <option value="">Todas as unidades</option>
              {d.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <section className="panel">
        <div className="sectionheading"><h2>Publicações · Copiar escala</h2></div>
        {publications.map(records => { const p = records[0]; return <div className="publicationrow" key={p.publicationId || [p.unitId, p.date, p.shift, p.teamId].join("|")}>
          <span><b>{d.units.find(u => u.id === p.unitId)?.name}</b><br />{dateLabel(p.date)} · {p.workRegime === "24h" ? "Diurno e noturno" : shiftLabel(p.shift)} · {records.some(r => r.workAssignments) ? "Jornadas individuais" : regimeLabel(p.workRegime)}{p.teamId && ` · Equipe ${d.teams.find(t => t.id === p.teamId)?.name}`} · {new Set(records.map(r => r.roleId)).size} cargos</span>
          <div className="rowactions"><button className="btn" onClick={() => {
            if (p.unitId !== s.activeUnitId) { setCopy(records); return; }
            try { copyPublication(d, s, records); nav("/escala", { state: { publication: records } }); } catch (e) { toast((e as Error).message); }
          }}><Copy size={16} /> Copiar escala</button>
          <button className="btn" onClick={() => setPublication({ records, mode: "view" })}><Eye size={16} /> Visualizar escala</button>
          <button className="btn" onClick={() => setPublication({ records, mode: "partial" })}>Copiar selecionados</button></div>
        </div>; })}
        {!publications.length && <Empty text="Nenhuma publicação disponível." />}
      </section>
      {publication && <PublicationModal {...publication} close={() => setPublication(null)} />}
      {copy && <Confirm title="Trocar a unidade ativa para copiar?" onClose={() => setCopy(null)} onConfirm={() => {
        const unitId = copy[0].unitId;
        try { copyPublication(d, { ...s, activeUnitId: unitId }, copy); setUnit(unitId); nav("/escala", { state: { publication: copy } }); } catch (e) { toast((e as Error).message); }
        setCopy(null);
      }}>A publicação pertence a {d.units.find(u => u.id === copy[0].unitId)?.name}. Confirme a troca explícita da unidade ativa. A origem será preservada.</Confirm>}
      <section className="panel">
        <div className="sectionheading">
          <h2>Linha do tempo</h2>
          <Badge tone="neutral">{events.length} eventos</Badge>
        </div>
        <div className="timeline">
          {events.slice(0, 100).map((e) => (
            <div className="timelineitem" key={e.id}>
              <span className="timelineicon">
                {e.entity === "Profissional" ? (
                  <UserRound size={18} />
                ) : e.action === "Publicar" ? (
                  <Send size={18} />
                ) : (
                  <History size={18} />
                )}
              </span>
              <div>
                <div className="labelrow">
                  <b>
                    {e.action} <span className="muted">· {e.entity}</span>
                  </b>
                  <small>{timeLabel(e.timestamp)}</small>
                </div>
                <p>
                  {e.actor} · {d.units.find((u) => u.id === e.unitId)?.name}
                </p>
                <small>
                  {e.action === "Publicar"
                    ? "Uma nova versão foi disponibilizada no dashboard."
                    : e.entity === "Profissional"
                      ? "Cadastro atualizado na simulação. Registros anteriores preservados."
                      : "Alteração registrada no histórico."}
                </small>
              </div>
              <div className="rowactions">
              {e.entity === "Escala" && e.action === "Publicar" && !!e.after && typeof e.after === "object" &&
                "professionalIds" in e.after && <button className="btn" onClick={() => {
                  const record = e.after as Schedule;
                  const version = record.publicationId ? d.events.flatMap(item => {
                    if (item.unitId !== e.unitId || item.action !== "Publicar" || !item.after
                      || typeof item.after !== "object" || !("publicationId" in item.after)
                      || item.after.publicationId !== record.publicationId) return [];
                    return [item.after as Schedule];
                  }) : [record];
                  setPublication({ records: version.length ? version : [record], mode: "view" });
                }}><Eye size={16} /> Visualizar escala</button>}
              <button className="btn" onClick={() => setDetail(e)}>
                Detalhes
                <ChevronRight size={14} />
              </button>
              </div>
            </div>
          ))}
          {!events.length && (
            <Empty text="Nenhuma alteração registrada nesta unidade." />
          )}
        </div>
        {events.length > 100 && (
          <p className="muted">
            Mostrando os 100 eventos mais recentes. Refine por unidade.
          </p>
        )}
      </section>
      {detail && (
        <Modal
          title={detail.action + " · " + detail.entity}
          onClose={() => setDetail(null)}
        >
          <div className="modalbody">
            <p>
              {detail.actor} · {timeLabel(detail.timestamp)}
            </p>
            <div className="beforeafter">
              <div>
                <h3>Antes</h3>
                <Snapshot value={detail.before} />
              </div>
              <div>
                <h3>Depois</h3>
                <Snapshot value={detail.after} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function Snapshot({ value }: { value: unknown }) {
  const { d } = useApp();
  if (!value) return <p className="muted">Sem registro anterior.</p>;
  if (typeof value === "string") return <p>{value}</p>;
  const v = value as Record<string, unknown>;
  return (
    <div className="snapshot">
      {Object.entries(v)
        .filter(([k]) => !["id", "updatedAt", "specialty"].includes(k))
        .map(([k, x]) => (
          <div key={k}>
            <b>
              {{
                unitId: "Unidade",
                date: "Data",
                shift: "Turno",
                teamId: "Equipe",
                roleId: "Cargo",
                professionalIds: "Profissionais",
                status: "Status",
                version: "Versão",
                fullName: "Nome",
                active: "Ativo",
                team: "Equipe",
                members: "Composição",
                email: "E-mail",
                displayName: "Nome",
                role: "Perfil",
                unitIds: "Unidades",
                name: "Nome",
              }[k] || k}
            </b>
            <span>
              {Array.isArray(x)
                ? x
                    .map((item) =>
                      typeof item === "string"
                        ? d.professionals.find((p) => p.id === item)
                            ?.fullName ||
                          d.units.find((u) => u.id === item)?.name ||
                          item
                        : JSON.stringify(item),
                    )
                    .join(", ") || "Vazio"
                : typeof x === "boolean"
                  ? x
                    ? "Sim"
                    : "Não"
                  : typeof x === "object"
                    ? JSON.stringify(x)
                    : k === "unitId"
                      ? d.units.find((u) => u.id === x)?.name
                      : k === "roleId"
                        ? d.roles.find((r) => r.id === x)?.name
                        : k === "teamId"
                          ? "Equipe " + d.teams.find((t) => t.id === x)?.name
                          : k === "shift"
                            ? shiftLabel(x as Shift)
                            : k === "status"
                              ? x === "draft"
                                ? "Rascunho"
                                : "Publicada"
                              : String(x ?? "—")}
            </span>
          </div>
        ))}
    </div>
  );
}
const cleanupLabels: Record<string, string> = {
  professionals: "Profissionais", links: "Vínculos", teams: "Equipes", members: "Integrantes",
  schedules: "Escalas", published: "Publicações", events: "Histórico",
};

function CleanupPanel() {
  const { d, s, change, toast } = useApp();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewLegacyCleanup>> & { snapshot: string }>();
  const [exported, setExported] = useState(false);
  const current = preview?.snapshot === JSON.stringify(d);
  return <section className="panel integration-panel">
    <h2>Limpeza de dados de exemplo</h2>
    <p>A prévia só inclui registros que correspondem aos exemplos originais. Revise as quantidades e exporte uma cópia antes de excluir.</p>
    <button className="btn" onClick={async () => {
      setExported(false);
      try { setPreview({ ...await previewLegacyCleanup(d), snapshot: JSON.stringify(d) }); }
      catch { toast("Não foi possível preparar a prévia de limpeza."); }
    }}>Revisar exclusões</button>
    {preview && current && <div>
      <ul>{Object.entries(preview.counts).map(([key, count]) => <li key={key}>{cleanupLabels[key]}: {count}</li>)}</ul>
      <button className="btn" onClick={() => {
        const url = URL.createObjectURL(new Blob([preview.snapshot], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "painel-escala-recuperacao.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExported(true);
      }}>Exportar cópia de recuperação</button>
      <button className="btn" disabled={!exported || !Object.values(preview.counts).some(Boolean)} onClick={() => {
        if (change(next => {
          admin(next, s);
          if (JSON.stringify(next) !== preview.snapshot) throw Error("Os dados mudaram. Refaça a prévia.");
          Object.assign(next, preview.cleaned);
        }, "Dados de exemplo removidos.")) setPreview(undefined);
      }}>Confirmar exclusão dos exemplos</button>
    </div>}
    {preview && !current && <p>Os dados mudaram. Refaça a prévia.</p>}
  </section>;
}

function Administration() {
  const { d, s, user, change } = useApp();
  const [tab, setTab] = useState("units");
  const [accessUnit, setAccessUnit] = useState("");
  const [unit, setUnit] = useState<Unit | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [confirm, setConfirm] = useState<UserAccess | null>(null);
  if (user.role !== "global_admin")
    return (
      <section className="panel denied">
        <ShieldCheck size={36} />
        <h1>Acesso restrito</h1>
        <p>Esta página está disponível apenas para o administrador geral.</p>
        <Link to="/escala" className="btn primary">
          Voltar à escala
        </Link>
      </section>
    );
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRAÇÃO GERAL"
        title="Uma visão de toda a rede"
        subtitle="Gerencie unidades e perfis fictícios de acesso em um único lugar."
      />
      <div className="callout">
        <ShieldCheck size={19} />
        <span>
          Na produção, essas regras deverão ser verificadas no backend e no
          banco de dados
        </span>
      </div>
      <div className="tabs">
        <button
          className={tab === "units" ? "active" : ""}
          onClick={() => setTab("units")}
        >
          <Building2 size={17} />
          Unidades
        </button>
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          <Users size={17} />
          Perfis de acesso
        </button>
      </div>
      <section className="panel">
        <div className="sectionheading">
          <div>
            <h2>
              {tab === "units" ? "Unidades fictícias" : "Associações de acesso"}
            </h2>

          </div>
          <button
            className="btn primary"
            onClick={() =>
              tab === "units"
                ? setUnit({ id: crypto.randomUUID(), name: "", active: true })
                : setAccess({
                    id: crypto.randomUUID(),
                    email: "",
                    displayName: "",
                    role: "unit_manager",
                    unitIds: [s.activeUnitId],
                    active: true,
                  })
            }
          >
            <Plus size={16} />
            {tab === "units" ? "Cadastrar unidade" : "Autorizar usuário"}
          </button>
        </div>
        {tab === "users" && <div className="tablefilters">
          <select aria-label="Filtrar acessos por unidade" value={accessUnit} onChange={e => setAccessUnit(e.target.value)}>
            <option value="">Todas as unidades</option>
            {d.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>}
        <div className="tablewrap">
          {tab === "units" ? (
            <table>
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Profissionais ativos</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {d.units.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                      <small>Unidade fictícia</small>
                    </td>
                    <td>{available(d, u.id).length}</td>
                    <td>
                      <Badge tone={u.active ? "green" : "neutral"}>
                        {u.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </td>
                    <td>
                      <button className="btn" onClick={() => setUnit({ ...u })}>
                        <Pencil size={15} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Usuário / E-mail</th>
                  <th>Perfil</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {d.users.filter(u => !accessUnit || u.role === "global_admin" || u.unitIds.includes(accessUnit)).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.displayName}</b>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      {u.role === "global_admin"
                        ? "Administrador geral"
                        : "Gestor de unidade"}
                    </td>
                    <td>
                      {u.role === "global_admin" ? "Todas as unidades" : u.unitIds
                        .map((id) => d.units.find((x) => x.id === id)?.name)
                        .join(", ")}
                    </td>
                    <td>
                      <Badge tone={u.active ? "green" : "neutral"}>
                        {u.active ? "Ativo" : "Revogado"}
                      </Badge>
                    </td>
                    <td>
                      <div className="rowactions">
                        <button
                          aria-label={"Editar acesso de " + u.displayName}
                          onClick={() => setAccess({ ...u })}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={"Alterar acesso de " + u.displayName}
                          onClick={() => setConfirm(u)}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <CleanupPanel />
      {unit && (
        <Modal
          title={
            d.units.some((u) => u.id === unit.id)
              ? "Editar unidade"
              : "Cadastrar unidade"
          }
          onClose={() => setUnit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (change((x) => saveUnit(x, s, unit))) setUnit(null);
            }}
          >
            <div className="modalbody">
              <Field label="Nome da unidade fictícia *">
                <input
                  required
                  value={unit.name}
                  onChange={(e) => setUnit({ ...unit, name: e.target.value })}
                />
              </Field>
              <label className="checklabel">
                <input
                  type="checkbox"
                  checked={unit.active}
                  onChange={(e) =>
                    setUnit({ ...unit, active: e.target.checked })
                  }
                />
                Unidade ativa
              </label>
              <p className="muted">
                Desativar preserva cadastros e histórico. A unidade ativa no
                cabeçalho não pode ser desativada.
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="btn"
                onClick={() => setUnit(null)}
              >
                Cancelar
              </button>
              <button className="btn primary">Salvar unidade</button>
            </footer>
          </form>
        </Modal>
      )}
      {access && (
        <Modal
          title="Autorizar usuário"
          onClose={() => setAccess(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (change((x) => saveAccess(x, s, access))) setAccess(null);
            }}
          >
            <div className="modalbody formgrid">
              <Field label="Nome">
                <input
                  required
                  value={access.displayName}
                  onChange={(e) =>
                    setAccess({ ...access, displayName: e.target.value })
                  }
                />
              </Field>
              <Field label="E-mail @exemplo.com *">
                <input
                  required
                  type="email"
                  pattern="[^@\s]+@exemplo\.com"
                  placeholder="nome@exemplo.com"
                  value={access.email}
                  onChange={(e) =>
                    setAccess({ ...access, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Perfil">
                <select
                  value={access.role}
                  onChange={(e) =>
                    setAccess({
                      ...access,
                      role: e.target.value as UserAccess["role"],
                      unitIds:
                        e.target.value === "global_admin"
                          ? d.units.filter((u) => u.active).map((u) => u.id)
                          : [s.activeUnitId],
                    })
                  }
                >
                  <option value="unit_manager">Gestor de unidade</option>
                  <option value="global_admin">Administrador geral</option>
                </select>
              </Field>
              <fieldset className="access-units">
                <legend>Unidades vinculadas</legend>
                {d.units.filter(u => u.active).map(u => <label className="checklabel" key={u.id}>
                  <input type="checkbox" checked={access.unitIds.includes(u.id)}
                    disabled={access.role === "global_admin"}
                    onChange={e => setAccess({ ...access, unitIds: e.target.checked
                      ? [...access.unitIds, u.id] : access.unitIds.filter(id => id !== u.id) })} />
                  {u.name}
                </label>)}
              </fieldset>
              <p className="muted small">
                Use somente e-mails fictícios.
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="btn"
                onClick={() => setAccess(null)}
              >
                Cancelar
              </button>
              <button className="btn primary">Salvar associação</button>
            </footer>
          </form>
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={confirm.active ? "Revogar acesso?" : "Reativar acesso?"}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (
              change((x) =>
                saveAccess(x, s, { ...confirm, active: !confirm.active }),
              )
            )
              setConfirm(null);
          }}
        >
          {confirm.email}
          <p>A alteração será registrada no histórico.</p>
        </Confirm>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter>
      <App />
    </AppRouter>
  </React.StrictMode>,
);
