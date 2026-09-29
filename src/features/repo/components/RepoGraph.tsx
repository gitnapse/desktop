import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Focus, Maximize2, Thermometer, ZoomIn, ZoomOut } from "lucide-react";
import { Checkbox, Input, Select, StatusLine } from "../../../ui";
import type { TreeNodeDto } from "../../../lib/types";
import {
  DEFAULT_MAX_NODES,
  HARD_MAX_NODES,
  buildRepoGraph,
  isHub,
  stepSimulation,
  type GraphNode,
  type RepoGraph as RepoGraphModel,
} from "../lib/graph";

export interface RepoGraphProps {
  tree?: readonly TreeNodeDto[];
  /** Prebuilt model (profile graph); when absent the tree is used. */
  model?: RepoGraphModel;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  repo?: string;
  onOpenFile?: (path: string) => void;
  onOpenNode?: (node: GraphNode) => void;
  extraControls?: ReactNode;
  emptyLabel?: string;
}

interface Palette {
  colors: string[];
  ink: string;
  muted: string;
  faint: string;
  bg: string;
  focus: string;
}

interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const EMPTY_PALETTE: Palette = {
  colors: ["#6ea8f7", "#5db26e", "#ef6a72", "#d4a843", "#c586c0", "#4ec9b0", "#dcdcaa"],
  ink: "#e8e8e8",
  muted: "#999999",
  faint: "#666666",
  bg: "#000000",
  focus: "#ffffff",
};

const sizeOptions = [
  { value: "1000", label: "1,000 nodes" },
  { value: "4000", label: "4,000 nodes" },
  { value: "20000", label: "20,000 nodes" },
  { value: String(HARD_MAX_NODES), label: "All nodes" },
];

const nodeSizeOptions = [
  { value: "0.1", label: "Nodes 10%" },
  { value: "0.2", label: "Nodes 20%" },
  { value: "0.5", label: "Nodes 50%" },
  { value: "0.8", label: "Nodes 80%" },
  { value: "1", label: "Nodes 100%" },
  { value: "1.5", label: "Nodes 150%" },
];

