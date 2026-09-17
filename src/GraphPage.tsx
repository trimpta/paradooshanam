import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ConnectionRecord } from './App';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  score: number;
}

const SYMBOLS = "!@#$%^&*()_+{}|:<>?~-=\\[];',./";

// --- Shared single animation loop for all node labels ---
type NodeAnimEntry = {
  el: HTMLSpanElement;
  name: string;
  targetObfuscated: boolean;
  currentStr: string;
  step: number;
  totalSteps: number;
  phase: 'scramble' | 'collapse' | 'expand' | 'unscramble' | 'done';
  startAt: number;
};

let animRegistry: Map<string, NodeAnimEntry> = new Map();
let animIntervalId: any = null;

function runSharedLoop() {
  if (animIntervalId) return;
  animIntervalId = setInterval(() => {
    const now = Date.now();
    let anyActive = false;

    animRegistry.forEach((entry) => {
      if (!entry.el || !entry.el.isConnected) return;
      if (now < entry.startAt) { anyActive = true; return; }
      if (entry.phase === 'done') return;

      anyActive = true;
      entry.step++;

      if (entry.targetObfuscated) {
        if (entry.phase === 'scramble') {
          const arr = entry.currentStr.split('');
          for (let i = 1; i < arr.length - 1; i++) {
            if (Math.random() > 0.55) {
              arr[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            }
          }
          if (!arr.includes('*')) {
            arr[Math.floor(Math.random() * (arr.length - 2)) + 1] = '*';
          }
          entry.currentStr = arr.join('');
          entry.el.textContent = entry.currentStr;
          if (entry.step >= 8) { entry.phase = 'collapse'; entry.step = 0; }
        } else if (entry.phase === 'collapse') {
          const arr = entry.currentStr.split('');
          if (arr.length > 3) {
            const candidates: number[] = [];
            for (let i = 1; i < arr.length - 1; i++) {
              if (arr[i] !== '*') candidates.push(i);
            }
            if (candidates.length > 0) {
              arr.splice(candidates[Math.floor(Math.random() * candidates.length)], 1);
            } else {
              arr.splice(1, 1);
            }
            entry.currentStr = arr.join('');
            entry.el.textContent = entry.currentStr;
          } else {
            entry.el.textContent = '*';
            entry.phase = 'done';
          }
        }
      } else {
        const target = `[ ${entry.name} ]`;
        if (entry.phase === 'expand') {
          const arr = entry.currentStr.split('');
          const targetLen = target.length;
          if (arr.length < targetLen) {
            const insertIdx = Math.floor(Math.random() * (arr.length - 2)) + 1;
            arr.splice(insertIdx, 0, SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
            entry.currentStr = arr.join('');
            entry.el.textContent = entry.currentStr;
          } else {
            entry.phase = 'unscramble';
            entry.step = 0;
          }
        } else if (entry.phase === 'unscramble') {
          const arr = entry.currentStr.split('');
          const targetArr = target.split('');
          while (arr.length < targetArr.length) arr.push(' ');
          while (arr.length > targetArr.length) arr.splice(arr.length - 2, 1);
          let changed = 0;
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== targetArr[i] && Math.random() > 0.4) {
              arr[i] = targetArr[i];
              changed++;
            }
          }
          entry.currentStr = arr.join('');
          entry.el.textContent = entry.currentStr;
          if (entry.currentStr === target || changed === 0) {
            entry.el.textContent = target;
            entry.phase = 'done';
          }
        }
      }
    });

    if (!anyActive) {
      clearInterval(animIntervalId);
      animIntervalId = null;
    }
  }, 50);
}

function scheduleNodeAnim(
  name: string,
  el: HTMLSpanElement,
  targetObfuscated: boolean,
  delayMs: number
) {
  const existing = animRegistry.get(name);
  const currentText = el.textContent ?? (targetObfuscated ? `[ ${name} ]` : '*');

  const entry: NodeAnimEntry = {
    el,
    name,
    targetObfuscated,
    currentStr: currentText,
    step: 0,
    totalSteps: 0,
    phase: targetObfuscated ? 'scramble' : 'expand',
    startAt: Date.now() + delayMs,
  };

  if (!targetObfuscated) {
    entry.currentStr = '[ * ]';
    el.textContent = '[ * ]';
  }

  if (existing) {
    Object.assign(existing, entry);
  } else {
    animRegistry.set(name, entry);
  }

  runSharedLoop();
}

