import { useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { useHealthCheck } from '@workspace/api-client-react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  History,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PanelLeft,
  PenLine,
  Settings2,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const health = useHealthCheck();

  const focusResume = () => resumeRef.current?.focus();

  return (
    <AppFrame mobileNavOpen={mobileNavOpen} onCloseNav={() => setMobileNavOpen(false)} health={health}>
      <div className="relative min-h-full overflow-hidden">
        <div className="workspace-grid pointer-events-none absolute inset-x-0 top-0 h-[30rem] opacity-60" />
        <main className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-8 sm:px-8 lg:px-12">
          <header className="enter-up flex flex-col gap-7 border-b border-border/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Workspace / New application
              </div>
              <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
                Make your next application feel considered.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                A quiet place to bring your experience and a role into focus. The tailoring workspace is taking shape here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground shadow-sm sm:flex sm:items-center sm:gap-2">
                <Clock3 className="h-3.5 w-3.5" />
                Nothing saved yet
              </div>
              <button
                type="button"
                data-testid="button-open-mobile-nav"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 lg:hidden"
              >
                <Menu className="h-4 w-4" /> Menu
              </button>
            </div>
          </header>

          <section className="enter-up-delay mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(310px,.68fr)]" aria-label="Tailoring workspace">
            <div className="grid gap-5">
              <InputCard
                eyebrow="01 · Your materials"
                title="Profile & resume"
                description="Add the source material you want to tailor. Keep the through-line of your experience close."
                icon={<FileText className="h-5 w-5" />}
                tone="teal"
                active={resume.length > 0}
              >
                <textarea
                  ref={resumeRef}
                  value={resume}
                  onChange={(event) => setResume(event.target.value)}
                  data-testid="textarea-resume"
                  aria-label="Profile and resume input"
                  placeholder="Paste your resume or a short profile here…"
                  className="min-h-36 w-full resize-y rounded-xl border border-dashed border-primary/25 bg-background/65 p-4 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-4 focus:ring-primary/10"
                />
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{resume.length > 0 ? 'Draft held in this browser session' : 'No material added'}</span>
                  <span className="font-mono">{resume.length > 0 ? `${resume.length} characters` : 'Awaiting input'}</span>
                </div>
              </InputCard>

              <InputCard
                eyebrow="02 · The opportunity"
                title="Job description"
                description="The role gives your experience a point of view. Add it when you are ready."
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                tone="coral"
                active={jobDescription.length > 0}
              >
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  data-testid="textarea-job-description"
                  aria-label="Job description input"
                  placeholder="Paste the job description here…"
                  className="min-h-36 w-full resize-y rounded-xl border border-dashed border-accent/30 bg-background/65 p-4 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent/70 focus:ring-4 focus:ring-accent/10"
                />
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{jobDescription.length > 0 ? 'Draft held in this browser session' : 'No role added'}</span>
                  <span className="font-mono">{jobDescription.length > 0 ? `${jobDescription.length} characters` : 'Awaiting input'}</span>
                </div>
              </InputCard>
            </div>

            <div className="grid gap-5">
              <OutputCard resumePresent={resume.length > 0} jobPresent={jobDescription.length > 0} onAddResume={focusResume} />
              <div className="rounded-2xl border border-border bg-card/75 p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-caps">Workspace notes</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.02em]">A clear starting line</h2>
                  </div>
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Add both sides of the conversation above. Tailoring tools will appear here once this foundation is ready.
                </p>
                <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-xs font-semibold text-primary">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3" />
                  </span>
                  Inputs stay local for now
                </div>
              </div>
            </div>
          </section>

          <section className="enter-up-delay-2 mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <HistoryCard />
            <SettingsCard />
          </section>
        </main>
      </div>
    </AppFrame>
  );
}

type HealthResult = ReturnType<typeof useHealthCheck>;

