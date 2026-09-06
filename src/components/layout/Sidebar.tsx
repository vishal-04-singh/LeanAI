import { useEffect, useState } from "react";

import { api } from "../../ipc/client";
import type { SidecarStatus } from "../../ipc/types";
import { useAppStore, type Route } from "../../store/useAppStore";
import {
  AgentsIcon,
  ContextIcon,
  HistoryIcon,
  ModelsIcon,
  OverviewIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TasksIcon,
} from "../icons";

function HardDriveIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}

interface NavItem {
  route: Route;
  aliases?: Route[];
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  needsProject?: boolean;
}

export function Sidebar() {
  const { route, setRoute, project, selection } = useAppStore();
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>({ state: "stopped" });

  useEffect(() => {
    api
      .localModelStatus()
      .then(setSidecarStatus)
      .catch(() => undefined);
  }, []);

  const workspaceNav: NavItem[] = [
    {
      route: "overview",
      aliases: ["workspace"],
      label: "Mission Control",
      icon: OverviewIcon,
    },
    {
      route: "context",
      aliases: ["select", "preview"],
      label: "Context Studio",
      icon: ContextIcon,
      badge: selection.files.size > 0 ? selection.files.size : undefined,
      needsProject: true,
    },
    {
      route: "agents",
      label: "Agent Fleet",
      icon: AgentsIcon,
      badge: "6",
    },
    {
      route: "tasks",
      label: "Task Workspace",
      icon: TasksIcon,
    },
    {
      route: "history",
      label: "Bundle History",
      icon: HistoryIcon,
      needsProject: true,
    },
  ];

  const systemNav: NavItem[] = [
    {
      route: "models",
      label: "Models & Providers",
      icon: ModelsIcon,
    },
    {
      route: "settings",
      label: "Preferences",
      icon: SettingsIcon,
    },
  ];

  const isNavActive = (item: NavItem) => {
    if (route === item.route) return true;
    if (item.aliases && item.aliases.includes(route)) return true;
    return false;
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-ink-800/90 bg-ink-900/95 select-none">
      {/* Navigation Sections */}
      <div className="flex flex-col gap-5 p-3">
        {/* Workspace Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider text-ink-500 uppercase">
            Workspace
          </div>
          <nav aria-label="Workspace navigation" className="flex flex-col gap-0.5">
            {workspaceNav.map((item) => {
              const active = isNavActive(item);
              const disabled = Boolean(item.needsProject && !project);
              const Icon = item.icon;

              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => setRoute(item.route)}
                  disabled={disabled}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-accent/15 text-accent shadow-xs"
                      : disabled
                        ? "cursor-not-allowed text-ink-600 opacity-60"
                        : "text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={15}
                      className={
                        active
                          ? "text-accent"
                          : "text-ink-500 group-hover:text-ink-300 transition-colors"
                      }
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined ? (
                    <span
                      className={`mono rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        active ? "bg-accent/30 text-accent" : "bg-ink-800 text-ink-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider text-ink-500 uppercase">
            System & Runtime
          </div>
          <nav aria-label="System navigation" className="flex flex-col gap-0.5">
            {systemNav.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;

              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => setRoute(item.route)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-accent/15 text-accent shadow-xs"
                      : "text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={15}
                      className={
                        active
                          ? "text-accent"
                          : "text-ink-500 group-hover:text-ink-300 transition-colors"
                      }
                    />
                    <span>{item.label}</span>
                  </div>
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="border-t border-ink-800/80 p-3 space-y-2">
        {/* Local Sidecar Status */}
        <div
          className="flex cursor-pointer items-center justify-between rounded-md border border-ink-800/80 bg-ink-950/60 p-2 text-xs transition-colors hover:border-ink-700"
          onClick={() => setRoute("models")}
          title="Local llama-server sidecar runtime status"
        >
          <div className="flex items-center gap-2">
            <HardDriveIcon size={13} className="text-ink-400" />
            <span className="text-[11px] text-ink-300">Local Sidecar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${
                sidecarStatus.state === "ready"
                  ? "bg-ok animate-pulse"
                  : sidecarStatus.state === "starting"
                    ? "bg-warn animate-spin"
                    : "bg-ink-600"
              }`}
            />
            <span className="mono text-[10px] text-ink-400 capitalize">
              {sidecarStatus.state === "ready" ? `Port ${sidecarStatus.port}` : sidecarStatus.state}
            </span>
          </div>
        </div>

        {/* OS Keychain Status */}
        <div className="flex items-center justify-between px-1 text-[11px] text-ink-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheckIcon size={12} className="text-ok" />
            <span>macOS Keychain</span>
          </div>
          <span className="text-[10px] text-ok">Secured</span>
        </div>
      </div>
    </aside>
  );
}
