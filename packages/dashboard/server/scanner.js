import fs from "fs";
import path from "path";
import {
  parseFrontmatter,
  parseTodoFile,
  parseInboxFile,
  parseOrganizationInfo,
  parseDepartmentInfo,
  parseCheckbox,
  getStatusFromFrontmatter,
} from "./parser.js";

const KNOWN_DEPARTMENTS = {
  secretary: "秘書室",
  pm: "PM",
  research: "リサーチ",
  marketing: "マーケティング",
  engineering: "開発",
  finance: "経理",
  sales: "営業",
  creative: "クリエイティブ",
  hr: "人事",
};

export function scan(companyDir) {
  const result = {
    organization: getOrganizationInfo(companyDir),
    departments: getDepartments(companyDir),
    todos: getTodos(companyDir),
    inbox: getInbox(companyDir),
    departmentStats: getDepartmentStats(companyDir),
    recentActivity: getRecentActivity(companyDir),
  };
  return result;
}

function getOrganizationInfo(companyDir) {
  const claudeMd = path.join(companyDir, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) return { business: "", goals: "", createdDate: "" };
  const content = fs.readFileSync(claudeMd, "utf-8");
  return parseOrganizationInfo(content);
}

function getDepartments(companyDir) {
  const departments = [];
  let entries;
  try {
    entries = fs.readdirSync(companyDir, { withFileTypes: true });
  } catch {
    return departments;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const deptDir = path.join(companyDir, entry.name);
    const claudeMd = path.join(deptDir, "CLAUDE.md");

    let name = KNOWN_DEPARTMENTS[entry.name] || entry.name;
    let role = "";

    if (fs.existsSync(claudeMd)) {
      const info = parseDepartmentInfo(fs.readFileSync(claudeMd, "utf-8"));
      if (info.name) name = info.name;
      if (info.role) role = info.role;
    }

    const fileCount = countFiles(deptDir);
    const subfolders = getSubfolders(deptDir);

    departments.push({
      id: entry.name,
      name,
      role,
      fileCount,
      subfolders,
    });
  }

  return departments;
}

function getTodos(companyDir) {
  const todosDir = path.join(companyDir, "secretary", "todos");
  if (!fs.existsSync(todosDir)) return { today: null, recent: [] };

  const today = formatDate(new Date());
  const todayFile = path.join(todosDir, `${today}.md`);

  let todayData = null;
  if (fs.existsSync(todayFile)) {
    const content = fs.readFileSync(todayFile, "utf-8");
    todayData = { date: today, ...parseTodoFile(content) };
  }

  const recent = [];
  try {
    const files = fs.readdirSync(todosDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 7);
    for (const file of files) {
      const date = file.replace(".md", "");
      if (date === today) continue;
      const content = fs.readFileSync(path.join(todosDir, file), "utf-8");
      const parsed = parseTodoFile(content);
      recent.push({ date, ...parsed });
    }
  } catch { /* empty */ }

  return { today: todayData, recent };
}

function getInbox(companyDir) {
  const inboxDir = path.join(companyDir, "secretary", "inbox");
  if (!fs.existsSync(inboxDir)) return { today: null, totalEntries: 0 };

  const today = formatDate(new Date());
  const todayFile = path.join(inboxDir, `${today}.md`);

  let todayData = null;
  if (fs.existsSync(todayFile)) {
    const content = fs.readFileSync(todayFile, "utf-8");
    todayData = { date: today, ...parseInboxFile(content) };
  }

  let totalEntries = 0;
  try {
    const files = fs.readdirSync(inboxDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(inboxDir, file), "utf-8");
      const parsed = parseInboxFile(content);
      totalEntries += parsed.entries.length;
    }
  } catch { /* empty */ }

  return { today: todayData, totalEntries };
}

function getDepartmentStats(companyDir) {
  const stats = {};
  let entries;
  try {
    entries = fs.readdirSync(companyDir, { withFileTypes: true });
  } catch {
    return stats;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "secretary" || entry.name.startsWith(".")) continue;

    const deptDir = path.join(companyDir, entry.name);
    const statusCounts = {};

    collectStatuses(deptDir, statusCounts);
    if (Object.keys(statusCounts).length > 0) {
      stats[entry.name] = statusCounts;
    }
  }

  return stats;
}

function collectStatuses(dir, statusCounts) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectStatuses(fullPath, statusCounts);
    } else if (entry.name.endsWith(".md") && entry.name !== "CLAUDE.md" && !entry.name.startsWith("_")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const status = getStatusFromFrontmatter(content);
        if (status) {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
      } catch { /* empty */ }
    }
  }
}