function AppFrame({ children, mobileNavOpen, onCloseNav, health }: { children: ReactNode; mobileNavOpen: boolean; onCloseNav: () => void; health: HealthResult }) {
  return (
    <div className="app-shell flex min-h-[100dvh]">
      <Sidebar />
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden" onClick={onCloseNav}>
          <div className="h-full w-[285px] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Sidebar mobile onClose={onCloseNav} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between border-b border-border/75 bg-background/80 px-5 backdrop-blur-md lg:px-10">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Tailor / workspace
          </div>
          <HealthIndicator health={health} />
        </div>
        {children}
      </div>
    </div>
  );
}

function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [location] = useLocation();
  return (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} h-full w-[250px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground`}>
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-6">
        <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <PenLine className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-[-0.02em]">Draftline</span>
        </Link>
        {mobile && <button type="button" data-testid="button-close-mobile-nav" onClick={onClose} className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"><X className="h-4 w-4" /></button>}
      </div>
      <div className="flex flex-1 flex-col px-3 py-6">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">Workspace</p>
        <nav className="mt-3 space-y-1">
          <NavItem href="/" label="Workspace" icon={<LayoutDashboard className="h-4 w-4" />} active={location === '/'} onClick={onClose} testId="link-workspace" />
          <NavItem href="/settings" label="Settings" icon={<Settings2 className="h-4 w-4" />} active={location === '/settings'} onClick={onClose} testId="link-settings" />
        </nav>
        <div className="my-7 h-px bg-sidebar-border" />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">Coming into focus</p>
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/45"><Sparkles className="h-4 w-4" /> Tailored draft <span className="ml-auto font-mono text-[9px]">soon</span></div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/45"><Target className="h-4 w-4" /> Role alignment <span className="ml-auto font-mono text-[9px]">soon</span></div>
        </div>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><CircleHelp className="h-4 w-4" /><span className="text-xs font-semibold">Early workspace</span></div>
          <p className="text-xs leading-5 text-sidebar-foreground/60">This shell is intentionally simple while the tailoring flow is being shaped.</p>
        </div>
      </div>
      <div className="border-t border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-bold text-sidebar-primary">DL</div>
          <div><p className="text-xs font-semibold">Private workspace</p><p className="mt-0.5 text-[10px] text-sidebar-foreground/45">No account connected</p></div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, label, icon, active, onClick, testId }: { href: string; label: string; icon: ReactNode; active: boolean; onClick?: () => void; testId: string }) {
  return <Link href={href} data-testid={testId} onClick={onClick} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>{icon}<span>{label}</span>{active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-primary" />}</Link>;
}

function HealthIndicator({ health }: { health: HealthResult }) {
  const status = health.isLoading ? 'Checking' : health.isError ? 'Offline' : 'Ready';
  return <div data-testid="status-backend" className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${health.isLoading ? 'pulse-dot bg-accent' : health.isError ? 'bg-muted-foreground/40' : 'bg-primary'}`} /> Backend {status}</div>;
}

function InputCard({ eyebrow, title, description, icon, tone, active, children }: { eyebrow: string; title: string; description: string; icon: ReactNode; tone: 'teal' | 'coral'; active: boolean; children: ReactNode }) {
  return <article className="rounded-2xl border border-border bg-card/85 p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/25 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === 'teal' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>{icon}</div><div><p className="label-caps">{eyebrow}</p><h2 className="mt-1.5 text-lg font-bold tracking-[-0.02em]">{title}</h2></div></div>
      <span className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? 'text-primary' : 'text-muted-foreground/65'}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-border'}`} />{active ? 'Added' : 'Empty'}</span>
    </div>
    <p className="ml-[52px] mt-2 max-w-lg text-sm leading-5 text-muted-foreground">{description}</p>
    <div className="mt-5">{children}</div>
  </article>;
}

