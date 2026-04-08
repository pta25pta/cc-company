import { useState, useEffect, useCallback } from "react";
import { fetchCalendar } from "../services/api";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const DEPT_COLORS = [
  { bg: "var(--accent-dim)", color: "var(--text-accent)" },
  { bg: "var(--green-dim)", color: "var(--green)" },
  { bg: "var(--yellow-dim)", color: "var(--yellow)" },
  { bg: "var(--red-dim)", color: "var(--red)" },
  { bg: "var(--blue-dim)", color: "var(--blue)" },
];

function getDeptColor(dept, map) {
  if (!map.has(dept)) {
    map.set(dept, DEPT_COLORS[map.size % DEPT_COLORS.length]);
  }
  return map.get(dept);
}

export default function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    fetchCalendar(year, month).then(setData).catch(console.error);
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const prev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
    setSelected(null);
  };

  const next = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
    setSelected(null);
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
    setSelected(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const days = data?.days || {};

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const deptColorMap = new Map();
  const selectedKey = selected ? `${year}-${String(month).padStart(2, "0")}-${String(selected).padStart(2, "0")}` : null;
  const selectedTodos = selectedKey ? (days[selectedKey]?.todos || []) : [];

  // Group selected todos by department
  const grouped = {};
  for (const t of selectedTodos) {
    const dept = t.department;
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(t);
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={prev}>&larr;</button>
          <span className="calendar-month-label">{year}年{month}月</span>
          <button className="calendar-nav-btn" onClick={next}>&rarr;</button>
        </div>
        <button className="calendar-today-btn" onClick={goToday}>今日</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="calendar-day empty" />;

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = days[dateStr];
          const todos = dayData?.todos || [];
          const incomplete = todos.filter((t) => !t.done).length;
          const complete = todos.filter((t) => t.done).length;
          const isToday = dateStr === todayStr;
          const isSelected = day === selected;

          return (
            <div
              key={day}
              className={`calendar-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}${todos.length > 0 ? " has-tasks" : ""}`}
              onClick={() => setSelected(day)}
            >
              <div className="calendar-day-number">{day}</div>
              {todos.length > 0 && (
                <div className="calendar-day-tasks">
                  {todos.slice(0, 3).map((t, j) => {
                    const c = getDeptColor(t.department, deptColorMap);
                    return (
                      <div
                        key={j}
                        className={`calendar-task${t.done ? " done" : ""}`}
                        style={{ background: c.bg, color: c.color }}
                        title={t.text}
                      >
                        {t.text.length > 12 ? t.text.slice(0, 12) + "..." : t.text}
                      </div>
                    );
                  })}
                  {todos.length > 3 && (
                    <div className="calendar-task-more">+{todos.length - 3}</div>
                  )}
                </div>
              )}
              {todos.length > 0 && (
                <div className="calendar-day-badge">
                  {incomplete > 0 && <span className="badge-incomplete">{incomplete}</span>}
                  {complete > 0 && <span className="badge-complete">{complete}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="calendar-detail">
          <div className="calendar-detail-header">
            <span className="calendar-detail-date">{year}年{month}月{selected}日</span>
            <span className="calendar-detail-count">
              {selectedTodos.length > 0 ? `${selectedTodos.length} タスク` : "タスクなし"}
            </span>
          </div>

          {Object.keys(grouped).length === 0 && (
            <div className="empty-state">この日のタスクはありません</div>
          )}

          {Object.entries(grouped).map(([dept, items]) => {
            const c = getDeptColor(dept, deptColorMap);
            return (
              <div key={dept} className="calendar-detail-group">
                <div className="calendar-detail-dept" style={{ background: c.bg, color: c.color }}>{dept}</div>
                {items.map((t, j) => (
                  <div key={j} className="calendar-detail-item">
                    <div className={`todo-checkbox${t.done ? " done" : ""}`} />
                    <span className={`todo-text${t.done ? " done" : ""}`}>{t.text}</span>
                    <span className={`todo-priority priority-${t.priority}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