// -------------------------------------------------------

export interface GraphSettings {
  physicsEnabled: boolean;
  baseDistance: number;
  autoZoom: boolean;
  chargeStrength: number;
  alphaDecay: number;
}

export function GraphVisualizer({ records, obfuscated, settings }: { records: ConnectionRecord[], obfuscated: boolean, settings: GraphSettings }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);

  // Direct DOM refs — bypass React for physics and zoom
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const nodeElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const linkElsRef = useRef<Map<number, SVGLineElement>>(new Map());
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const svgGroupRef = useRef<SVGGElement>(null);
  const nodeContainerRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<SVGPatternElement>(null);

  // State — only for things that genuinely need a React re-render
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const [renderLinks, setRenderLinks] = useState<Link[]>([]);

  // Compute neighbor set from source records, not from simulation link state
  const neighborSet = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    records.forEach(r => {
      if (r.personOne === selectedNodeId) set.add(r.personTwo);
      if (r.personTwo === selectedNodeId) set.add(r.personOne);
    });
    return set;
  }, [selectedNodeId, records]);

  const initialData = useMemo(() => {
    const names = new Set<string>();
    records.forEach(r => { names.add(r.personOne); names.add(r.personTwo); });
    const nodesData = Array.from(names).map(name => ({ id: name }));
    const linksData = records.map(r => ({ source: r.personOne, target: r.personTwo, score: r.score }));
    return { nodesData, linksData };
  }, [records]);

  // --- Simulation setup: runs once per data change ---
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const simNodes = initialData.nodesData.map(d => ({ ...d })) as Node[];
    const simLinks = initialData.linksData.map(d => ({ ...d })) as Link[];

    nodesRef.current = simNodes;
    linksRef.current = simLinks;
    nodeElsRef.current.clear();
    linkElsRef.current.clear();

    // Hide node container until first tick positions everything (prevents flash at 0,0)
    if (nodeContainerRef.current) nodeContainerRef.current.style.opacity = '0';
    let firstTick = true;
    let tickCount = 0;

    const simulation = d3.forceSimulation<Node, Link>(simNodes)
      .force("link", d3.forceLink<Node, Link>(simLinks).id(d => d.id).distance(d => (11 - d.score) * settings.baseDistance))
      .force("charge", d3.forceManyBody().strength(settings.chargeStrength).theta(1.5))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(settings.alphaDecay)
      .on("tick", () => {
        // Throttle DOM writes to every other tick (~30fps visual, 60fps physics)
        tickCount++;
        if (tickCount % 2 !== 0 && !firstTick) return;

        // --- Direct DOM updates: ZERO React re-renders ---
        for (let j = 0; j < simNodes.length; j++) {
          const node = simNodes[j];
          if (node.x == null || node.y == null) continue;
          const el = nodeElsRef.current.get(node.id);
          if (el) {
            el.style.transform = `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%)`;
          }
        }
        for (let j = 0; j < simLinks.length; j++) {
          const link = simLinks[j];
          const src = link.source as Node;
          const tgt = link.target as Node;
          const el = linkElsRef.current.get(j);
          if (el && src.x != null && src.y != null && tgt.x != null && tgt.y != null) {
            el.setAttribute('x1', String(src.x));
            el.setAttribute('y1', String(src.y));
            el.setAttribute('x2', String(tgt.x));
            el.setAttribute('y2', String(tgt.y));
          }
        }
        // Reveal container after first tick
        if (firstTick && nodeContainerRef.current) {
          nodeContainerRef.current.style.opacity = '1';
          firstTick = false;
        }
      });

    simRef.current = simulation;

    // Trigger ONE re-render to create the DOM elements
    setRenderNodes([...simNodes]);
    setRenderLinks([...simLinks]);

    return () => { simulation.stop(); };
  }, [initialData]);

  // --- Zoom setup: direct DOM updates, no React state ---
  useEffect(() => {
    if (!containerRef.current) return;
    const zoom = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((e) => {
        if (e.type === 'wheel') return true;
        return !e.target.closest('.d3-node');
      })
      .on("zoom", (e) => {
        transformRef.current = e.transform;
        const t = e.transform;
        if (svgGroupRef.current) {
          svgGroupRef.current.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
        }
        if (nodeContainerRef.current) {
          nodeContainerRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
        }
        if (patternRef.current) {
          patternRef.current.setAttribute('patternTransform', `translate(${t.x}, ${t.y}) scale(${t.k})`);
        }
      });

    zoomRef.current = zoom;
    d3.select(containerRef.current)
      .call(zoom)
      .on("dblclick.zoom", null);
  }, []);

  // --- Auto-frame selected node and neighbors ---
  useEffect(() => {
    if (!settings.autoZoom || !selectedNodeId || !containerRef.current || !zoomRef.current) return;

    const currentNodes = nodesRef.current;
    const targetNode = currentNodes.find(n => n.id === selectedNodeId);
    if (!targetNode || targetNode.x == null || targetNode.y == null) return;

    const coords = [{ x: targetNode.x, y: targetNode.y }];
    currentNodes.forEach(n => {
      if (neighborSet.has(n.id) && n.x != null && n.y != null) {
        coords.push({ x: n.x, y: n.y });
      }
    });

    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const padding = 100;

    let scale;
    if (w === 0 && h === 0) {
      scale = 2;
    } else {
      scale = Math.min(
        (width - padding) / Math.max(1, w),
        (height - padding) / Math.max(1, h)
      );
      scale = Math.max(0.1, Math.min(scale, 4));
    }

    const t = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-cx, -cy);

    d3.select(containerRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // Pause physics during obfuscation animation, resume after
  const prevObfuscated = useRef(obfuscated);
  useEffect(() => {
    if (prevObfuscated.current === obfuscated) return;
    prevObfuscated.current = obfuscated;
    const sim = simRef.current;
    if (!sim) return;
    sim.stop();
    const t = setTimeout(() => {
      if (settings.physicsEnabled) sim.restart();
    }, 900);
    return () => clearTimeout(t);
  }, [obfuscated, settings.physicsEnabled]);

  // Handle physics toggle
  useEffect(() => {
    if (!simRef.current) return;
    if (settings.physicsEnabled) {
      simRef.current.alphaTarget(0.3).restart();
      setTimeout(() => simRef.current?.alphaTarget(0), 100);
    } else {
      simRef.current.stop();
    }
  }, [settings.physicsEnabled]);

  // --- Drag handling: refs instead of state to avoid re-renders during drag ---
  const draggedNodeRef = useRef<Node | null>(null);
  const pointerStartPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, node: Node) => {
    e.stopPropagation();
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (simRef.current) simRef.current.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
    draggedNodeRef.current = node;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dragged = draggedNodeRef.current;
    if (!dragged || !containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const t = transformRef.current;
    const x = (e.clientX - rect.left - t.x) / t.k;
    const y = (e.clientY - rect.top - t.y) / t.k;
    dragged.fx = x;
    dragged.fy = y;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dragged = draggedNodeRef.current;
    if (dragged) {
      e.stopPropagation();
      if (simRef.current) simRef.current.alphaTarget(0);
      dragged.fx = null;
      dragged.fy = null;

      if (pointerStartPos.current) {
        const dx = e.clientX - pointerStartPos.current.x;
        const dy = e.clientY - pointerStartPos.current.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          setSelectedNodeId(prev => prev === dragged.id ? null : dragged.id);
        }
      }

      pointerStartPos.current = null;
      draggedNodeRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          if (!(e.target as Element).closest('.d3-node')) setSelectedNodeId(null);
        }}
        className="w-full h-full overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern
              ref={patternRef}
              id="asciiGrid"
              width="40" height="40"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="1" height="1" fill="rgba(34, 197, 94, 0.15)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#asciiGrid)" />
          <g ref={svgGroupRef}>
            {renderLinks.map((link, i) => {
              const srcId = typeof link.source === 'object' ? (link.source as Node).id : String(link.source);
              const tgtId = typeof link.target === 'object' ? (link.target as Node).id : String(link.target);
              const isFaded = selectedNodeId ? (srcId !== selectedNodeId && tgtId !== selectedNodeId) : false;

              return (
                <line
                  key={i}
                  ref={el => { if (el) linkElsRef.current.set(i, el); }}
                  stroke="#22c55e"
                  strokeWidth={Math.max(0.5, link.score / 2)}
                  strokeOpacity={isFaded ? 0.05 : 0.2 + (link.score / 10) * 0.8}
                  className="transition-[stroke-opacity] duration-300"
                />
              );
            })}
          </g>
        </svg>

        <div
          ref={nodeContainerRef}
          className="absolute inset-0 pointer-events-none will-change-transform"
          style={{ transformOrigin: '0 0' }}
        >
          {renderNodes.map((node, idx) => {
            const isSelected = selectedNodeId === node.id;
            const isNeighbor = neighborSet.has(node.id);
            const isFaded = selectedNodeId ? (!isSelected && !isNeighbor) : false;
            const shouldObfuscate = obfuscated && !(isSelected || isNeighbor);

            return (
              <div
                key={node.id}
                ref={el => { if (el) nodeElsRef.current.set(node.id, el); }}
                style={{ opacity: isFaded ? 0.3 : 1 }}
                className={`d3-node absolute px-1 font-bold text-xs cursor-grab active:cursor-grabbing pointer-events-auto select-none border rounded-sm will-change-transform transition-[color,background-color,border-color,opacity] duration-300 ${isSelected ? 'bg-green-400 text-zinc-950 border-green-400 z-10' : 'bg-zinc-950 text-green-400 border-green-900/30'}`}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <NodeLabel name={node.id} obfuscated={shouldObfuscate} index={idx} totalNodes={renderNodes.length} />
              </div>
            );
          })}
        </div>
      </div>
  );
}

