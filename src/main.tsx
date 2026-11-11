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
  ArrowUpRight,
  ChevronRight,
  Search,
  Plus,
  Check,
  X,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  RotateCcw,
  Monitor,
  Save,
  Send,
  UserRound,
  ClipboardList,
  Activity,
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
} from "./models";
import { seed } from "./seed";
import {
  STORAGE_KEY,
  key,
  available,
  publishAssembly,
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
const baseUrl = import.meta.env.BASE_URL;
const AppRouter = baseUrl === "/" ? BrowserRouter : HashRouter;
const dashboardUrl = `${baseUrl}${baseUrl === "/" ? "dashboard" : "#/dashboard"}`;
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
    if (x?.published && x?.links && x?.users) return x;
  } catch {}
  return seed();
}
type Ctx = {
  d: Data;
  s: Session;
  user: UserAccess;
  unit: Unit;
  change: (f: (d: Data) => void, msg?: string) => boolean;
  setUnit: (id: string) => void;
  login: (role: string) => void;
  logout: () => void;
  toast: (v: string) => void;
};
const Context = createContext<Ctx>(null!);
const useApp = () => useContext(Context);
function App() {
  const [d, setD] = useState(load);
  const [s, setS] = useState<Session>(() => {
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
  useEffect(() => {
    sessionStorage.setItem("rio-session", JSON.stringify(s));
  }, [s]);
  useEffect(() => {
    const fn = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setD(load());
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
    msg = "Alterações salvas na demonstração.",
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
  const login = (role: string) => {
    const u = d.users.find(
      (u) =>
        u.role === role &&
        u.active &&
        u.unitIds.some((id) => d.units.some((x) => x.id === id && x.active)),
    );
    if (!u) {
      setNotice("Nenhum perfil ativo disponível. Restaure a demonstração.");
      return;
    }
    setS({
      userId: u.id,
      activeUnitId: u.unitIds.find((id) =>
        d.units.some((x) => x.id === id && x.active),
      )!,
    });
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
            user?.role === "global_admin" &&
            d.units.some((u) => u.id === id && u.active)
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
          <span className="eyebrow">RIO SAÚDE · DEMONSTRAÇÃO</span>
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
function Restore() {
  const { toast, logout } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="restore" onClick={() => setOpen(true)}>
        <RotateCcw size={15} />
        Restaurar demonstração
      </button>
      {open && (
        <Confirm
          title="Restaurar demonstração?"
          onClose={() => setOpen(false)}
          onConfirm={() => {
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("rio-session");
            logout();
            toast("Demonstração restaurada.");
            window.location.assign(baseUrl);
          }}
        >
          Todos os dados locais serão substituídos pelo seed original. Esta ação
          remove as alterações feitas nesta demonstração.
        </Confirm>
      )}
    </>
  );
}
function Login() {
  const { login, user } = useApp();
  const nav = useNavigate();
  return (
    <div className="login">
      <div className="loginart">
        <div className="brand">
          <span className="brandicon">
            <Activity />
          </span>
          <span>
            Rio Saúde<small>Protótipo de Escalas</small>
          </span>
        </div>
        <Badge tone="cyan">DEMONSTRAÇÃO</Badge>
        <div>
          <span className="eyebrow">MAIS ORGANIZAÇÃO. MAIS CUIDADO.</span>
          <h1>
            Uma nova forma
            <br />
            de planejar
            <br />
            <em>quem cuida.</em>
          </h1>
          <p>
            Equipes, profissionais e escalas em um só lugar.
            <br />
            Um fluxo simples para uma gestão mais próxima.
          </p>
          <div className="loginvisual">
            <CalendarDays size={32} />
            <div>
              <b>Clareza para cada plantão</b>
              <p>Da equipe padrão à escala publicada.</p>
            </div>
            <Check size={22} />
          </div>
        </div>
        <small>Identidade ilustrativa · Este não é um portal oficial</small>
      </div>
      <div className="loginform">
        <div>
          <Badge>AMBIENTE DE APRESENTAÇÃO</Badge>
          <h2>Bem-vindo ao protótipo</h2>
          <p>Escolha um perfil para explorar a experiência.</p>
          <button
            className="profilecard"
            onClick={() => {
              login("global_admin");
              nav("/escala");
            }}
          >
            <ShieldCheck />
            <span>
              <b>Entrar como administrador geral</b>
              <small>Visão de todas as unidades e gestão de acessos</small>
            </span>
            <ChevronRight />
          </button>
          <button
            className="profilecard"
            onClick={() => {
              login("unit_manager");
              nav("/escala");
            }}
          >
            <Building2 />
            <span>
              <b>Entrar como gestor de unidade</b>
              <small>Gestão local · CER BARRA</small>
            </span>
            <ChevronRight />
          </button>
          {user && <Link to="/escala">Continuar sessão demonstrativa →</Link>}
          <div className="callout">
            <Info size={19} />
            <div>
              <b>Simulação de acesso - sem autenticação real</b>
              <p>Acesso demonstrativo, não adequado a dados reais</p>
            </div>
          </div>
          <p className="muted small">
            Login Google é um objetivo futuro, não implementado no MVP. Todos os
            nomes e registros desta experiência são fictícios.
          </p>
          <Restore />
        </div>
      </div>
    </div>
  );
}
import { Outlet } from "react-router-dom";
const navItems = [
  ["/escala", "Montagem de escala", CalendarDays],
  ["/cadastros", "Profissionais", Users],
  ["/equipes", "Equipes padrão", LayoutGrid],
  ["/historico", "Histórico", History],
  ["/administracao", "Administração geral", Building2],
] as const;
function Layout() {
  const { user, unit, d, s, setUnit, logout } = useApp();
  const [mobile, setMobile] = useState(false);
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
    <div className="app">
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
        <Link to="/" className="brand" onClick={(e) => guarded(e, "/")}>
          <span className="brandicon">
            <Activity />
          </span>
          <span>
            Rio Saúde<small>Protótipo de Escalas</small>
          </span>
        </Link>
        <span className="demo-label">DEMONSTRAÇÃO</span>
        <div className="navcaption">GESTÃO DE ESCALAS</div>
        <nav>
          {navItems
            .filter(
              ([p]) => p !== "/administracao" || user.role === "global_admin",
            )
            .map(([path, name, Icon]) => (
              <NavLink
                key={path}
                to={path}
                onClick={(e) => {
                  guarded(e, path);
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                {name}
                <ChevronRight size={14} />
              </NavLink>
            ))}
        </nav>
        <div className="sidebarbottom">
          <div className="dashboardlink">
            <Monitor size={23} />
            <b>Escalas em tempo real</b>
            <p>Veja as versões publicadas em um painel independente.</p>
            <a href={dashboardUrl} target="_blank" rel="noreferrer">
              Abrir dashboard <ArrowUpRight size={16} />
            </a>
          </div>
          <Restore />
          <small>Protótipo - não utilizar para operação real</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="iconbtn mobiletoggle"
              aria-label="Abrir navegação"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span>Gestão de escalas</span>
            <ChevronRight size={14} />
            <b>{navItems.find(([p]) => p === loc.pathname)?.[1]}</b>
          </div>
          <div className="topactions">
            <Building2 size={17} />
            {user.role === "global_admin" ? (
              <select
                aria-label="Unidade ativa"
                value={s.activeUnitId}
                onChange={(e) => {
                  if (dirty()) {
                    setPending("unit:" + e.target.value);
                  } else setUnit(e.target.value);
                }}
              >
                {d.units
                  .filter((u) => u.active)
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
              title="Alternar perfil / sair"
              aria-label="Alternar perfil"
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
        <footer className="appfooter">
          <span>Simulação de acesso - sem autenticação real</span>
          <span>Acesso demonstrativo, não adequado a dados reais</span>
        </footer>
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
function SchedulePage() {
  const { d, s, unit, change, toast } = useApp();
  const location = useLocation();
  const roles = d.roles.filter(r => r.active);
  const fresh = (): Assembly => ({ unitId: s.activeUnitId, date: todaySaoPaulo(), shift: "day",
    teamId: d.teams.find(t => t.unitId === s.activeUnitId && t.active)?.id || "", selections: {}, confirmed: {} });
  const [draft, setDraft] = useState<Assembly>(fresh);
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [publish, setPublish] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const dirty = Object.keys(draft.selections).length > 0 || Object.keys(draft.confirmed).length > 0;
  const reset = () => { setDraft(fresh()); setIndex(0); setSearch(""); setPublish(false); setPending(null); setCopyNotice(""); };
  useEffect(() => {
    const source = (location.state as { publication?: Schedule[] } | null)?.publication;
    if (!source) return;
    window.history.replaceState({ ...window.history.state, usr: null }, "");
    try {
      const result = copyPublication(d, s, source);
      setDraft(result.assembly); setIndex(0);
      setCopyNotice(result.ignored.length ? "Nomes desconsiderados: " + result.ignored.join(", ") : "Publicação copiada. Confirme todos os cargos antes de publicar.");
    } catch (e) { toast((e as Error).message); }
  }, [location.key]);
  useEffect(() => {
    const check = () => {
      if (todaySaoPaulo() !== draft.date) {
        reset(); toast("O dia mudou em São Paulo. A montagem foi reiniciada para o dia atual.");
      }
    };
    const unload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    const timer = window.setInterval(check, 1000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    window.addEventListener("beforeunload", unload);
    return () => { clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); window.removeEventListener("beforeunload", unload); };
  }, [draft.date, dirty]);
  const guard = (fn: () => void) => dirty ? setPending(() => fn) : fn();
  const parameter = (value: Partial<Assembly>) => guard(() => { setDraft({ ...fresh(), shift: draft.shift, teamId: draft.teamId, ...value }); setIndex(0); setSearch(""); setCopyNotice(""); });
  const role = roles[index];
  const ids = draft.selections[role?.id] || [];
  const all = role ? available(d, s.activeUnitId, role.id) : [];
  const visible = all.filter(p => p.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const update = (next: string[]) => setDraft(x => ({ ...x, selections: { ...x.selections, [role.id]: next }, confirmed: { ...x.confirmed, [role.id]: false } }));
  const move = (i: number) => { setIndex(i); setSearch(""); };
  const ready = roles.length > 0 && roles.every(r => draft.confirmed[r.id]) && roles.some(r => draft.selections[r.id]?.length) && !!draft.teamId;
  return <div data-dirty={dirty}>
    <PageTitle eyebrow="PLANEJAMENTO ASSISTENCIAL · DADOS FICTÍCIOS" title="Montagem de escala" subtitle="Confirme cada cargo e publique o plantão completo ao final.">
      <a className="btn" href={dashboardUrl} target="_blank" rel="noreferrer"><Monitor size={17} /> Abrir dashboard</a>
    </PageTitle>
    <div className="stats assemblystats">
      <Stat icon={<Building2 />} label="Unidade em gestão" value={unit.name} note="Unidade fictícia de demonstração" />
      <Stat icon={<Users />} label="Profissionais ativos" value={available(d, s.activeUnitId).length} note="Disponíveis para compor escalas" />
      <Stat icon={<LayoutGrid />} label="Equipes padrão" value={d.teams.filter(t => t.unitId === s.activeUnitId && t.active).length} note="Modelos preservados" />
    </div>
    {copyNotice && <p role="status" className="callout">{copyNotice}</p>}
    <section className="panel">
      <div className="sectionheading"><h2>Defina o plantão</h2><Badge>Etapa {roles.length ? index + 1 : 0} de {roles.length}</Badge></div>
      <div className="filters">
        <Field label="Unidade"><div className="readonly">{unit.name}</div></Field>
        <Field label="Data do plantão · São Paulo"><div className="readonly">{dateLabel(draft.date)}</div></Field>
        <Field label="Turno"><select aria-label="Turno" value={draft.shift} onChange={e => parameter({ shift: e.target.value as Shift })}><option value="day">Diurno · 07h–19h</option><option value="night">Noturno · 19h–07h</option></select></Field>
        <Field label="Equipe"><select aria-label="Equipe" value={draft.teamId} onChange={e => parameter({ teamId: e.target.value })}><option value="" disabled>Selecione uma equipe</option>{d.teams.filter(t => t.unitId === s.activeUnitId && t.active).map(t => <option key={t.id} value={t.id}>Equipe {t.name}</option>)}</select></Field>
      </div>
      <div className="rolearea"><div className="rolegrid">{roles.map((r, i) => <button key={r.id} disabled={i !== index && !draft.confirmed[r.id] && i > index} aria-current={i === index ? "step" : undefined} className={"rolecard " + (i === index ? "selected " : "") + (draft.confirmed[r.id] ? "confirmed" : "")} onClick={() => move(i)}>
        <b>{r.name}</b><span>{i === index ? "Cargo atual · " : ""}{draft.confirmed[r.id] ? (draft.selections[r.id]?.length ? `${draft.selections[r.id].length} profissionais · Confirmado` : "Nenhum profissional · Confirmado") : "Pendente"}</span>{draft.confirmed[r.id] && <Check size={20} />}
      </button>)}</div></div>
    </section>
    {role ? <section className="panel peoplepanel">
      <div className="sectionheading"><div><h2>{role.name}</h2><p>{ids.length} profissionais selecionados</p></div>
        <button className="btn" disabled={!draft.teamId} onClick={() => {
          const load = () => update(d.members.filter(m => m.teamId === draft.teamId && m.roleId === role.id && all.some(p => p.id === m.professionalId)).map(m => m.professionalId));
          if (ids.length) setPending(() => load); else load();
        }}><RotateCcw size={16} /> Carregar equipe padrão</button>
      </div>
      <div className="searchbox"><Search size={17} /><input aria-label="Pesquisar profissional" value={search} placeholder="Pesquisar profissional pelo nome..." onChange={e => setSearch(e.target.value)} /></div>
      <div className="selectiontools"><button onClick={() => update([...new Set([...ids, ...visible.map(p => p.id)])])}>Selecionar todos visíveis</button><button onClick={() => update([])}>Limpar seleção</button></div>
      <div className="peoplelist">{visible.map(p => <label key={p.id} className={"person " + (ids.includes(p.id) ? "checked" : "")}><input type="checkbox" checked={ids.includes(p.id)} onChange={() => update(ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])} /><span><b>{p.fullName}</b><small>{p.specialty}</small></span></label>)}{!visible.length && <Empty text="Nenhum profissional encontrado para este cargo ou pesquisa." />}</div>
      <p className="listnote">A confirmação mantém a seleção nesta montagem. O dashboard só muda após a publicação final.</p>
    </section> : <Empty text="Cadastre ao menos um cargo ativo para montar a escala." />}
    <div className="savebar"><div>{roles.filter(r => draft.confirmed[r.id]).length} de {roles.length} cargos confirmados</div><div>
      <button className="btn" onClick={() => guard(reset)}>Reiniciar montagem</button>
      <button className="btn" disabled={index === 0} onClick={() => move(index - 1)}>Voltar</button>
      <button className="btn" disabled={!role || !draft.teamId} onClick={() => setDraft(x => ({ ...x, confirmed: { ...x.confirmed, [role.id]: true } }))}><Check size={16} />{ids.length ? "Confirmar cargo" : "Confirmar: Nenhum profissional para este cargo"}</button>
      {index < roles.length - 1 && <button className="btn primary" disabled={!draft.confirmed[role?.id]} onClick={() => move(index + 1)}>Próximo <ChevronRight size={16} /></button>}
      {role && index === roles.length - 1 && <button className="btn primary" disabled={!ready} onClick={() => setPublish(true)}><Send size={16} /> Publicar escala</button>}
    </div></div>
    {pending && <Confirm title="Substituir a montagem ou seleção atual?" onClose={() => setPending(null)} onConfirm={() => { pending(); setPending(null); }}>As seleções afetadas serão descartadas. Deseja continuar?</Confirm>}
    {publish && <Confirm title="Publicar escala completa?" onClose={() => setPublish(false)} onConfirm={() => {
      if (todaySaoPaulo() !== draft.date) { reset(); toast("O dia mudou. Revise a nova montagem."); return; }
      if (change(x => publishAssembly(x, s, draft), "Escala completa publicada. O dashboard recebeu a nova composição.")) reset();
      else setPublish(false);
    }}><p>{unit.name} · {dateLabel(draft.date)} · {shiftLabel(draft.shift)} · Equipe {d.teams.find(t => t.id === draft.teamId)?.name}</p><ul>{roles.map(r => <li key={r.id}>{r.name}: {draft.selections[r.id]?.length || 0} profissionais</li>)}</ul></Confirm>}
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
            specialty: "",
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
          Todos os registros são fictícios. Desativar um profissional preserva
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
                <th>Especialidade</th>
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
                  <td>{p.specialty || "—"}</td>
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
              <Field label="Especialidade (opcional)">
                <input
                  value={edit.specialty || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, specialty: e.target.value })
                  }
                />
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
  const [ids, setIds] = useState<string[]>([]);
  const [turn, setTurn] = useState("");
  const [role, setRole] = useState("");
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
            <div className="sectionheading">
              <span className="teamletter">{t.name.slice(0, 2)}</span>
              <div>
                <h2>Equipe {t.name}</h2>
                <p>{t.shift ? shiftLabel(t.shift) : "Diurno e noturno"}</p>
              </div>
              <Badge tone="neutral">Modelo</Badge>
            </div>
            <div className="teamroles">
              {d.roles.map((r) => {
                const members = d.members.filter(
                  (m) => m.teamId === t.id && m.roleId === r.id,
                );
                return (
                  <div key={r.id}>
                    <span>{r.name}</span>
                    <b>{members.length.toString().padStart(2, "0")}</b>
                    <small>
                      {members
                        .map(
                          (m) =>
                            d.professionals.find(
                              (p) => p.id === m.professionalId,
                            )?.fullName,
                        )
                        .join(" · ") || "Sem composição"}
                    </small>
                  </div>
                );
              })}
            </div>
            <button className="btn" onClick={() => open(t)}>
              <Pencil size={16} />
              Editar equipe
            </button>
          </section>
        ))}
      </div>
      {!teams.length && (
        <Empty text="Nenhuma equipe cadastrada. Crie um modelo para começar." />
      )}
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
function HistoryPage() {
  const { d, s, user, setUnit, toast } = useApp();
  const [unit, setUnitFilter] = useState("");
  const nav = useNavigate();
  const [copy, setCopy] = useState<Schedule[] | null>(null);
  const publications = Object.values(d.published.filter(x => user.role === "global_admin" ? (!unit || x.unitId === unit) : x.unitId === s.activeUnitId).reduce<Record<string, Schedule[]>>((groups, x) => {
    const k = [x.unitId, x.date, x.shift, x.teamId].join("|");
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
        subtitle="Cada mudança tem uma história. Acompanhe o que aconteceu na demonstração."
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
        {publications.map(records => { const p = records[0]; return <div className="publicationrow" key={[p.unitId, p.date, p.shift, p.teamId].join("|")}>
          <span><b>{d.units.find(u => u.id === p.unitId)?.name}</b><br />{dateLabel(p.date)} · {shiftLabel(p.shift)} · Equipe {d.teams.find(t => t.id === p.teamId)?.name} · {records.length} cargos</span>
          <button className="btn" onClick={() => {
            if (p.unitId !== s.activeUnitId) { setCopy(records); return; }
            try { copyPublication(d, s, records); nav("/escala", { state: { publication: records } }); } catch (e) { toast((e as Error).message); }
          }}><Copy size={16} /> Copiar escala</button>
        </div>; })}
        {!publications.length && <Empty text="Nenhuma publicação disponível." />}
      </section>
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
                      : "Alteração registrada no estado local da demonstração."}
                </small>
              </div>
              <button className="btn" onClick={() => setDetail(e)}>
                Detalhes
                <ChevronRight size={14} />
              </button>
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
        .filter(([k]) => !["id", "updatedAt"].includes(k))
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
                specialty: "Especialidade",
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
function Administration() {
  const { d, s, user, change } = useApp();
  const [tab, setTab] = useState("units");
  const [unit, setUnit] = useState<Unit | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [confirm, setConfirm] = useState<UserAccess | null>(null);
  if (user.role !== "global_admin")
    return (
      <section className="panel denied">
        <ShieldCheck size={36} />
        <h1>Acesso restrito na simulação</h1>
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
            <p>Gerenciamento exclusivamente demonstrativo</p>
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
                {d.users.map((u) => (
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
                      {u.unitIds
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
          title="Autorizar usuário demonstrativo"
          onClose={() => setAccess(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (change((x) => saveAccess(x, s, access))) setAccess(null);
            }}
          >
            <div className="modalbody formgrid">
              <Field label="Nome fictício *">
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
              <Field label="Unidade vinculada">
                <select
                  disabled={access.role === "global_admin"}
                  value={access.unitIds[0] || ""}
                  onChange={(e) =>
                    setAccess({ ...access, unitIds: [e.target.value] })
                  }
                >
                  {d.units
                    .filter((u) => u.active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </Field>
              <p className="muted small">
                Associação visual na simulação. Não envia e-mails e não cria
                autenticação real.
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
          <p>A alteração afeta apenas o perfil fictício nesta demonstração.</p>
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
