import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";

let initialized = false;

function initMermaid(theme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    fontFamily: "var(--font-mono), monospace",
    flowchart: { curve: "basis", padding: 12 },
    securityLevel: "loose",
  });
  initialized = true;
}

let counter = 0;

export default function MermaidBlock({ chart }) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const idRef = useRef(`mermaid-${++counter}`);
  const baseScale = useRef(1);        // fit時の実スケール = 表示上の100%
  const [scale, setScale] = useState(1);
  const [fitted, setFitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    if (!initialized) initMermaid(theme);

    let cancelled = false;

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(idRef.current, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
          setFitted(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Mermaid render error");
          setSvg("");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [chart]);

  // Auto-fit: scale SVG to fill container width, treat as 100%
  useEffect(() => {
    if (fitted || !svg || !containerRef.current || !innerRef.current) return;
    const svgEl = innerRef.current.querySelector("svg");
    if (!svgEl) return;

    const containerW = containerRef.current.clientWidth;
    const svgW = svgEl.getBoundingClientRect().width;

    if (svgW > 0 && containerW > 0) {
      const fitScale = (containerW - 40) / svgW;
      const clamped = Math.min(Math.max(fitScale, 0.3), 20);
      baseScale.current = clamped;
      setScale(clamped);
      setPos({ x: 0, y: 0 });
      setFitted(true);
    }
  }, [svg, fitted]);

  const zoomStep = baseScale.current * 0.1; // 10% of base

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const step = baseScale.current * 0.1;
    setScale((s) => {
      const next = s + (e.deltaY < 0 ? step : -step);
      return Math.min(Math.max(next, baseScale.current * 0.1), baseScale.current * 5);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }, [pos]);

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  const reset = useCallback(() => {
    setFitted(false);
  }, []);

  if (error) {
    return (
      <div className="mermaid-error">
        <pre>{chart}</pre>
        <p style={{ color: "var(--accent-red, #e55)" }}>{error}</p>
      </div>
    );
  }

  // Display percentage relative to base (fit = 100%)
  const pct = Math.round((scale / baseScale.current) * 100);

  return (
    <div className="mermaid-wrapper">
      <div className="mermaid-toolbar">
        <button className="mermaid-btn" onClick={() => setScale((s) => Math.min(s + baseScale.current * 0.15, baseScale.current * 5))}>+</button>
        <span className="mermaid-zoom-label">{pct}%</span>
        <button className="mermaid-btn" onClick={() => setScale((s) => Math.max(s - baseScale.current * 0.15, baseScale.current * 0.1))}>-</button>
        <button className="mermaid-btn mermaid-btn-reset" onClick={reset}>Fit</button>
      </div>
      <div
        ref={containerRef}
        className="mermaid-container"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
      >
        <div
          ref={innerRef}
          className="mermaid-inner"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
