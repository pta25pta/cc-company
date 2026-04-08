export default function ActivityFeed({ data }) {
  const activities = data.recentActivity || [];

  return (
    <div className="section">
      <div className="section-title">最近の操作</div>
      {activities.length === 0 ? (
        <div className="empty-state">最近の操作はありません</div>
      ) : (
        activities.slice(0, 15).map((a, i) => (
          <div key={i} className="activity-item">
            <span className="activity-dept">{a.department}</span>
            <span className="activity-file">{a.file}</span>
            <span className="activity-time">{timeAgo(a.modifiedAt)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}