function OutputCard({ resumePresent, jobPresent, onAddResume }: { resumePresent: boolean; jobPresent: boolean; onAddResume: () => void }) {
  return <article className="relative min-h-[350px] overflow-hidden rounded-2xl border border-primary/25 bg-primary p-6 text-primary-foreground shadow-[0_20px_60px_hsl(var(--primary)/.18)] sm:p-7">
    <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-primary-foreground/10" /><div className="absolute -right-5 -top-9 h-36 w-36 rounded-full border border-primary-foreground/10" />
    <div className="relative flex h-full flex-col">
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">03 · Your draft</p><h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em]">Generated output</h2></div><Sparkles className="h-5 w-5 text-primary-foreground/70" /></div>
      <div className="my-auto py-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10"><LockKeyhole className="h-5 w-5 text-primary-foreground/75" /></div>
        <p className="mx-auto mt-5 max-w-xs text-center text-sm leading-6 text-primary-foreground/75">Your tailored resume and cover letter will live here once both inputs are ready.</p>
      </div>
      <div className="border-t border-primary-foreground/15 pt-4"><div className="flex items-center justify-between text-[11px] text-primary-foreground/60"><span>{resumePresent && jobPresent ? 'Foundation complete' : 'Waiting for foundation'}</span><span className="font-mono">{resumePresent ? '1/2' : '0/2'} inputs</span></div><button type="button" onClick={onAddResume} data-testid="button-add-material" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-foreground/10 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-foreground/15">{resumePresent ? 'Review materials' : 'Add your first material'}<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
    </div>
  </article>;
}

function HistoryCard() {
  return <section className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="label-caps">04 · Settings & history</p><h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.02em]">Nothing in the archive</h2></div><History className="h-5 w-5 text-muted-foreground/70" /></div><div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-border bg-background/45 p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Clock3 className="h-4 w-4" /></div><p className="text-xs leading-5 text-muted-foreground">Saved applications and previous drafts will collect here after the workflow arrives.</p></div></section>;
}

function SettingsCard() {
  return <section className="rounded-2xl border border-border bg-card/70 p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="label-caps">Configuration</p><h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.02em]">Shape your workspace</h2></div><Settings2 className="h-5 w-5 text-primary" /></div><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Provider controls and writing preferences are planned, not collected. For now, there is nothing to configure.</p><Link href="/settings" data-testid="link-settings-card" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary transition hover:gap-3">Open planned settings <ChevronRight className="h-3.5 w-3.5" /></Link></section>;
}

function SettingsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const health = useHealthCheck();
  return <AppFrame mobileNavOpen={mobileNavOpen} onCloseNav={() => setMobileNavOpen(false)} health={health}><main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:px-12"><div className="mb-8 flex items-center justify-between lg:hidden"><span className="label-caps">Settings</span><button type="button" data-testid="button-open-mobile-nav-settings" onClick={() => setMobileNavOpen(true)} className="rounded-lg border border-border bg-card p-2"><PanelLeft className="h-4 w-4" /></button></div><div className="enter-up max-w-2xl"><p className="label-caps">Configuration / Planned</p><h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-0.04em]">The thoughtful bits come next.</h1><p className="mt-5 text-base leading-7 text-muted-foreground">Provider settings and writing preferences will make this workspace yours. They are deliberately not active yet, so there are no keys to add and nothing to save.</p></div><div className="enter-up-delay mt-10 grid gap-5"><PlannedSetting title="Writing preferences" text="Voice, length, and point-of-view controls for your tailored drafts." icon={<PenLine className="h-5 w-5" />} /><PlannedSetting title="Provider connection" text="A clear place to choose a provider when integrations are ready. No credentials are requested in this preview." icon={<LockKeyhole className="h-5 w-5" />} /><PlannedSetting title="Workspace history" text="Saved applications, source materials, and previous drafts will eventually be organized here." icon={<History className="h-5 w-5" />} /></div><Link href="/" data-testid="link-back-workspace" className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition">Back to workspace <ChevronRight className="h-4 w-4" /></Link></main></AppFrame>;
}

function PlannedSetting({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return <div className="flex items-start gap-4 rounded-2xl border border-border bg-card/75 p-5 shadow-[var(--shadow-soft)] sm:p-6"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div className="flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">{title}</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Planned</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></div>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
