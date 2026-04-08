import { useState, useRef, useCallback, useEffect } from "react";

const STORAGE_KEY = "cc-dept-order";

function loadOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveOrder(order) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function buildGroups(departments) {
  const core = departments.filter((d) => d.id === "secretary");
  const ops = departments.filter((d) =>
    ["開発部", "QA部", "インフラ部", "パフォーマンス部", "セキュリティ部"].includes(d.id)
  );
  const biz = departments.filter((d) =>
    ["リサーチ部", "プロダクト部", "ドキュメント部", "サポート部", "マーケティング部", "営業部", "経理部", "人事部", "クリエイティブ部"].includes(d.id)
  );
  const other = departments.filter((d) =>
    !core.includes(d) && !ops.includes(d) && !biz.includes(d)
  );

  const groups = [];
  if (core.length > 0) groups.push({ key: "core", title: "秘書室", items: core });
  if (ops.length > 0) groups.push({ key: "ops", title: "技術・運用", items: ops });
  if (biz.length > 0) groups.push({ key: "biz", title: "企画・管理", items: biz });
  if (other.length > 0) groups.push({ key: "other", title: "その他", items: other });
  return groups;
}

export default function Sidebar({ data, view, onNavigate, open, onClose }) {
  const org = data.organization || {};
  const departments = data.departments || [];

  const defaultGroups = buildGroups(departments);

  const [groupOrder, setGroupOrder] = useState(() => {
    const saved = loadOrder();
    if (saved) {
      const validKeys = defaultGroups.map((g) => g.key);
      const filtered = saved.filter((k) => validKeys.includes(k));
      const missing = validKeys.filter((k) => !filtered.includes(k));
      return [...filtered, ...missing];
    }
    return defaultGroups.map((g) => g.key);
  });

  useEffect(() => {
    const validKeys = defaultGroups.map((g) => g.key);
    const missing = validKeys.filter((k) => !groupOrder.includes(k));
    if (missing.length > 0) {
      setGroupOrder((prev) => [...prev.filter((k) => validKeys.includes(k)), ...missing]);
    }
  }, [departments.length]);

  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const onDragStart = useCallback((e, idx) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("dragging");
  }, []);

  const onDragEnd = useCallback((e) => {
    dragIdx.current = null;
    setDragOver(null);
    e.currentTarget.classList.remove("dragging");
  }, []);

  const onDragOverHandler = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(idx);
  }, []);

  const onDrop = useCallback((e, dropIdx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === dropIdx) return;

    setGroupOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(dropIdx, 0, moved);
      saveOrder(next);
      return next;
    });
    dragIdx.current = null;
    setDragOver(null);
  }, []);

  const groupMap = Object.fromEntries(defaultGroups.map((g) => [g.key, g]));
  const orderedGroups = groupOrder.map((k) => groupMap[k]).filter(Boolean);

  const DeptItem = ({ dept }) => (
    <div
      className={`sidebar-item ${view.type === "department" && view.deptId === dept.id ? "active" : ""}`}
      onClick={() => onNavigate("department", dept.id)}
    >
      <span className="sidebar-dot" />
      <span>{dept.name}</span>
      <span className="sidebar-count">{dept.fileCount}</span>
    </div>
  );

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-dot" />
          AXIS Web
        </div>
        <button className="menu-close" onClick={onClose}>&times;</button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">ナビゲーション</div>
        <div
          className={`sidebar-item ${view.type === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          &#9632; ダッシュボード
        </div>
        <div
          className={`sidebar-item ${view.type === "calendar" ? "active" : ""}`}
          onClick={() => onNavigate("calendar")}
        >
          &#128197; カレンダー
        </div>
        <div
          className={`sidebar-item ${view.type === "worktree" ? "active" : ""}`}
          onClick={() => onNavigate("worktree")}
        >
          &#9776; ワークツリー
        </div>
        <div
          className={`sidebar-item ${view.type === "explorer" ? "active" : ""}`}
          onClick={() => onNavigate("explorer")}
        >
          &#128193; エクスプローラー
        </div>
        <div
          className={`sidebar-item ${view.type === "search" ? "active" : ""}`}
          onClick={() => onNavigate("search")}
        >
          &#8981; 検索
        </div>
      </div>

      {org.business && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">組織</div>
          <div className="sidebar-item" style={{ color: "var(--text-muted)", fontSize: 12, cursor: "default" }}>
            {org.business}
          </div>
        </div>
      )}

      {orderedGroups.map((group, idx) => (
        <div
          key={group.key}
          className={`sidebar-section sidebar-section-draggable${dragOver === idx ? " drag-over" : ""}`}
          draggable
          onDragStart={(e) => onDragStart(e, idx)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOverHandler(e, idx)}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => onDrop(e, idx)}
        >
          <div className="sidebar-section-title sidebar-section-title-drag">
            <span className="drag-handle">&#8942;&#8942;</span>
            {group.title}
          </div>
          {group.items.map((d) => <DeptItem key={d.id} dept={d} />)}
        </div>
      ))}

      <div className="sidebar-section sidebar-links">
        <div className="sidebar-section-title">リンク</div>
        <a href="https://github.com/pta25pta/AXIS-Web" target="_blank" rel="noopener" className="sidebar-item sidebar-link">
          &#9758; AXIS-Web
        </a>
        <a href="https://github.com/pta25pta/cc-company" target="_blank" rel="noopener" className="sidebar-item sidebar-link">
          &#9758; ドキュメント
        </a>
      </div>
    </aside>
  );
}