function getRecentActivity(companyDir) {
  const activities = [];
  collectFiles(companyDir, companyDir, activities);
  activities.sort((a, b) => b.modified - a.modified);
  return activities.slice(0, 20);
}

function collectFiles(baseDir, dir, activities) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".")) {
        collectFiles(baseDir, fullPath, activities);
      }
    } else if (entry.name.endsWith(".md") && entry.name !== "CLAUDE.md" && !entry.name.startsWith("_")) {
      try {
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        activities.push({
          file: relativePath,
          modified: stat.mtimeMs,
          modifiedAt: stat.mtime.toISOString(),
          department: relativePath.split("/")[0],
        });
      } catch { /* empty */ }
    }
  }
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".md") && entry.name !== "CLAUDE.md" && !entry.name.startsWith("_")) {
        count++;
      }
    }
  } catch { /* empty */ }
  return count;
}

function getSubfolders(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export function scanTree(companyDir) {
  return buildTreeNode(companyDir, companyDir);
}

function buildTreeNode(baseDir, dir) {
  const nodes = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return nodes;
  }

  // Folders first, then files
  const folders = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const files = entries.filter(
    (e) => !e.isDirectory() && e.name.endsWith(".md") && e.name !== "CLAUDE.md" && !e.name.startsWith("_")
  );

  for (const folder of folders) {
    const fullPath = path.join(dir, folder.name);
    const children = buildTreeNode(baseDir, fullPath);
    const fileCount = countFiles(fullPath);
    nodes.push({
      name: folder.name,
      displayName: KNOWN_DEPARTMENTS[folder.name] || folder.name,
      type: "folder",
      fileCount,
      children,
    });
  }

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    let status = null;
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      status = getStatusFromFrontmatter(content);
    } catch { /* empty */ }

    nodes.push({
      name: file.name,
      type: "file",
      status,
    });
  }

  return nodes;
}

export function scanDepartment(companyDir, deptId) {
  const deptDir = path.join(companyDir, deptId);
  if (!fs.existsSync(deptDir)) return null;

  const claudeMd = path.join(deptDir, "CLAUDE.md");
  let name = KNOWN_DEPARTMENTS[deptId] || deptId;
  let role = "";
  if (fs.existsSync(claudeMd)) {
    const info = parseDepartmentInfo(fs.readFileSync(claudeMd, "utf-8"));
    if (info.name) name = info.name;
    if (info.role) role = info.role;
  }

  const files = [];
  collectDepartmentFiles(deptDir, deptDir, files);
  files.sort((a, b) => b.modified - a.modified);

  return { id: deptId, name, role, files };
}

function collectDepartmentFiles(baseDir, dir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectDepartmentFiles(baseDir, fullPath, files);
    } else if (entry.name.endsWith(".md") && entry.name !== "CLAUDE.md" && !entry.name.startsWith("_")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const { data, body } = parseFrontmatter(content);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        files.push({
          path: relativePath,
          title: extractTitle(body) || entry.name.replace(".md", ""),
          status: data.status || null,
          type: data.type || null,
          date: data.date || data.created || null,
          modified: stat.mtimeMs,
          modifiedAt: stat.mtime.toISOString(),
          preview: body.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 3).join(" ").substring(0, 150),
        });
      } catch { /* empty */ }
    }
  }
}

function extractTitle(body) {
  for (const line of body.split("\n")) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

export function getCalendarData(companyDir, year, month) {
  const days = {};

  function addTodo(dateStr, todo) {
    if (!days[dateStr]) days[dateStr] = { todos: [] };
    days[dateStr].todos.push(todo);
  }

  function collectCalendarFiles(dir, dept, relBase) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        collectCalendarFiles(fullPath, dept, relBase);
      } else if (entry.name.endsWith(".md") && entry.name !== "CLAUDE.md" && !entry.name.startsWith("_")) {
        const fileDate = (entry.name.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
        const relativePath = path.relative(relBase, fullPath).replace(/\\/g, "/");

        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            const cb = parseCheckbox(trimmed);
            if (!cb) continue;

            const targetDate = cb.deadline || fileDate;
            if (!targetDate) continue;

            const [y, m] = targetDate.split("-").map(Number);
            if (y !== year || m !== month) continue;

            addTodo(targetDate, {
              text: cb.text,
              done: cb.done,
              priority: cb.priority,
              department: dept,
              file: relativePath,
            });
          }
        } catch { /* empty */ }
      }
    }
  }

  // Scan secretary
  const secDir = path.join(companyDir, "secretary");
  if (fs.existsSync(secDir)) {
    collectCalendarFiles(secDir, "secretary", companyDir);
  }

  // Scan all departments
  try {
    const entries = fs.readdirSync(companyDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "secretary" || entry.name.startsWith(".")) continue;
      const deptDir = path.join(companyDir, entry.name);
      collectCalendarFiles(deptDir, entry.name, companyDir);
    }
  } catch { /* empty */ }

  return { year, month, days };
}

