"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Contract = {
  id: string;
  intent_hash: string;
  merkle_root: string;
  signature: string;
  agent_id: string;
  allowed_actions: string[];
  goal: string;
  created_at: string;
  version: string;
};

type ExecutionLog = {
  id: string;
  plan_id: string;
  tool_name: string;
  status: "allowed" | "blocked" | "pending_approval" | "approved" | "rejected";
  risk_score: number;
  result?: string;
  reason?: string;
  approved?: boolean | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  timestamp: string;
};

type DemoAction = {
  tool: string;
  args: Record<string, string>;
  label: string;
  note: string;
};

const PRESETS = [
  "Fix the login authentication bug in our application.",
  "Plan a Europe trip under Rs 1 lakh.",
  "Read the analytics files and generate a performance report.",
];

const SAFE_ACTIONS: Record<string, DemoAction[]> = {
  "Fix the login authentication bug in our application.": [
    { tool: "read_codebase", args: { target: "auth module" }, label: "Read Codebase", note: "Allowed by signed intent" },
    { tool: "modify_auth_module", args: { fix: "JWT validation patch" }, label: "Modify Auth Module", note: "Inside execution boundary" },
    { tool: "run_tests", args: { suite: "auth" }, label: "Run Tests", note: "Low risk verification" },
    { tool: "deploy_staging", args: { version: "v2.1.4-patch" }, label: "Deploy Staging", note: "Permitted environment only" },
  ],
  "Plan a Europe trip under Rs 1 lakh.": [
    { tool: "search_flights", args: { destination: "Europe" }, label: "Search Flights", note: "Allowed travel lookup" },
    { tool: "search_hotels", args: { city: "Paris" }, label: "Search Hotels", note: "Allowed travel lookup" },
    { tool: "create_itinerary", args: { destination: "Europe" }, label: "Create Itinerary", note: "Allowed planning action" },
  ],
  "Read the analytics files and generate a performance report.": [
    { tool: "read_files", args: { target: "analytics" }, label: "Read Files", note: "Allowed data access" },
    { tool: "write_report", args: { target: "performance" }, label: "Write Report", note: "Allowed report output" },
  ],
};

const ATTACKS: DemoAction[] = [
  { tool: "drop_database", args: { target: "all_tables" }, label: "Drop Database", note: "Prompt injection destroy command" },
  { tool: "push_to_production", args: { version: "malicious_v0.0.1" }, label: "Push Production", note: "Production deploy outside scope" },
  { tool: "access_customer_data", args: { query: "all_pii" }, label: "Access PII", note: "Customer data exfiltration" },
  { tool: "send_payment", args: { amount: "500000" }, label: "Send Payment", note: "Unauthorized financial action" },
];

const RISK_SCORES: Record<string, number> = {
  read_codebase: 1,
  run_tests: 2,
  read_files: 2,
  write_report: 3,
  create_itinerary: 2,
  search_flights: 3,
  search_hotels: 3,
  modify_auth_module: 4,
  deploy_staging: 5,
  book_ticket: 7,
  push_to_production: 9,
  send_payment: 9,
  access_customer_data: 9,
  drop_database: 10,
};

function riskLabel(score: number) {
  if (score <= 2) return "LOW";
  if (score <= 5) return "CONTROLLED";
  if (score <= 8) return "HIGH";
  return "CRITICAL";
}

function statusTone(status: ExecutionLog["status"]) {
  if (status === "allowed" || status === "approved") return "safe";
  if (status === "pending_approval") return "pending";
  return "blocked";
}

function formatTime(value?: string) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString([], { hour12: false });
}

function shortHash(value?: string, size = 18) {
  if (!value) return "pending";
  return value.length > size ? `${value.slice(0, size)}...${value.slice(-6)}` : value;
}

