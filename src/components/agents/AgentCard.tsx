import { Chip } from "../primitives";
import { AgentsIcon, SparklesIcon } from "../icons";

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  model: string;
  description: string;
  status: "active" | "ready" | "idle";
  capabilities: string[];
  temperature: number;
}

export function AgentCard({
  agent,
  onSelect,
}: {
  agent: AgentDefinition;
  onSelect?: (agent: AgentDefinition) => void;
}) {
  const statusColors = {
    active: { tone: "ok" as const, label: "Active", dot: true },
    ready: { tone: "info" as const, label: "Ready", dot: true },
    idle: { tone: "neutral" as const, label: "Idle", dot: false },
  };

  const status = statusColors[agent.status];

  return (
    <div
      className="group relative flex flex-col justify-between rounded-xl border border-ink-800 bg-ink-900/80 p-4 transition-all hover:border-ink-700 hover:bg-ink-900 hover:shadow-md cursor-pointer"
      onClick={() => onSelect?.(agent)}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-colors group-hover:border-accent/60">
              <AgentsIcon size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-ink-100 group-hover:text-accent-light transition-colors">
                {agent.name}
              </h3>
              <p className="text-[11px] text-ink-400">{agent.role}</p>
            </div>
          </div>
          <Chip tone={status.tone} dot={status.dot}>
            {status.label}
          </Chip>
        </div>

        {/* Description */}
        <p className="mt-2.5 text-xs leading-relaxed text-ink-300 line-clamp-2">
          {agent.description}
        </p>

        {/* Capabilities */}
        <div className="mt-3 flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="mono rounded border border-ink-800 bg-ink-950 px-1.5 py-0.5 text-[10px] text-ink-400"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Model & Temperature */}
      <div className="mt-4 flex items-center justify-between border-t border-ink-800/80 pt-2.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-ink-400">
          <SparklesIcon size={12} className="text-accent" />
          <span className="font-medium text-ink-300">{agent.model}</span>
        </div>
        <span className="mono text-[10px] text-ink-500">temp {agent.temperature.toFixed(1)}</span>
      </div>
    </div>
  );
}
