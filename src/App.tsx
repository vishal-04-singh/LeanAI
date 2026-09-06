import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";

import { Button, Chip } from "./components/primitives";
import { onScanProgress } from "./ipc/client";
import { ContextPage } from "./pages/ContextPage";
import { PreviewPage } from "./pages/PreviewPage";
import { SelectPage } from "./pages/SelectPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { useAppStore, type Route } from "./store/useAppStore";

const NAV: { route: Route; label: string; needsProject: boolean }[] = [
  { route: "workspace", label: "Project", needsProject: false },
  { route: "select", label: "Files", needsProject: true },
  { route: "preview", label: "Bundle", needsProject: true },
  { route: "context", label: "Context", needsProject: true },
  { route: "settings", label: "Settings", needsProject: false },
];

export default function App() {
  const {
    route,
    setRoute,
    project,
    bootstrap,
    error,
    setError,
    notice,
    setNotice,
    setScanProgress,
  } = useAppStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const unlisten = onScanProgress(setScanProgress);
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [setScanProgress]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);

  return (
    <div className="flex h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-ink-800 focus:px-3 focus:py-1.5 focus:text-xs"
      >
        Skip to main content
      </a>
      <header className="flex items-center justify-between gap-4 border-b border-ink-800 bg-ink-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-ink-100">LeanAI Desktop</span>
          <Chip title="Bundling, estimating and indexing all run on this device">offline</Chip>
        </div>
        <nav aria-label="Sections">
          <ul className="flex gap-1">
            {NAV.map((item) => {
              const disabled = item.needsProject && !project;
              return (
                <li key={item.route}>
                  <button
                    type="button"
                    onClick={() => setRoute(item.route)}
                    disabled={disabled}
                    aria-current={route === item.route ? "page" : undefined}
                    className={`rounded px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      route === item.route
                        ? "bg-ink-800 text-ink-100"
                        : "text-ink-300 hover:bg-ink-800"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <div aria-live="polite" className="empty:hidden">
        {error ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 border-b border-danger/40 bg-danger/10 px-4 py-2 text-xs text-danger"
          >
            <div>
              <p className="font-medium">{error.message}</p>
              {error.recovery ? <p className="mt-0.5 text-danger/80">{error.recovery}</p> : null}
              <p className="mono mt-0.5 text-[10px] text-danger/60">{error.code}</p>
            </div>
            <Button variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}
        {notice ? (
          <div className="border-b border-ok/30 bg-ok/10 px-4 py-2 text-xs text-ok" role="status">
            {notice}
          </div>
        ) : null}
      </div>

      <main id="main" className="flex-1 overflow-auto p-4">
        <ErrorBoundary>
          {route === "workspace" ? <WorkspacePage /> : null}
          {route === "select" ? <SelectPage /> : null}
          {route === "preview" ? <PreviewPage /> : null}
          {route === "context" ? <ContextPage /> : null}
          {route === "settings" ? <SettingsPage /> : null}
        </ErrorBoundary>
      </main>
    </div>
  );
}

/** Keeps a rendering failure in one page from blanking the whole window. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LeanAI UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-xs text-danger">
        <p className="font-semibold">This screen failed to render.</p>
        <p className="mt-1">
          Your project and settings are unaffected — nothing was written. Reload the window, or
          switch to another section.
        </p>
        <pre className="mono mt-2 overflow-auto text-[11px]">{this.state.error.message}</pre>
        <Button onClick={() => this.setState({ error: null })}>Try again</Button>
      </div>
    );
  }
}