export default function AgentBlackBoxDashboard() {
  const [prompt, setPrompt] = useState(PRESETS[0]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [blocked, setBlocked] = useState<ExecutionLog[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(
    () => [...executions, ...blocked].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [executions, blocked],
  );

  const safeActions = SAFE_ACTIONS[prompt] || SAFE_ACTIONS[PRESETS[0]];
  const pending = blocked.filter((item) => item.status === "pending_approval" && item.approved === null);
  const blockedCount = blocked.filter((item) => item.status === "blocked").length;
  const trustScore = timeline.length ? Math.max(10, Math.round(((timeline.length - blockedCount) / timeline.length) * 100)) : 100;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [timeline.length]);

  const fetchLogs = useCallback(async (id: string) => {
    const response = await fetch(`${API}/logs/${id}`);
    if (!response.ok) throw new Error("Could not load audit logs");
    const data = await response.json();
    setExecutions(data.executions || []);
    setBlocked(data.blocked_actions || []);
  }, []);

  async function createPlan() {
    setLoadingPlan(true);
    setError(null);
    setExecutions([]);
    setBlocked([]);

    try {
      const response = await fetch(`${API}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: prompt }),
      });
      if (!response.ok) throw new Error("FastAPI rejected the intent request");
      const data = await response.json();
      const nextContract = { id: data.plan_id, ...data.contract };
      setPlanId(data.plan_id);
      setContract(nextContract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backend is not reachable on port 8000");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function executeAction(action: DemoAction) {
    if (!planId) return;
    setLoadingAction(action.tool);
    setError(null);

    try {
      const response = await fetch(`${API}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, tool_name: action.tool, arguments: action.args }),
      });
      if (!response.ok) throw new Error(`Action failed: ${action.tool}`);
      await fetchLogs(planId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action execution failed");
    } finally {
      setLoadingAction(null);
    }
  }

  async function runSafeSequence() {
    for (const action of safeActions) {
      await executeAction(action);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  async function approveAction(actionId: string, approve: boolean) {
    if (!planId) return;
    await fetch(`${API}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: actionId, approve, reviewed_by: "SOC_Operator" }),
    });
    await fetchLogs(planId);
  }

  return (
    <div className="min-h-screen bg-app text-app">
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-4">
            <div className="grid h-9 w-9 place-items-center rounded border border-primary/35 bg-primary/10 text-primary">
              <Icon name="shield" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-normal text-primary">AGENT BLACK BOX</h1>
              <p className="font-code text-[11px] uppercase text-muted">Intent Firewall / ArmorIQ runtime</p>
            </div>
            <span className="hidden items-center gap-2 font-code text-[11px] text-primary sm:flex">
              <span className="status-dot safe pulse" />
              Runtime Active
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a className="border-b border-primary pb-1 text-primary" href="#dashboard">Dashboard</a>
            <a className="hover:text-primary" href="#playground">Playground</a>
            <a className="hover:text-primary" href="#audit">Audit</a>
            <a className="hover:text-primary" href="#approvals">Approvals</a>
          </nav>

          <div className="flex items-center gap-3 font-code text-[11px] text-muted">
            <span>TRUST</span>
            <strong className="text-primary">{trustScore}%</strong>
          </div>
        </div>
      </header>

      <main id="dashboard" className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-12 lg:px-12">
        <section className="lg:col-span-4 space-y-4">
          <Panel title="Intent Capture" icon="terminal" id="playground">
            <div className="space-y-3">
              <label className="block font-code text-[11px] uppercase text-muted">User Goal</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="terminal-field min-h-32"
                placeholder="Describe the agent goal..."
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PRESETS.map((preset) => (
                  <button key={preset} className="btn-muted truncate" onClick={() => setPrompt(preset)}>
                    {preset.split(".")[0]}
                  </button>
                ))}
              </div>
              <button className="btn-primary w-full" onClick={createPlan} disabled={loadingPlan}>
                {loadingPlan ? "Signing Intent..." : "Generate Cryptographic Intent"}
              </button>
              {error && <p className="rounded border border-danger/30 bg-danger/10 p-2 font-code text-xs text-danger">{error}</p>}
            </div>
          </Panel>

          <Panel title="Agent Simulation" icon="play">
            <div className="space-y-2">
              <button className="btn-safe w-full justify-between" disabled={!planId || !!loadingAction} onClick={runSafeSequence}>
                <span>Run Allowed Sequence</span>
                <span>{safeActions.length} actions</span>
              </button>
              {safeActions.map((action) => (
                <ActionButton key={action.tool} action={action} tone="safe" disabled={!planId || !!loadingAction} loading={loadingAction === action.tool} onClick={() => executeAction(action)} />
              ))}
            </div>
          </Panel>

          <Panel title="Prompt Injection Lab" icon="warning">
            <div className="space-y-2">
              {ATTACKS.map((action) => (
                <ActionButton key={action.tool} action={action} tone="danger" disabled={!planId || !!loadingAction} loading={loadingAction === action.tool} onClick={() => executeAction(action)} />
              ))}
            </div>
          </Panel>
        </section>

        <section className="lg:col-span-5 space-y-4">
          <Panel title="Boundary Contract" icon="policy">
            {contract ? (
              <div className="space-y-4">
                <div>
                  <p className="label">Original Intent</p>
                  <p className="text-sm leading-6 text-app">{contract.goal}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Hash label="Intent Hash" value={contract.intent_hash} />
                  <Hash label="Merkle Root" value={contract.merkle_root} />
                </div>
                <Hash label={`Execution Signature / ${contract.version}`} value={contract.signature} wide />
                <div>
                  <p className="label mb-2">Allowed Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.allowed_actions.map((action) => (
                      <span className="chip safe" key={action}>{action}()</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 border-t border-outline-variant pt-4 font-code text-[11px] text-muted sm:grid-cols-3">
                  <span>PLAN: <strong className="text-primary">{shortHash(planId || "", 8)}</strong></span>
                  <span>AGENT: <strong className="text-primary">{contract.agent_id}</strong></span>
                  <span>CREATED: <strong className="text-primary">{formatTime(contract.created_at)}</strong></span>
                </div>
              </div>
            ) : (
              <EmptyState title="No active intent contract" detail="Generate a signed intent to activate verification." />
            )}
          </Panel>

          <Panel title="Execution Timeline" icon="timeline">
            <div ref={logRef} className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {timeline.length === 0 ? (
                <EmptyState title="Awaiting agent activity" detail="Allowed, pending, and blocked actions will appear here." />
              ) : (
                timeline.map((event) => <TimelineRow key={event.id} event={event} onApprove={approveAction} />)
              )}
            </div>
          </Panel>
        </section>

        <section className="lg:col-span-3 space-y-4">
          <Panel title="Security Metrics" icon="activity">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Trust Score" value={`${trustScore}%`} tone="safe" />
              <Metric label="Verified" value={executions.length} tone="safe" />
              <Metric label="Blocked" value={blockedCount} tone="blocked" />
              <Metric label="Pending" value={pending.length} tone="pending" />
            </div>
          </Panel>

          <Panel title="Approval Center" icon="approval" id="approvals">
            <div className="space-y-2">
              {pending.length === 0 ? (
                <EmptyState title="No pending approvals" detail="High-risk in-bound actions are routed here." compact />
              ) : (
                pending.map((item) => (
                  <div className="approval-card" key={item.id}>
                    <div>
                      <p className="font-code text-xs text-app">{item.tool_name}()</p>
                      <p className="mt-1 text-xs text-muted">{item.reason}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="btn-safe flex-1" onClick={() => approveAction(item.id, true)}>Approve</button>
                      <button className="btn-danger flex-1" onClick={() => approveAction(item.id, false)}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Risk Registry" icon="risk">
            <div className="space-y-3">
              {Object.entries(RISK_SCORES).map(([tool, score]) => (
                <div key={tool}>
                  <div className="mb-1 flex items-center justify-between font-code text-[11px]">
                    <span className="text-muted">{tool}()</span>
                    <span className={score >= 9 ? "text-danger" : score >= 7 ? "text-pending" : "text-primary"}>{riskLabel(score)}</span>
                  </div>
                  <div className="risk-track"><span style={{ width: `${score * 10}%` }} /></div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="lg:col-span-12" id="audit">
          <Panel title="Audit Center" icon="list">
            <div className="overflow-x-auto">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th>Risk</th>
                    <th>Reason / Result</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted">No audit events yet.</td></tr>
                  ) : (
                    timeline.map((item) => (
                      <tr key={`audit-${item.id}`}>
                        <td>{formatTime(item.timestamp)}</td>
                        <td><span className={`chip ${statusTone(item.status)}`}>{item.status.replace("_", " ").toUpperCase()}</span></td>
                        <td>{item.tool_name}()</td>
                        <td>{item.risk_score}/10</td>
                        <td>{item.reason || item.result || "Verified by signed intent contract"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function Panel({ title, icon, children, id }: { title: string; icon: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="panel">
      <div className="panel-header">
        <Icon name={icon} />
        <h2>{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Icon({ name }: { name: string }) {
  const glyphs: Record<string, string> = {
    shield: "shield",
    terminal: ">_",
    play: "play_arrow",
    warning: "warning",
    policy: "policy",
    timeline: "timeline",
    activity: "monitoring",
    approval: "rule",
    risk: "speed",
    list: "list_alt",
  };
  return <span className="icon" aria-hidden="true">{glyphs[name] || name}</span>;
}

function Hash({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "hash-box sm:col-span-2" : "hash-box"}>
      <p className="label">{label}</p>
      <p>{shortHash(value, 28)}</p>
    </div>
  );
}

function ActionButton({ action, tone, loading, disabled, onClick }: { action: DemoAction; tone: "safe" | "danger"; loading: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button className={tone === "safe" ? "btn-muted w-full justify-between" : "btn-danger w-full justify-between"} onClick={onClick} disabled={disabled}>
      <span>{loading ? "Dispatching..." : action.label}</span>
      <span className="hidden truncate text-[10px] opacity-70 sm:inline">{action.note}</span>
    </button>
  );
}

function TimelineRow({ event, onApprove }: { event: ExecutionLog; onApprove: (id: string, approve: boolean) => void }) {
  const tone = statusTone(event.status);
  return (
    <article className={`timeline-row ${tone}`}>
      <span className={`status-dot ${tone}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-code text-sm text-app">{event.tool_name}()</strong>
          <span className={`chip ${tone}`}>{event.status.replace("_", " ").toUpperCase()}</span>
          <span className="ml-auto font-code text-[11px] text-muted">{formatTime(event.timestamp)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">{event.reason || event.result || "Verified by ArmorIQ intent boundary."}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="risk-track flex-1"><span style={{ width: `${event.risk_score * 10}%` }} /></div>
          <span className="font-code text-[11px] text-muted">{event.risk_score}/10</span>
        </div>
        {event.status === "pending_approval" && event.approved === null && (
          <div className="mt-3 flex gap-2">
            <button className="btn-safe" onClick={() => onApprove(event.id, true)}>Approve</button>
            <button className="btn-danger" onClick={() => onApprove(event.id, false)}>Reject</button>
          </div>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "safe" | "blocked" | "pending" }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong className={tone === "safe" ? "text-primary" : tone === "pending" ? "text-pending" : "text-danger"}>{value}</strong>
    </div>
  );
}

function EmptyState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return (
    <div className={compact ? "empty compact" : "empty"}>
      <p>{title}</p>
      <span>{detail}</span>
    </div>
  );
}
