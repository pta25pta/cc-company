export default function OverviewCards({ data }) {
  const stats = data.todos?.today?.stats || { incomplete: 0, complete: 0 };
  const inboxCount = data.inbox?.totalEntries || 0;
  const deptCount = data.departments?.length || 0;

  return (
    <div className="overview-grid">
      <Card
        value={stats.incomplete}
        label="TODO"
        sub={`${stats.complete}件完了`}
        color={stats.incomplete > 0 ? "var(--yellow)" : "var(--green)"}
      />
      <Card value={inboxCount} label="受信箱" sub="全エントリ" color="var(--blue)" />
      <Card value={deptCount} label="部署" sub="稼働中" color="var(--primary)" />
      <Card
        value={stats.complete}
        label="完了"
        sub="今日"
        color="var(--green)"
      />
    </div>
  );
}

function Card({ value, label, sub, color }) {
  return (
    <div className="overview-card">
      <div className="overview-value" style={{ color }}>{value}</div>
      <div className="overview-label">{label}</div>
      <div className="overview-sub">{sub}</div>
    </div>
  );
}