export function getWorkTree(companyDir) {
  const departments = [];
  let totalAll = 0;
  let doneAll = 0;

  let entries;
  try {
    entries = fs.readdirSync(companyDir, { withFileTypes: true });
  } catch {
    return { departments: [], stats: { total: 0, done: 0 } };
  }

  // Parse main CLAUDE.md for agent type mapping
  const agentMap = parseAgentTable(companyDir);

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const deptDir = path.join(companyDir, entry.name);
    const deptName = KNOWN_DEPARTMENTS[entry.name] || entry.name;
    const files = [];
    let deptTotal = 0;
    let deptDone = 0;

    collectWorkTreeFiles(deptDir, deptDir, files);

    for (const file of files) {
      deptTotal += file.stats.total;
      deptDone += file.stats.done;
    }

    // Parse agent config from dept CLAUDE.md
    const mapped = agentMap[entry.name] || {};
    const deptClaudeMd = path.join(deptDir, "CLAUDE.md");
    let agentDetail = { capabilities: [], role: "" };
    if (fs.existsSync(deptClaudeMd)) {
      agentDetail = parseDeptAgentDetail(
        fs.readFileSync(deptClaudeMd, "utf-8")
      );
    }

    totalAll += deptTotal;
    doneAll += deptDone;
    departments.push({
      id: entry.name,
      name: mapped.displayName || deptName,
      files,
      stats: { total: deptTotal, done: deptDone },
      agents: mapped.types || [],
      agentRole: mapped.role || agentDetail.role || "",
      capabilities: agentDetail.capabilities,
    });
  }

  return { departments, stats: { total: totalAll, done: doneAll } };
}

function parseAgentTable(companyDir) {
  const claudeMd = path.join(companyDir, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) return {};

  const content = fs.readFileSync(claudeMd, "utf-8");
  const mapping = {};
  const lines = content.split("\n");
  let inTable = false;

  for (const line of lines) {
    if (line.includes("| 部署") && line.includes("エージェント")) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.trim().startsWith("|---")) continue;
    if (!line.trim().startsWith("|")) { inTable = false; continue; }

    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 4) continue;

    const displayName = cols[0];
    const folder = cols[1];
    const role = cols[2];
    const agentStr = cols[3];

    const types = [];
    for (const t of ["Bash", "Explore", "Plan"]) {
      if (agentStr.includes(t)) types.push(t);
    }

    mapping[folder] = { displayName, role, types };
  }

  return mapping;
}

function parseDeptAgentDetail(content) {
  const result = { capabilities: [], role: "" };

  // Role from first ## 役割 section
  const roleMatch = content.match(/##\s*役割\n([\s\S]*?)(?=\n##|$)/);
  if (roleMatch) {
    result.role = roleMatch[1].trim().split("\n")[0].trim();
  }

  // Capabilities from ## エージェント能力
  const capMatch = content.match(
    /##\s*エージェント能力\n([\s\S]*?)(?=\n##|$)/
  );
  if (capMatch) {
    for (const line of capMatch[1].split("\n")) {
      const m = line.match(/^-\s+(.+)/);
      if (m) result.capabilities.push(m[1].replace(/\*\*/g, "").trim());
    }
  }

  return result;
}

function collectWorkTreeFiles(baseDir, dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      collectWorkTreeFiles(baseDir, fullPath, results);
    } else if (
      entry.name.endsWith(".md") &&
      entry.name !== "CLAUDE.md" &&
      !entry.name.startsWith("_")
    ) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const tasks = [];
        for (const line of content.split("\n")) {
          const cb = parseCheckbox(line.trim());
          if (cb) {
            tasks.push({
              text: cb.text,
              done: cb.done,
              priority: cb.priority,
            });
          }
        }
        if (tasks.length > 0) {
          const relativePath = path
            .relative(baseDir, fullPath)
            .replace(/\\/g, "/");
          const title =
            extractTitle(content) || entry.name.replace(".md", "");
          const done = tasks.filter((t) => t.done).length;
          results.push({
            path: relativePath,
            title,
            tasks,
            stats: { total: tasks.length, done },
          });
        }
      } catch {
        /* empty */
      }
    }
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