function parseColor(value: string): [number, number, number] | null {
  const input = value.trim();
  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1]!;
    const full =
      digits.length === 3
        ? digits
            .split("")
            .map((c) => c + c)
            .join("")
        : digits;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = input.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]!.split(/[,/]/).map((part) => Number.parseFloat(part));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return [parts[0]!, parts[1]!, parts[2]!];
    }
  }
  return null;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const channel = (index: number) => Math.round(a[index]! + (b[index]! - a[index]!) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function readPalette(): Palette {
  if (typeof window === "undefined") {
    return EMPTY_PALETTE;
  }
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const base = [
    read("--accent", "#6ea8f7"),
    read("--accent-2", "#5db26e"),
    read("--accent-3", "#ef6a72"),
    read("--status-warn", "#d4a843"),
  ]
    .map(parseColor)
    .filter((color): color is [number, number, number] => color !== null);

  const colors: string[] = base.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
  for (let i = 0; i < base.length && colors.length < 10; i += 1) {
    for (let j = i + 1; j < base.length && colors.length < 10; j += 1) {
      colors.push(mix(base[i]!, base[j]!, 0.5));
    }
  }
  return {
    colors: colors.length > 0 ? colors : EMPTY_PALETTE.colors,
    ink: read("--ink", EMPTY_PALETTE.ink),
    muted: read("--ink-muted", EMPTY_PALETTE.muted),
    faint: read("--ink-faint", EMPTY_PALETTE.faint),
    bg: read("--bg", EMPTY_PALETTE.bg),
    focus: read("--focus-ring", EMPTY_PALETTE.focus),
  };
}

function colorFor(palette: Palette, categories: readonly string[], category: string): string {
  const index = categories.indexOf(category);
  return palette.colors[index % palette.colors.length] ?? palette.ink;
}

export function RepoGraph({
  tree,
  model,
  loading = false,
  error = null,
  onRetry,
  repo = "",
  onOpenFile,
  onOpenNode,
  extraControls,
  emptyLabel = "[NO NODES]",
}: RepoGraphProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef<RepoGraphModel>({
    nodes: [],
    links: [],
    total: 0,
    truncated: false,
    categories: [],
  });
  const paletteRef = useRef<Palette>(EMPTY_PALETTE);
  const viewRef = useRef<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef<{ mode: "pan" | "node"; index: number; x: number; y: number } | null>(null);
  const hoverRef = useRef<number>(-1);
  const selectedRef = useRef<number>(-1);
  const queryRef = useRef("");
  const labelsRef = useRef(true);
  const energyRef = useRef(Infinity);
  const dirtyRef = useRef(true);
  const nodeScaleRef = useRef(0.2);
  const onOpenFileRef = useRef(onOpenFile);
  const onOpenNodeRef = useRef(onOpenNode);

  useEffect(() => {
    onOpenFileRef.current = onOpenFile;
    onOpenNodeRef.current = onOpenNode;
  }, [onOpenFile, onOpenNode]);

  const [showFiles, setShowFiles] = useState(true);
  const [labels, setLabels] = useState(true);
  const [query, setQuery] = useState("");
  const [nodeScale, setNodeScale] = useState(0.2);
  const [maxNodes, setMaxNodes] = useState(DEFAULT_MAX_NODES);
  const [palette, setPalette] = useState<Palette>(EMPTY_PALETTE);
  const [hover, setHover] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [stats, setStats] = useState<{
    nodes: number;
    links: number;
    total: number;
    truncated: boolean;
    categories: string[];
  }>({ nodes: 0, links: 0, total: 0, truncated: false, categories: [] });

  useEffect(() => {
    labelsRef.current = labels;
    dirtyRef.current = true;
  }, [labels]);
  useEffect(() => {
    queryRef.current = query.trim().toLowerCase();
    dirtyRef.current = true;
  }, [query]);
  useEffect(() => {
    nodeScaleRef.current = nodeScale;
    dirtyRef.current = true;
  }, [nodeScale]);

  const sourceTree = tree ?? [];
  const effectiveTree = useMemo(
    () => (showFiles ? sourceTree : sourceTree.filter((entry) => entry.is_dir)),
    [sourceTree, showFiles],
  );

  // Theme palette (re-read when the theme attributes change).
  useEffect(() => {
    const update = () => {
      const next = readPalette();
      paletteRef.current = next;
      dirtyRef.current = true;
      setPalette(next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-name", "data-glass"],
    });
    return () => observer.disconnect();
  }, []);

  // Use a prebuilt model (profile graph) or build from the tree.
  useEffect(() => {
    const graph = model ?? buildRepoGraph(effectiveTree, maxNodes);
    graphRef.current = graph;
    viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
    hoverRef.current = -1;
    selectedRef.current = -1;
    energyRef.current = Infinity;
    dirtyRef.current = true;
    setHover(null);
    setStats({
      nodes: graph.nodes.length,
      links: graph.links.length,
      total: graph.total,
      truncated: graph.truncated,
      categories: graph.categories,
    });
  }, [model, effectiveTree, maxNodes]);

  const reheating = useCallback(() => {
    energyRef.current = Infinity;
  }, []);

  const resetView = useCallback(() => {
    viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
    dirtyRef.current = true;
  }, []);

  // Continuous render + simulation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirtyRef.current = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    const toScreen = (x: number, y: number) => {
      const view = viewRef.current;
      return { x: width / 2 + x * view.scale + view.offsetX, y: height / 2 + y * view.scale + view.offsetY };
    };
    const toWorld = (x: number, y: number) => {
      const view = viewRef.current;
      return { x: (x - width / 2 - view.offsetX) / view.scale, y: (y - height / 2 - view.offsetY) / view.scale };
    };

    const draw = () => {
      const { nodes, links, categories } = graphRef.current;
      const paletteNow = paletteRef.current;
      const view = viewRef.current;
      context.clearRect(0, 0, width, height);
      if (nodes.length === 0) {
        return;
      }

      context.lineWidth = 1;
      context.strokeStyle = paletteNow.faint;
      context.globalAlpha = 0.5;
      context.beginPath();
      for (const link of links) {
        const a = nodes[link.source];
        const b = nodes[link.target];
        if (!a || !b) {
          continue;
        }
        const pa = toScreen(a.x, a.y);
        const pb = toScreen(b.x, b.y);
        context.moveTo(pa.x, pa.y);
        context.lineTo(pb.x, pb.y);
      }
      context.stroke();
      context.globalAlpha = 1;

      const colorMap = new Map<string, string>();
      categories.forEach((category, index) => {
        colorMap.set(
          category,
          paletteNow.colors[index % paletteNow.colors.length] ?? paletteNow.ink,
        );
      });

      const term = queryRef.current;
      const nodeScale = nodeScaleRef.current;
      nodes.forEach((node, index) => {
        const point = toScreen(node.x, node.y);
        const radius = Math.max(0.8, node.radius * nodeScale * view.scale);
        const matched = term.length > 0 && node.path.toLowerCase().includes(term);
        const isHover = index === hoverRef.current;
        const isSelected = index === selectedRef.current;
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = colorMap.get(node.category) ?? paletteNow.ink;
        context.fill();
        if (isHub(node.kind)) {
          context.lineWidth = Math.max(1, 1.4 * view.scale);
          context.strokeStyle = paletteNow.bg;
          context.stroke();
        }
        if (isHover || isSelected || matched) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 2.5, 0, Math.PI * 2);
          context.lineWidth = matched ? 2.4 : 1.6;
          context.strokeStyle = paletteNow.focus;
          context.stroke();
        }
      });

      if (labelsRef.current) {
        context.font = "10px ui-monospace, monospace";
        context.textBaseline = "middle";
        context.fillStyle = paletteNow.muted;
        const labelFiles = nodes.length <= 1500;
        const labelDirs = nodes.length <= 20000;
        const nodeScale = nodeScaleRef.current;
        nodes.forEach((node, index) => {
          if (!isHub(node.kind)) {
            if (!labelFiles || view.scale < 0.85) {
              return;
            }
          } else if (!labelDirs && index !== hoverRef.current && index !== selectedRef.current) {
            return;
          }
          const point = toScreen(node.x, node.y);
          if (point.x < -20 || point.x > width + 20 || point.y < -20 || point.y > height + 20) {
            return;
          }
          const label = node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label;
          context.fillText(label, point.x + node.radius * nodeScale * view.scale + 4, point.y);
        });
      }
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const graph = graphRef.current;
      let active = dirtyRef.current;
      if (graph.nodes.length > 0) {
        const dragging = dragRef.current?.mode === "node";
        if (energyRef.current > 0.05 || dragging) {
          const steps = graph.nodes.length > 6000 ? 1 : 2;
          let energy = 0;
          for (let i = 0; i < steps; i += 1) {
            energy = stepSimulation(graph.nodes, graph.links);
          }
          // Normalize so the settle threshold does not depend on node count
          // (otherwise a large graph never stops simulating).
          energyRef.current = energy / Math.max(1, graph.nodes.length);
          active = true;
        }
      }
      if (active) {
        draw();
        dirtyRef.current = false;
      }
    };
    frame = requestAnimationFrame(tick);

    const hitTest = (clientX: number, clientY: number): number => {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const nodes = graphRef.current.nodes;
      const scale = viewRef.current.scale * nodeScaleRef.current;
      let best = -1;
      let bestDistance = 16;
      nodes.forEach((node, index) => {
        const point = toScreen(node.x, node.y);
        const distance = Math.hypot(point.x - px, point.y - py);
        if (distance < Math.max(6, node.radius * scale + 4) && distance < bestDistance + 8) {
          if (distance < bestDistance || best === -1) {
            bestDistance = distance;
            best = index;
          }
        }
      });
      return best;
    };

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      const index = hitTest(event.clientX, event.clientY);
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (index >= 0) {
        dragRef.current = { mode: "node", index, x, y };
        energyRef.current = Infinity;
      } else {
        dragRef.current = { mode: "pan", index: -1, x: event.clientX, y: event.clientY };
      }
      dirtyRef.current = true;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const drag = dragRef.current;
      if (drag?.mode === "node") {
        const node = graphRef.current.nodes[drag.index];
        if (node) {
          const world = toWorld(event.clientX - rect.left, event.clientY - rect.top);
          node.x = world.x;
          node.y = world.y;
          node.vx = 0;
          node.vy = 0;
        }
        dirtyRef.current = true;
        return;
      }
      if (drag?.mode === "pan") {
        viewRef.current.offsetX += event.clientX - drag.x;
        viewRef.current.offsetY += event.clientY - drag.y;
        drag.x = event.clientX;
        drag.y = event.clientY;
        dirtyRef.current = true;
        return;
      }
      const index = hitTest(event.clientX, event.clientY);
      if (index !== hoverRef.current) {
        hoverRef.current = index;
        if (index >= 0) {
          const node = graphRef.current.nodes[index]!;
          setHover({ node, x: event.clientX - rect.left, y: event.clientY - rect.top });
        } else {
          setHover(null);
        }
        dirtyRef.current = true;
      }
      canvas.style.cursor = index >= 0 ? "pointer" : "grab";
    };

    const endDrag = () => {
      if (dragRef.current?.mode === "node") {
        energyRef.current = Infinity;
      }
      dragRef.current = null;
      dirtyRef.current = true;
    };

    const onClick = (event: MouseEvent) => {
      const index = hitTest(event.clientX, event.clientY);
      if (index < 0) {
        return;
      }
      const node = graphRef.current.nodes[index]!;
      selectedRef.current = index;
      dirtyRef.current = true;
      if (onOpenNodeRef.current) {
        onOpenNodeRef.current(node);
      } else if ((node.kind === "file" || node.kind === "repo") && onOpenFileRef.current) {
        onOpenFileRef.current(node.path);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const before = toWorld(px, py);
      const next = Math.min(4, Math.max(0.2, viewRef.current.scale * (event.deltaY < 0 ? 1.12 : 0.89)));
      viewRef.current.scale = next;
      const after = toWorld(px, py);
      viewRef.current.offsetX += (after.x - before.x) * next;
      viewRef.current.offsetY += (after.y - before.y) * next;
      dirtyRef.current = true;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", endDrag);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("pointerleave", endDrag);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  const zoom = useCallback((factor: number) => {
    viewRef.current.scale = Math.min(4, Math.max(0.2, viewRef.current.scale * factor));
    dirtyRef.current = true;
  }, []);

  return (
    <section className="repograph glass-flat" aria-label={`${repo} graph`}>
      <div className="repograph__toolbar">
        <div className="repograph__search">
          <Input
            label="Highlight"
            value={query}
            spellCheck={false}
            placeholder="path or file"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="repograph__toggle">
          <Checkbox label="Labels" checked={labels} onChange={(event) => setLabels(event.target.checked)} />
        </div>
        <div className="repograph__size">
          <Select
            label="Node size"
            value={String(nodeScale)}
            options={nodeSizeOptions}
            onChange={(event) => setNodeScale(Number(event.target.value))}
          />
        </div>
        {tree ? (
          <>
            <div className="repograph__toggle">
              <Checkbox
                label="Files"
                checked={showFiles}
                onChange={(event) => setShowFiles(event.target.checked)}
              />
            </div>
            <div className="repograph__size">
              <Select
                label="Budget"
                value={String(maxNodes)}
                options={sizeOptions}
                onChange={(event) => setMaxNodes(Number(event.target.value))}
              />
            </div>
          </>
        ) : null}
        {extraControls}
        <div className="repograph__buttons">
          <button type="button" className="iconbtn iconbtn--sm" aria-label="Zoom in" onClick={() => zoom(1.2)}>
            <ZoomIn size={14} strokeWidth={1.5} />
          </button>
          <button type="button" className="iconbtn iconbtn--sm" aria-label="Zoom out" onClick={() => zoom(0.83)}>
            <ZoomOut size={14} strokeWidth={1.5} />
          </button>
          <button type="button" className="iconbtn iconbtn--sm" aria-label="Reset view" onClick={resetView}>
            <Maximize2 size={14} strokeWidth={1.5} />
          </button>
          <button type="button" className="iconbtn iconbtn--sm" aria-label="Re-heat layout" onClick={reheating}>
            <Thermometer size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="repograph__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="repograph__canvas" />
        {hover ? (
          <div className="repograph__tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
            <span className="t-data">{hover.node.label}</span>
            <span className="t-label">{hover.node.path}</span>
          </div>
        ) : null}
        {loading ? <StatusLine kind="loading" /> : null}
        {error ? (
          <div className="repograph__error">
            <StatusLine kind="error" message={error.message} />
            <button type="button" className="btn btn--technical" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : null}
        {!loading && !error && stats.nodes === 0 ? (
          <p className="t-label repograph__empty">{emptyLabel}</p>
        ) : null}
      </div>

      <footer className="repograph__legend">
        <span className="t-label repograph__stats">
          <Focus size={12} strokeWidth={1.5} aria-hidden="true" />
          {`${stats.nodes} NODES · ${stats.links} LINKS`}
          {stats.truncated ? ` · SHOWING ${stats.nodes}/${stats.total}` : ""}
        </span>
        <ul className="repograph__categories">
          {stats.categories.slice(0, 12).map((category) => (
            <li key={category} className="repograph__category">
              <span
                className="repograph__dot"
                style={{ background: colorFor(palette, stats.categories, category) }}
                aria-hidden="true"
              />
              <span className="t-label">{category}</span>
            </li>
          ))}
        </ul>
      </footer>
    </section>
  );
}
