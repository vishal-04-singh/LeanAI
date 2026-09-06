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

function HardDriveIcon({ size = 13, className }: { size?: number; className?: string }) {
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
      label: "Models & Runtime",
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
    <aside className="flex w-52 shrink-0 flex-col justify-between border-r border-ink-800/80 bg-ink-950 select-none">
      {/* Navigation Sections */}
      <div className="flex flex-col gap-4 p-2.5">
        {/* Workspace Section */}
        <div>
          <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-500">
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
                  className={`group flex items-center justify-between rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-ink-850 text-white font-medium shadow-2xs"
                      : disabled
                        ? "cursor-not-allowed text-ink-600 opacity-50"
                        : "text-ink-400 hover:bg-ink-900 hover:text-ink-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={14}
                      className={
                        active
                          ? "text-ink-100"
                          : "text-ink-500 group-hover:text-ink-300 transition-colors"
                      }
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined ? (
                    <span
                      className={`mono rounded px-1.5 py-0.2 text-[9px] font-medium ${
                        active ? "bg-ink-750 text-ink-200" : "bg-ink-900 text-ink-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Section */}
        <div>
          <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-500">
            System
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
                  className={`group flex items-center justify-between rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-ink-850 text-white font-medium shadow-2xs"
                      : "text-ink-400 hover:bg-ink-900 hover:text-ink-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={14}
                      className={
                        active
                          ? "text-ink-100"
                          : "text-ink-500 group-hover:text-ink-300 transition-colors"
                      }
                    />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="border-t border-ink-800/80 p-2.5 space-y-1.5">
        {/* Local Sidecar Status */}
        <div
          className="flex cursor-pointer items-center justify-between rounded border border-ink-800/70 bg-ink-900/40 p-2 text-xs hover:border-ink-700 transition-colors"
          onClick={() => setRoute("models")}
          title="Local Sidecar Runtime"
        >
          <div className="flex items-center gap-1.5 text-ink-400">
            <HardDriveIcon size={12} />
            <span className="text-[11px]">Sidecar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                sidecarStatus.state === "ready"
                  ? "bg-ok"
                  : sidecarStatus.state === "starting"
                    ? "bg-warn"
                    : "bg-ink-600"
              }`}
            />
            <span className="mono text-[10px] text-ink-400">
              {sidecarStatus.state === "ready" ? `:${sidecarStatus.port}` : sidecarStatus.state}
            </span>
          </div>
        </div>

        {/* OS Keychain Status */}
        <div className="flex items-center justify-between px-1 text-[10px] text-ink-500">
          <div className="flex items-center gap-1">
            <ShieldCheckIcon size={11} className="text-ok" />
            <span>OS Keychain</span>
          </div>
          <span className="mono text-ok">Secured</span>
        </div>
      </div>
    </aside>
  );
}
