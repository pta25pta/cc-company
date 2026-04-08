import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchWorkTree } from "../services/api";

const DEPT_COLORS = [
  { bg: "var(--accent-dim)", color: "var(--text-accent)" },
  { bg: "var(--green-dim)", color: "var(--green)" },
  { bg: "var(--yellow-dim)", color: "var(--yellow)" },
  { bg: "var(--red-dim)", color: "var(--red)" },
  { bg: "var(--blue-dim)", color: "var(--blue)" },
];

const AGENT_META = {
  Bash: { label: "Bash", icon: "\u25b6", cls: "agent-bash" },
  Explore: { label: "Explore", icon: "\u25ce", cls: "agent-explore" },
  Plan: { label: "Plan", icon: "\u25c7", cls: "agent-plan" },
};

const PRIORITY_ORDER = { "\u9ad8": 0, "\u901a\u5e38": 1, "\u4f4e": 2 };

function getDeptColor(idx) {
  return DEPT_COLORS[idx % DEPT_COLORS.length];
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="worktree-progress">
      <div className="worktree-progress-track">
        <div className="worktree-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="worktree-progress-label">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}

function AgentBadge({ type }) {
  const meta = AGENT_META[type];
  if (!meta) return null;
  return (
    <span className={`agent-badge ${meta.cls}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

/* ─── Tree Mode ─── */

function TaskItem({ task }) {
  return (
    <div className="worktree-task">
      <span className={`todo-checkbox ${task.done ? "done" : ""}`} />
      <span className={`worktree-task-text ${task.done ? "done" : ""}`}>
        {task.text}
      </span>
      {task.priority !== "\u901a\u5e38" && (
        <span className={`todo-priority priority-${task.priority}`}>
          {task.priority}
        </span>
      )}
    </div>
  );
}

function FileNode({ file }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="worktree-file-wrapper">
      <div className="worktree-file" onClick={() => setOpen(!open)}>
        <span className={`worktree-arrow ${open ? "open" : ""}`}>&#9654;</span>
        <span className="worktree-file-name">{file.title}</span>
        <span className="worktree-file-badge">
          {file.stats.done}/{file.stats.total}
        </span>
      </div>
      {open && (
        <div className="worktree-task-list">
          <div className="worktree-connector">
            {file.tasks.map((task, i) => (
              <TaskItem key={i} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeptNode({ dept, colorIdx }) {
  const [open, setOpen] = useState(false);
  const c = getDeptColor(colorIdx);
  return (
    <div className="worktree-dept">
      <div className="worktree-dept-header" onClick={() => setOpen(!open)}>
        <span className={`worktree-arrow ${open ? "open" : ""}`}>&#9654;</span>
        <span className="worktree-dept-dot" style={{ background: c.color }} />
        <span className="worktree-dept-name">{dept.name}</span>
        {dept.agents?.map((t) => <AgentBadge key={t} type={t} />)}
        <ProgressBar done={dept.stats.done} total={dept.stats.total} />
      </div>
      {open && (
        <div className="worktree-dept-files">
          {dept.files.map((file) => (
            <FileNode key={file.path} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Workflow Mode ─── */

function FlowNode({ task, index, total }) {
  const prioClass =
    task.priority === "\u9ad8"
      ? "flow-node-high"
      : task.priority === "\u4f4e"
        ? "flow-node-low"
        : "";
  return (
    <div className="flow-step">
      <div
        className={`flow-node ${task.done ? "flow-node-done" : ""} ${prioClass}`}
      >
        <div className="flow-node-status">
          {task.done ? "\u2713" : index + 1}
        </div>
        <div className="flow-node-body">
          <span className={`flow-node-text ${task.done ? "done" : ""}`}>
            {task.text}
          </span>
          {task.priority !== "\u901a\u5e38" && (
            <span className={`todo-priority priority-${task.priority}`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>
      {index < total - 1 && (
        <div className="flow-connector">
          <div className="flow-connector-line" />
          <div className="flow-connector-arrow" />
        </div>
      )}
    </div>
  );
}

function FlowFileSection({ file }) {
  const [open, setOpen] = useState(true);
  const sorted = useMemo(() => {
    const pending = file.tasks.filter((t) => !t.done);
    const done = file.tasks.filter((t) => t.done);
    return [
      ...pending.sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 1) -
          (PRIORITY_ORDER[b.priority] ?? 1)
      ),
      ...done,
    ];
  }, [file.tasks]);

  return (
    <div className="flow-file-section">
      <div className="flow-file-header" onClick={() => setOpen(!open)}>
        <span className={`worktree-arrow ${open ? "open" : ""}`}>&#9654;</span>
        <span className="flow-file-title">{file.title}</span>
        <span className="flow-file-stats">
          <span className="flow-file-done">{file.stats.done}</span>
          <span className="flow-file-sep">/</span>
          <span>{file.stats.total}</span>
        </span>
      </div>
      {open && (
        <div className="flow-pipeline">
          {sorted.map((task, i) => (
            <FlowNode key={i} task={task} index={i} total={sorted.length} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlowDeptCard({ dept, colorIdx }) {
  const c = getDeptColor(colorIdx);
  const pct =
    dept.stats.total > 0
      ? Math.round((dept.stats.done / dept.stats.total) * 100)
      : 0;

  return (
    <div className="flow-dept-card">
      <div className="flow-dept-header">
        <div className="flow-dept-indicator" style={{ background: c.color }} />
        <div className="flow-dept-info">
          <span className="flow-dept-name">{dept.name}</span>
          <span className="flow-dept-pct">{pct}%</span>
        </div>
        <div className="flow-dept-agents">
          {dept.agents?.map((t) => <AgentBadge key={t} type={t} />)}
        </div>
        <div className="flow-dept-bar">
          <div className="flow-dept-bar-track">
            <div
              className="flow-dept-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="flow-dept-bar-label">
            {dept.stats.done}/{dept.stats.total}
          </span>
        </div>
      </div>
      <div className="flow-dept-body">
        {dept.files.map((file) => (
          <FlowFileSection key={file.path} file={file} />
        ))}
      </div>
    </div>
  );
}

/* ─── Agent Team Launch Panel ─── */

function AgentLaunchPanel({ departments }) {
  const [selected, setSelected] = useState(new Set());
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const launchable = departments.filter(
    (d) => d.agents && d.agents.length > 0
  );

  const toggleDept = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowPrompt(false);
    setCopied(false);
  };

  const selectAll = () => {
    if (selected.size === launchable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(launchable.map((d) => d.id)));
    }
    setShowPrompt(false);
    setCopied(false);
  };

  const generatePrompt = () => {
    const chosen = launchable.filter((d) => selected.has(d.id));
    if (chosen.length === 0) return "";

    const lines = [
      `以下の ${chosen.length} 部署のエージェントをチームとして並列起動してください。`,
      `各部署の未完了タスクを担当エージェントに割り振り、同時に実行してください。`,
      "",
    ];

    for (const dept of chosen) {
      const pending = [];
      for (const f of dept.files) {
        for (const t of f.tasks) {
          if (!t.done) pending.push(t);
        }
      }
      const typeStr = dept.agents.join(" / ");
      lines.push(`## ${dept.name} (${typeStr})`);
      if (dept.agentRole) lines.push(`役割: ${dept.agentRole}`);
      if (dept.capabilities && dept.capabilities.length > 0) {
        lines.push(`能力: ${dept.capabilities.join(", ")}`);
      }
      if (pending.length > 0) {
        lines.push(`未完了タスク (${pending.length}件):`);
        for (const t of pending) {
          const pri = t.priority !== "\u901a\u5e38" ? ` [${t.priority}]` : "";
          lines.push(`- ${t.text}${pri}`);
        }
      } else {
        lines.push("未完了タスク: なし");
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("チーム構成:");
    for (const dept of chosen) {
      lines.push(
        `- ${dept.name}: subagent_type=${dept.agents.includes("Bash") ? "general-purpose" : dept.agents.includes("Plan") ? "Plan" : "Explore"}`
      );
    }

    return lines.join("\n");
  };

  const handleGenerate = () => {
    setShowPrompt(true);
    setCopied(false);
  };

  const handleCopy = () => {
    const text = generatePrompt();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="agent-panel section">
      <div className="agent-panel-header">
        <div className="section-title" style={{ margin: 0 }}>
          エージェントチーム起動
        </div>
        <button
          className="agent-select-all"
          onClick={selectAll}
        >
          {selected.size === launchable.length ? "全解除" : "全選択"}
        </button>
      </div>

      <div className="agent-dept-list">
        {launchable.map((dept, idx) => {
          const c = getDeptColor(idx);
          const pending = dept.files.reduce(
            (sum, f) => sum + f.stats.total - f.stats.done,
            0
          );
          return (
            <div
              key={dept.id}
              className={`agent-dept-row ${selected.has(dept.id) ? "selected" : ""}`}
              onClick={() => toggleDept(dept.id)}
            >
              <span
                className={`agent-checkbox ${selected.has(dept.id) ? "checked" : ""}`}
              />
              <span
                className="agent-dept-dot"
                style={{ background: c.color }}
              />
              <span className="agent-dept-name">{dept.name}</span>
              <div className="agent-dept-types">
                {dept.agents.map((t) => (
                  <AgentBadge key={t} type={t} />
                ))}
              </div>
              <span className="agent-dept-pending">
                {pending > 0 ? `${pending} 件` : "\u2713"}
              </span>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="agent-actions">
          <span className="agent-selected-count">
            {selected.size} 部署選択中
          </span>
          <button className="agent-generate-btn" onClick={handleGenerate}>
            起動プロンプト生成
          </button>
          {showPrompt && (
            <button
              className={`agent-copy-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
            >
              {copied ? "\u2713 コピー済み" : "クリップボードにコピー"}
            </button>
          )}
        </div>
      )}

      {showPrompt && (
        <div className="agent-prompt-output">
          <pre className="agent-prompt-text">{generatePrompt()}</pre>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export default function WorkTreeView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("flow");

  const load = useCallback(() => {
    setLoading(true);
    fetchWorkTree()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <div className="empty-state">読み込み中...</div>;
  }
  if (!data || data.departments.length === 0) {
    return <div className="empty-state">タスクデータがありません</div>;
  }

  return (
    <div className="worktree-view">
      <div className="worktree-summary section">
        <div className="worktree-summary-row">
          <div className="section-title" style={{ margin: 0 }}>
            組織全体の進捗
          </div>
          <div className="worktree-mode-toggle">
            <button
              className={`worktree-mode-btn ${mode === "flow" ? "active" : ""}`}
              onClick={() => setMode("flow")}
              title="ワークフロー"
            >
              &#9783;
            </button>
            <button
              className={`worktree-mode-btn ${mode === "tree" ? "active" : ""}`}
              onClick={() => setMode("tree")}
              title="ツリー"
            >
              &#9776;
            </button>
          </div>
        </div>
        <ProgressBar done={data.stats.done} total={data.stats.total} />
      </div>

      <AgentLaunchPanel departments={data.departments} />

      {mode === "tree" ? (
        <div className="worktree-tree">
          {data.departments.map((dept, idx) => (
            <DeptNode key={dept.id} dept={dept} colorIdx={idx} />
          ))}
        </div>
      ) : (
        <div className="flow-grid">
          {data.departments.map((dept, idx) => (
            <FlowDeptCard key={dept.id} dept={dept} colorIdx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
