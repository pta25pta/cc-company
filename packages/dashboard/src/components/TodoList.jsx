export default function TodoList({ data }) {
  const today = data.todos?.today;

  if (!today) {
    return (
      <div className="section">
        <div className="section-title">今日のTODO</div>
        <div className="empty-state">今日のTODOはありません</div>
      </div>
    );
  }

  const { sections } = today;

  return (
    <div className="section">
      <div className="section-title">今日のTODO &mdash; {today.date}</div>
      <TodoGroup title="最優先" items={sections.topPriority} />
      <TodoGroup title="通常" items={sections.normal} />
      <TodoGroup title="低優先" items={sections.low} />
      <TodoGroup title="完了済み" items={sections.completed} />
    </div>
  );
}

function TodoGroup({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="todo-group">
      <div className="todo-group-title">{title} ({items.length})</div>
      {items.map((item, i) => (
        <div key={i} className="todo-item">
          <div className={`todo-checkbox ${item.done ? "done" : ""}`} />
          <span className={`todo-text ${item.done ? "done" : ""}`}>{item.text}</span>
          {item.priority && item.priority !== "通常" && (
            <span className={`todo-priority priority-${item.priority}`}>{item.priority}</span>
          )}
        </div>
      ))}
    </div>
  );
}
