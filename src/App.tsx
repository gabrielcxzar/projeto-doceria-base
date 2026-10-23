import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { registerSW } from "virtual:pwa-register";
import {
  ArrowDownToLine,
  BarChart3,
  CalendarDays,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShoppingBag,
  Sun,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import {
  auth,
  completeBackup,
  friendlyError,
  login,
  logout,
  mutate,
  profileFor,
  subscribeData,
} from "./firebase";
import { BusinessContext } from "./context";
import type { EditorKind } from "./context";
import { collections, emptyData } from "./types";
import type {
  CollectionName,
  DataStore,
  Entity,
  Mutation,
  UserProfile,
} from "./types";
import { encodeBackup, today, versionOf } from "./domain";
import { demoData } from "./demo";
import Editor from "./editors";
import {
  Catalog,
  Charges,
  Dashboard,
  Finance,
  Orders,
  Reports,
  Sales,
} from "./pages";
import { Button, DownloadFile, Field, Modal } from "./ui";
import { BrandLogo } from "./BrandLogo";

const nav = [
  {
    id: "dashboard",
    title: "Visão geral",
    icon: LayoutDashboard,
    subtitle: "Um olhar simples para o dia da sua doceria.",
  },
  {
    id: "vendas",
    title: "Vendas",
    icon: ShoppingBag,
    subtitle: "Do balcão ao recebimento, cada venda no lugar.",
  },
  {
    id: "encomendas",
    title: "Encomendas",
    icon: CalendarDays,
    subtitle: "Uma agenda para preparar, entregar e encantar.",
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    subtitle: "Entradas, despesas e o movimento do seu caixa.",
  },
  {
    id: "cadastros",
    title: "Cadastros",
    icon: Package,
    subtitle: "Clientes, produtos e o cuidado com cada receita.",
  },
  {
    id: "cobrancas",
    title: "Cobranças",
    icon: ReceiptText,
    subtitle: "Organize o que falta receber, com atenção a cada cliente.",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: BarChart3,
    subtitle: "Os detalhes que ajudam a decidir o próximo passo.",
  },
];
const demoMode = import.meta.env.DEV
  ? new URLSearchParams(location.search).get("demo")
  : null;
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function App() {
  const [data, setData] = useState<DataStore>(emptyData);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [page, setPage] = useState(
    nav.some((n) => n.id === location.hash.slice(1))
      ? location.hash.slice(1)
      : "dashboard",
  );
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [menu, setMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* A preferência não deve impedir a navegação. */
    }
  }, [sidebarCollapsed]);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 900px)");
    const change = () => {
      setCompact(query.matches);
      setMenu(false);
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!compact || !menu) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(sidebar.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), [tabindex="0"]',
    )).filter((element) => element.getClientRects().length > 0);
    controls()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      } else if (event.key === "Tab") {
        const elements = controls();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButtonRef.current?.focus({ preventScroll: true });
    };
  }, [compact, menu]);
  const [editor, setEditor] = useState<{
    kind: EditorKind;
    record?: Entity;
  } | null>(null);
  const [deleting, setDeleting] = useState<{
    collection: CollectionName;
    record: Entity;
    description: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* Preferência visual não deve impedir uso. */
    }
  }, [dark]);
  const updateApp = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const canWrite = !!profile && profile.role === "admin" && online && !busy;
  function notify(message: string, isError = false) {
    setNotice({ message, error: isError });
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => setNotice(null),
      notice.error ? 12000 : 5000,
    );
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const hash = () => {
      if (nav.some((n) => n.id === location.hash.slice(1)))
        setPage(location.hash.slice(1));
    };
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("hashchange", hash);
    if (import.meta.env.PROD)
      updateApp.current = registerSW({
        onNeedRefresh: () => setUpdateReady(true),
      });
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    if (demoMode) {
      if (demoMode !== "login") {
        const fixtures = demoData();
        setData(fixtures);
        setProfile({
          ...fixtures.usuarios[0],
          role: demoMode === "viewer" ? "viewer" : "admin",
        });
      }
      setLoading(false);
      return;
    }
    let active = true;
    let cleanup: (() => void)[] = [];
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentGeneration = ++generation;
      cleanup.forEach((stop) => stop());
      cleanup = [];
      setData(emptyData());
      setProfile(null);
      setMenu(false);
      setDataLoading(false);
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const current = await profileFor(user.uid);
        if (!active || currentGeneration !== generation) return;
        setProfile(current);
        setError("");
        setDataLoading(true);
        const loaded = new Set<string>();
        cleanup = subscribeData(
          (name, records) => {
            if (!active || currentGeneration !== generation) return;
            setData((prev) => ({ ...prev, [name]: records }));
            loaded.add(name);
            if (loaded.size === collections.length) {
              setDataLoading(false);
              setError("");
            }
          },
          (e) => {
            if (active && currentGeneration === generation) {
              setError(friendlyError(e));
              setDataLoading(false);
            }
          },
        );
      } catch (e) {
        if (active && currentGeneration === generation)
          setError(friendlyError(e));
      } finally {
        if (active && currentGeneration === generation) setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
      cleanup.forEach((stop) => stop());
    };
  }, []);
  function navigate(id: string) {
    setPage(id);
    location.hash = id;
    setMenu(false);
    window.scrollTo({ top: 0 });
  }
  async function save(changes: Mutation[], description: string) {
    if (busyRef.current)
      throw new Error("Aguarde a confirmação da operação atual.");
    if (!profile || profile.role !== "admin")
      throw new Error("Seu perfil permite somente consulta.");
    if (!navigator.onLine)
      throw new Error("Conecte-se à internet para salvar.");
    busyRef.current = true;
    setBusy(true);
    try {
      if (demoMode) {
        setData((prev) => {
          const next = { ...prev };
          for (const change of changes) {
            const records = [...next[change.collection]] as Entity[];
            const index = change.id
              ? records.findIndex((r) => r.id === change.id)
              : -1;
            if (change.remove) {
              if (index >= 0) records.splice(index, 1);
            } else if (index >= 0)
              records[index] = {
                ...records[index],
                ...change.data,
                atualizadoEm: new Date(),
              } as Entity;
            else
              records.push({
                ...change.data,
                id: crypto.randomUUID(),
                criadoEm: new Date(),
                atualizadoEm: new Date(),
              } as Entity);
            (next as unknown as Record<string, Entity[]>)[change.collection] =
              records;
          }
          next.atividades = [
            {
              id: crypto.randomUUID(),
              tipo: "edicao",
              descricao: description,
              usuarioNome: profile.nome,
              criadoEm: new Date(),
            },
            ...next.atividades,
          ];
          return next;
        });
      } else
        await mutate(
          changes.map((change) => {
            const current = change.id
              ? data[change.collection].find((r) => r.id === change.id)
              : undefined;
            return {
              ...change,
              expectedUpdatedAt:
                change.expectedUpdatedAt ??
                (current ? versionOf(current) : undefined),
            };
          }),
          profile,
          description,
        );
      notify("Salvo com sucesso.");
    } catch (e) {
      throw new Error(friendlyError(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function remove(
    collection: CollectionName,
    record: Entity,
    description: string,
  ) {
    setDeleting({ collection, record, description });
  }
  async function exportBackup() {
    if (!profile || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const backup = demoMode
        ? {
            schemaVersion: 1,
            projectId: "demo",
            exportedAt: new Date().toISOString(),
            collections: encodeBackup(data),
          }
        : await completeBackup(profile);
      DownloadFile(
        JSON.stringify(backup, null, 2),
        `LaDivinoSabor_${today()}.json`,
      );
      setExporting(false);
      notify("Arquivo completo exportado. Guarde em um local seguro.");
    } catch (e) {
      notify(friendlyError(e), true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (busyRef.current) return;
    setMenu(false);
    try {
      if (demoMode) {
        location.href = "/?demo=login";
      } else await logout();
    } catch (e) {
      notify(friendlyError(e), true);
    }
  }
  if (loading)
    return (
      <div className="loading-screen" role="status">
        <BrandLogo />
        <p>Preparando seu espaço…</p>
      </div>
    );
  if (!profile) return <Login initialError={error} notice={notice?.message} />;
  const current = nav.find((n) => n.id === page)!;
  const pages: Record<string, ReactNode> = {
    dashboard: <Dashboard navigate={navigate} />,
    vendas: <Sales />,
    encomendas: <Orders />,
    financeiro: <Finance />,
    cadastros: <Catalog />,
    cobrancas: <Charges />,
    relatorios: <Reports />,
  };
  const pending =
    data.vendas.filter((s) => s.status === "P").length +
    data.encomendas.filter(
      (o) => o.status !== "Finalizado" && o.valorTotal > o.valorEntrada,
    ).length;
  const menuLabel = compact
    ? "Abrir navegação"
    : sidebarCollapsed
      ? "Mostrar menu lateral"
      : "Ocultar menu lateral";
  return (
    <BusinessContext.Provider
      value={{
        data,
        profile,
        canWrite,
        busy,
        online,
        period,
        save,
        edit: (kind, record) => {
          if (canWrite) setEditor({ kind, record });
        },
        remove,
        notify,
      }}
    >
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="menu-principal"
        role={compact && menu ? "dialog" : undefined}
        aria-modal={compact && menu ? true : undefined}
        aria-label="Menu principal"
        className={`sidebar ${menu ? "open" : ""} ${!compact && sidebarCollapsed ? "collapsed" : ""}`}
        inert={compact ? !menu : sidebarCollapsed}
      >
        <button
          className="icon-button sidebar-close"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        >
          <X size={22} />
        </button>
        <a
          className="brand-block"
          href="#dashboard"
          onClick={() => navigate("dashboard")}
        >
          <BrandLogo />
          <span>Confeitaria artesanal</span>
        </a>
        <div className="sidebar-label">Seu negócio</div>
        <nav aria-label="Navegação principal">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.title}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} strokeWidth={1.7} />
              <span>{n.title}</span>
              {n.id === "cobrancas" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Button variant="ghost" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            {dark ? "Usar tema claro" : "Usar tema escuro"}
          </Button>
          {install && (
            <Button
              variant="ghost"
              onClick={() => {
                void install.prompt().then(() => setInstall(null));
              }}
            >
              <Download size={17} /> Instalar aplicativo
            </Button>
          )}
          {profile.role === "admin" && (
            <Button
              variant="ghost"
              disabled={!canWrite}
              onClick={() => {
                setMenu(false);
                setExporting(true);
              }}
            >
              <ArrowDownToLine size={17} /> Exportar arquivo completo
            </Button>
          )}
          <div className="profile-block">
            <div className="avatar">{profile.nome?.slice(0, 1) || "L"}</div>
            <div className="grow">
              <strong>{profile.nome}</strong>
              <small>
                {profile.role === "admin"
                  ? "Administração"
                  : "Somente consulta"}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Sair"
              disabled={busy}
              onClick={() => void signOut()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div
        className={`workspace ${!compact && sidebarCollapsed ? "expanded" : ""}`}
        inert={compact && menu}
      >
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            ref={menuButtonRef}
            aria-label={menuLabel}
            title={menuLabel}
            aria-expanded={compact ? menu : !sidebarCollapsed}
            aria-controls="menu-principal"
            onClick={() => {
              if (compact) setMenu(!menu);
              else setSidebarCollapsed(!sidebarCollapsed);
            }}
          >
            {compact ? (
              <Menu size={22} />
            ) : sidebarCollapsed ? (
              <PanelLeftOpen size={22} />
            ) : (
              <PanelLeftClose size={22} />
            )}
          </button>
          <div className="breadcrumb">
            <BrandLogo />
            <span className="breadcrumb-brand">Lá Divino Sabor</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-page">{current.title}</span>
          </div>
          <div className="topbar-right">
            <span className={`connection ${online ? "" : "offline"}`} aria-label={online ? "Conectado" : "Sem conexão"}>
              <span />
              <span className="connection-label">{online ? "Conectado" : "Sem conexão"}</span>
            </span>
            <div className="avatar small-avatar">
              {profile.nome?.slice(0, 1)}
            </div>
          </div>
        </header>
        {demoMode && (
          <div className="demo-banner">
            Prévia com dados fictícios · nenhuma alteração é enviada ao
            Firebase.
          </div>
        )}
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={18} /> Você está sem conexão. Conecte-se para salvar
            alterações.
          </div>
        )}
        {updateReady && (
          <div className="update-banner">
            <span>Há uma nova versão disponível.</span>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void updateApp.current?.(true);
              }}
            >
              Atualizar aplicativo
            </Button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <Button variant="ghost" onClick={() => location.reload()}>
              Tentar novamente
            </Button>
          </div>
        )}
        <main id="conteudo" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <span className="eyebrow">Gestão da doceria</span>
              <h1>
                {page === "dashboard"
                  ? `${new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"}, ${profile.nome?.split(" ")[0] || "equipe"}`
                  : current.title}
              </h1>
              <p>{current.subtitle}</p>
            </div>
            {!["encomendas", "cadastros", "cobrancas", "relatorios"].includes(
              page,
            ) && (
              <div className="period-picker">
                <CalendarDays size={17} />
                <label>
                  <span className="sr-only">Período</span>
                  <input
                    aria-label="Período"
                    type={period.length === 4 ? "number" : "month"}
                    min={period.length === 4 ? "2000" : undefined}
                    max={period.length === 4 ? "2100" : undefined}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Abrangência do período"
                  value={
                    !period ? "all" : period.length === 4 ? "year" : "month"
                  }
                  onChange={(e) =>
                    setPeriod(
                      e.target.value === "all"
                        ? ""
                        : e.target.value === "year"
                          ? (period || today()).slice(0, 4)
                          : period.length === 7
                            ? period
                            : `${(period || today()).slice(0, 4)}-${today().slice(5, 7)}`,
                    )
                  }
                >
                  <option value="month">Mês</option>
                  <option value="year">Ano</option>
                  <option value="all">Tudo</option>
                </select>
              </div>
            )}
          </div>
          {!period &&
            !["encomendas", "cadastros", "cobrancas", "relatorios"].includes(
              page,
            ) && (
              <p className="page-note">
                Exibindo todos os períodos. Selecione um mês para filtrar.
              </p>
            )}
          {dataLoading ? (
            <div className="panel loading-data" role="status">
              Carregando os registros…
            </div>
          ) : error ? (
            <div className="panel loading-data">
              Os registros não puderam ser confirmados. Tente conectar novamente
              antes de operar.
            </div>
          ) : (
            pages[page]
          )}
          <footer className="app-footer">
            Lá Divino Sabor <span>Feito para cuidar do que você constrói.</span>
          </footer>
        </main>
      </div>
      {editor && (
        <Editor
          key={`${editor.kind}-${editor.record?.id || "new"}`}
          kind={editor.kind}
          record={editor.record}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <Modal
          title={
            [
              "clientes",
              "produtos",
              "ingredientes",
              "receitas",
              "materiais",
            ].includes(deleting.collection)
              ? "Arquivar cadastro?"
              : "Excluir registro?"
          }
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <p>
            Confirma a alteração de <strong>{deleting.description}</strong>?
          </p>
          <p className="form-note">
            {[
              "clientes",
              "produtos",
              "ingredientes",
              "receitas",
              "materiais",
            ].includes(deleting.collection)
              ? "O cadastro será arquivado e continuará preservado no histórico. Você poderá reativá-lo em Cadastros."
              : "O registro será removido do banco. Essa ação não tem desfazer."}
          </p>
          <footer className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={!canWrite}
              onClick={() => {
                void save(
                  [
                    {
                      collection: deleting.collection,
                      id: deleting.record.id,
                      expectedUpdatedAt: versionOf(deleting.record),
                      ...([
                        "clientes",
                        "produtos",
                        "ingredientes",
                        "receitas",
                        "materiais",
                      ].includes(deleting.collection)
                        ? { data: { arquivado: true } }
                        : { remove: true }),
                    },
                  ],
                  `Exclusão: ${deleting.description}`,
                )
                  .then(() => setDeleting(null))
                  .catch((e) => notify((e as Error).message, true));
              }}
            >
              {busy
                ? "Confirmando…"
                : [
                      "clientes",
                      "produtos",
                      "ingredientes",
                      "receitas",
                      "materiais",
                    ].includes(deleting.collection)
                  ? "Arquivar cadastro"
                  : "Excluir registro"}
            </Button>
          </footer>
        </Modal>
      )}
      {exporting && (
        <Modal
          title="Exportar arquivo completo"
          onClose={() => setExporting(false)}
          busy={busy}
        >
          <p>
            O arquivo JSON inclui as {collections.length} coleções conhecidas,
            com IDs e datas, incluindo os dados dos clientes e da equipe.
          </p>
          <p className="form-note">
            Não inclui senhas, contas do Authentication ou configuração de
            infraestrutura. A restauração exige revisão técnica; não há
            importação automática.
          </p>
          <footer className="modal-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setExporting(false)}
            >
              Cancelar
            </Button>
            <Button disabled={!canWrite} onClick={() => void exportBackup()}>
              {busy ? "Exportando…" : "Baixar JSON completo"}
            </Button>
          </footer>
        </Modal>
      )}
      {notice && (
        <div
          className={`toast ${notice.error ? "error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.message}</span>
          <button
            className="icon-button"
            aria-label="Dispensar aviso"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="saving-indicator" role="status">
          Aguardando confirmação da operação…
        </div>
      )}
    </BusinessContext.Provider>
  );
}
function Login({
  initialError,
  notice,
}: {
  initialError: string;
  notice?: string;
}) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setError(initialError);
  }, [initialError]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      if (!navigator.onLine)
        throw new Error("Conecte-se à internet para entrar.");
      if (demoMode) {
        location.href = "/?demo=1";
        return;
      }
      await login(
        String(values.get("email")),
        String(values.get("password")),
        values.get("remember") === "on",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-layout">
      <section className="login-story">
        <BrandLogo />
        <span className="eyebrow">Confeitaria artesanal</span>
        <div className="login-message">
          <span className="eyebrow">Do cuidado nasce o extraordinário</span>
          <h1>
            Mais tempo para
            <br />o que você
            <br />
            <em>faz de melhor.</em>
          </h1>
          <p>
            Seu negócio organizado.
            <br />
            Sua atenção no próximo sabor.
          </p>
        </div>
        <span className="login-caption">
          Cada detalhe faz parte da receita.
        </span>
      </section>
      <main className="login-main">
        <div className="login-card">
          <div className="mobile-brand"><BrandLogo /></div>
          <span className="eyebrow">Seu espaço de gestão</span>
          <h2>Que bom ter você aqui.</h2>
          <p>Entre para cuidar do seu negócio.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="seu@email.com"
                />
              </Field>
              <Field label="Senha">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Sua senha"
                />
              </Field>
              <label className="checkbox">
                <input type="checkbox" name="remember" defaultChecked />
                Manter conectado neste dispositivo
              </label>
              {(error || notice) && (
                <p role="alert" className="form-error">
                  {error || notice}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? "Entrando…" : "Entrar"}
              </Button>
            </fieldset>
          </form>
          <p className="login-support">
            Acesso exclusivo da equipe. Para recuperar o acesso, fale com o
            administrador.
          </p>
        </div>
        <footer>Lá Divino Sabor · Feito com cuidado</footer>
      </main>
    </div>
  );
}
