import { useRef, useEffect, useState } from "react";

export default function GraphView({ data, onNavigate }) {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const nodes = [];
    const links = [];

    const deptCount = (data.departments || []).length;

    // Build nodes from data
    const centerNode = {
      id: "company",
      label: ".company",
      type: "root",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 24,
      color: "#818cf8",
    };
    nodes.push(centerNode);

    const deptPalette = [
      "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c",
      "#fbbf24", "#2dd4bf", "#e879f9", "#38bdf8", "#f87171",
      "#84cc16", "#c084fc", "#22d3ee", "#f59e0b",
    ];

    const baseRadius = Math.max(200, deptCount * 30);

    (data.departments || []).forEach((dept, di) => {
      // Even radial placement instead of random
      const angle = (di / deptCount) * Math.PI * 2 - Math.PI / 2;
      const dist = baseRadius;
      const color = deptPalette[di % deptPalette.length];

      const deptNode = {
        id: dept.id,
        label: dept.name,
        type: "dept",
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 16,
        color,
        fileCount: dept.fileCount,
      };
      nodes.push(deptNode);
      links.push({ source: "company", target: dept.id });

      // Subfolders fan out from department
      const subs = dept.subfolders || [];
      const fanSpread = Math.min(0.4, 1.2 / Math.max(subs.length, 1));
      subs.forEach((sub, si) => {
        const offset = (si - (subs.length - 1) / 2) * fanSpread;
        const subAngle = angle + offset;
        const subDist = dist + 100 + si * 10;
        const subNode = {
          id: `${dept.id}/${sub}`,
          label: sub,
          type: "folder",
          x: Math.cos(subAngle) * subDist,
          y: Math.sin(subAngle) * subDist,
          vx: 0,
          vy: 0,
          radius: 7,
          color,
        };
        nodes.push(subNode);
        links.push({ source: dept.id, target: subNode.id });
      });
    });

    // Pre-build node index for faster lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Force simulation
    const simulation = { nodes, links, alpha: 1 };

    function tick() {
      const { nodes, links } = simulation;

      // Center gravity (gentle)
      for (const node of nodes) {
        if (node.type === "root") continue;
        node.vx -= node.x * 0.0003;
        node.vy -= node.y * 0.0003;
      }

      // Link force — keep connected nodes at target distance
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) continue;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = source.type === "root" ? baseRadius : 90;
        const force = (dist - targetDist) * 0.003;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        target.vx -= fx;
        target.vy -= fy;
        source.vx += fx;
        source.vy += fy;
      }

      // Repulsion — all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const minDist = (a.radius + b.radius) * 5;
          const minDistSq = minDist * minDist;

          if (distSq < minDistSq) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (minDist - dist) * 0.03;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Angular repulsion between departments (prevent bunching)
      const deptNodes = nodes.filter((n) => n.type === "dept");
      for (let i = 0; i < deptNodes.length; i++) {
        for (let j = i + 1; j < deptNodes.length; j++) {
          const a = deptNodes[i];
          const b = deptNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 140;

          if (dist < minDist) {
            const force = (minDist - dist) * 0.05;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Apply velocity with damping
      for (const node of nodes) {
        if (node.type === "root" || node.fixed) continue;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
      }

      simulation.alpha = Math.max(simulation.alpha * 0.993, 0.005);
    }

    // Camera — auto-fit on load
    let camX = 0, camY = 0, camZoom = 1;
    let dragging = null;
    let panning = false;
    let panStartX = 0, panStartY = 0;
    let initialFit = true;

    function autoFitCamera() {
      if (nodes.length < 2) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
      camX = (minX + maxX) / 2;
      camY = (minY + maxY) / 2;
      const spanX = maxX - minX + 200;
      const spanY = maxY - minY + 200;
      camZoom = Math.min(
        canvas.width / spanX,
        canvas.height / spanY,
        1.2
      );
      camZoom = Math.max(0.3, camZoom);
    }

    function screenToWorld(sx, sy) {
      return {
        x: (sx - canvas.width / 2) / camZoom + camX,
        y: (sy - canvas.height / 2) / camZoom + camY,
      };
    }

    function worldToScreen(wx, wy) {
      return {
        x: (wx - camX) * camZoom + canvas.width / 2,
        y: (wy - camY) * camZoom + canvas.height / 2,
      };
    }

    function getNodeAt(wx, wy) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = wx - n.x;
        const dy = wy - n.y;
        if (dx * dx + dy * dy < (n.radius + 6) * (n.radius + 6)) return n;
      }
      return null;
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    function draw() {
      resize();
      if (simulation.alpha > 0.01) tick();

      // Auto-fit camera once simulation stabilizes a bit
      if (initialFit && simulation.alpha < 0.5) {
        autoFitCamera();
        initialFit = false;
      }

      const isDark = document.documentElement.getAttribute("data-theme") !== "light";

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Links — curved lines
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) continue;

        const s = worldToScreen(source.x, source.y);
        const t = worldToScreen(target.x, target.y);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        // Slight curve for visual appeal
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const cx = mx + dy * 0.05;
        const cy = my - dx * 0.05;
        ctx.quadraticCurveTo(cx, cy, t.x, t.y);
        ctx.strokeStyle = isDark ? "rgba(99, 118, 163, 0.2)" : "rgba(15, 23, 42, 0.1)";
        ctx.lineWidth = source.type === "root" ? 2 : 1.2;
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        const { x, y } = worldToScreen(node.x, node.y);
        const r = node.radius * camZoom;
        const isHovered = hoveredNode === node.id;

        // Skip tiny nodes when zoomed out
        if (r < 2 && node.type === "folder") continue;

        // Glow
        if (node.type !== "folder" || isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, r + (isHovered ? 10 : 5), 0, Math.PI * 2);
          ctx.fillStyle = node.color + (isHovered ? "35" : "18");
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "#0c1019" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // File count badge for departments
        if (node.type === "dept" && node.fileCount > 0 && camZoom > 0.4) {
          const badgeR = Math.max(8, r * 0.5) * Math.min(camZoom, 1.2);
          const bx = x + r * 0.7;
          const by = y - r * 0.7;
          ctx.beginPath();
          ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.font = `600 ${badgeR * 1.1}px 'Inter', sans-serif`;
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.fileCount, bx, by + 0.5);
          ctx.textBaseline = "alphabetic";
        }

        // Label
        const showLabel = node.type !== "folder"
          ? camZoom > 0.3
          : camZoom > 0.6 || isHovered;

        if (showLabel) {
          const fontSize = node.type === "root" ? 14 : node.type === "dept" ? 12 : 10;
          const weight = node.type === "root" ? 700 : node.type === "dept" ? 600 : 400;
          ctx.font = `${weight} ${fontSize * Math.min(camZoom, 1.4)}px 'Noto Sans JP', 'Inter', sans-serif`;
          ctx.fillStyle = isDark
            ? (isHovered ? "#f0f2f7" : "#9ba3b8")
            : (isHovered ? "#0f172a" : "#475569");
          ctx.textAlign = "center";
          ctx.fillText(node.label, x, y + r + 16 * Math.min(camZoom, 1.2));
        }
      }

      requestAnimationFrame(draw);
    }

    // Events
    let dragStartX = 0, dragStartY = 0, didDrag = false;

    canvas.addEventListener("mousedown", (e) => {
      const { x, y } = screenToWorld(e.offsetX, e.offsetY);
      dragStartX = e.offsetX;
      dragStartY = e.offsetY;
      didDrag = false;
      const node = getNodeAt(x, y);
      if (node) {
        dragging = node;
        simulation.alpha = 0.3;
      } else {
        panning = true;
        panStartX = e.offsetX;
        panStartY = e.offsetY;
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      const { x, y } = screenToWorld(e.offsetX, e.offsetY);

      if (dragging) {
        const moveDist = Math.abs(e.offsetX - dragStartX) + Math.abs(e.offsetY - dragStartY);
        if (moveDist > 5) didDrag = true;
        const dx = x - dragging.x;
        const dy = y - dragging.y;
        dragging.x = x;
        dragging.y = y;
        dragging.vx = 0;
        dragging.vy = 0;

        // Move connected unfixed nodes along
        for (const link of links) {
          let child = null;
          if (link.source === dragging.id) child = nodeMap.get(link.target);
          if (child && !child.fixed) {
            child.x += dx * 0.6;
            child.y += dy * 0.6;
          }
        }

        simulation.alpha = Math.max(simulation.alpha, 0.1);
      } else if (panning) {
        camX -= (e.offsetX - panStartX) / camZoom;
        camY -= (e.offsetY - panStartY) / camZoom;
        panStartX = e.offsetX;
        panStartY = e.offsetY;
      } else {
        const node = getNodeAt(x, y);
        setHoveredNode(node ? node.id : null);
        canvas.style.cursor = node ? (node.type !== "root" ? "pointer" : "grab") : "default";
      }
    });

    const handleMouseUp = () => {
      if (dragging && !didDrag && onNavigate) {
        const deptId = dragging.type === "dept" ? dragging.id
          : dragging.type === "folder" ? dragging.id.split("/")[0]
          : null;
        if (deptId) onNavigate("department", deptId);
      }
      if (dragging) {
        dragging.fixed = true;
      }
      dragging = null;
      panning = false;
    };
    document.addEventListener("mouseup", handleMouseUp);

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      camZoom = Math.max(0.2, Math.min(3, camZoom * zoomFactor));
    }, { passive: false });

    draw();

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [data]);

  return (
    <div className="graph-view">
      <div className="dept-detail-top">
        <h2 className="detail-title">グラフビュー</h2>
        <p className="detail-role">ドラッグで移動、スクロールでズーム、クリックで部署詳細</p>
      </div>
      <div className="graph-canvas-wrapper">
        <canvas ref={canvasRef} className="graph-canvas" />
      </div>
    </div>
  );
}
