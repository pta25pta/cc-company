export async function fetchDashboard() {
  const res = await fetch("/api/dashboard");
  return res.json();
}

export async function fetchDepartment(id) {
  const res = await fetch(`/api/department/${id}`);
  if (!res.ok) throw new Error("Department not found");
  return res.json();
}

export async function fetchCalendar(year, month) {
  const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
  return res.json();
}

export async function fetchWorkTree() {
  const res = await fetch("/api/worktree");
  if (!res.ok) throw new Error("WorkTree fetch failed");
  return res.json();
}