function NodeLabel({ name, obfuscated, index, totalNodes }: { name: string, obfuscated: boolean, index: number, totalNodes: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevObfuscated = useRef(obfuscated);

  useEffect(() => {
    const el = spanRef.current;
    if (!el || prevObfuscated.current === obfuscated) return;
    prevObfuscated.current = obfuscated;

    const staggerDelay = totalNodes > 1 ? (index / totalNodes) * 400 : 0;
    scheduleNodeAnim(name, el, obfuscated, staggerDelay);
  }, [obfuscated, name, index, totalNodes]);

  const initialText = useRef(obfuscated ? '*' : `[ ${name} ]`);
  return <span ref={spanRef}>{initialText.current}</span>;
}


import { CardHeader } from './CardHeader';

export function GraphPage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  const [obfuscated, setObfuscated] = useState(false);
  
  const [settings, setSettings] = useState<GraphSettings>({
    physicsEnabled: true,
    baseDistance: 20,
    autoZoom: true,
    chargeStrength: -200,
    alphaDecay: 0.05
  });

  const updateSetting = (key: keyof GraphSettings, value: any) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  const menuOptions = [
    {
      id: 'physics',
      label: 'Physics Simulation',
      type: 'toggle' as const,
      value: settings.physicsEnabled,
      onChange: (v: boolean) => updateSetting('physicsEnabled', v),
      info: 'Enable or disable the continuous force simulation. Turning this off locks nodes in place.'
    },
    {
      id: 'autozoom',
      label: 'Auto-Zoom to Neighbors',
      type: 'toggle' as const,
      value: settings.autoZoom,
      onChange: (v: boolean) => updateSetting('autoZoom', v),
      info: 'Automatically pans and zooms the camera to fit a node and all its connected neighbors when selected.'
    },
    {
      id: 'distance',
      label: 'Base Link Distance',
      type: 'slider' as const,
      value: settings.baseDistance,
      onChange: (v: number) => updateSetting('baseDistance', v),
      min: 5,
      max: 50,
      step: 1,
      info: 'The base target length of the links between nodes. Higher values spread the graph out more.'
    },
    {
      id: 'charge',
      label: 'Repulsive Charge',
      type: 'number' as const,
      value: settings.chargeStrength,
      onChange: (v: number) => updateSetting('chargeStrength', v),
      info: 'The strength of the repulsive force between nodes. A more negative number pushes nodes further apart.'
    },
    {
      id: 'decay',
      label: 'Simulation Cooling',
      type: 'slider' as const,
      value: settings.alphaDecay,
      onChange: (v: number) => updateSetting('alphaDecay', v),
      min: 0.01,
      max: 0.1,
      step: 0.01,
      info: 'How quickly the simulation "cools down" and settles into a stable layout. Lower values make it jitter longer.'
    }
  ];

  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <CardHeader title="Graph" onClose={onClose} menuOptions={menuOptions}>
        <button
          onClick={() => setObfuscated(!obfuscated)}
          className="text-green-400 hover:text-green-300 font-bold tracking-widest px-4 py-1 border border-green-900/50 rounded bg-green-900/20"
        >
          {obfuscated ? '*' : '****'}
        </button>
      </CardHeader>
      <div className="flex-1 overflow-hidden relative">
        <GraphVisualizer records={records} obfuscated={obfuscated} settings={settings} />
      </div>
    </div>
  );
}
