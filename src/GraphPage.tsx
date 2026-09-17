import { useEffect, useRef, useState, useMemo } from 'react';
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
// Each registered node gets a ref to its span and a target state.
// One setInterval drives all of them — zero per-node timers.
type NodeAnimEntry = {
  el: HTMLSpanElement;
  name: string;
  targetObfuscated: boolean;
  currentStr: string;
  step: number;
  totalSteps: number;
  phase: 'scramble' | 'collapse' | 'expand' | 'unscramble' | 'done';
  startAt: number; // timestamp when this node's animation begins
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
      if (now < entry.startAt) { anyActive = true; return; } // not started yet
      if (entry.phase === 'done') return;

      anyActive = true;
      entry.step++;

      if (entry.targetObfuscated) {
        // --- HIDE: scramble then collapse ---
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
        // --- SHOW: expand then unscramble ---
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
          // Clamp length
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

  // For show animation, start from [ * ] if coming from *
  if (!targetObfuscated) {
    entry.currentStr = '[ * ]';
    el.textContent = '[ * ]';
  }

  if (existing) {
    // Override in place — el ref stays the same
    Object.assign(existing, entry);
  } else {
    animRegistry.set(name, entry);
  }

  runSharedLoop();
}

// -------------------------------------------------------

export function GraphVisualizer({ records, obfuscated }: { records: ConnectionRecord[], obfuscated: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const neighborSet = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (srcId === selectedNodeId) set.add(tgtId);
      if (tgtId === selectedNodeId) set.add(srcId);
    });
    return set;
  }, [selectedNodeId, links]);

  const initialData = useMemo(() => {
    const names = new Set<string>();
    records.forEach(r => { names.add(r.personOne); names.add(r.personTwo); });
    const nodesData = Array.from(names).map(name => ({ id: name }));
    const linksData = records.map(r => ({ source: r.personOne, target: r.personTwo, score: r.score }));
    return { nodesData, linksData };
  }, [records]);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const simNodes = initialData.nodesData.map(d => ({ ...d }));
    const simLinks = initialData.linksData.map(d => ({ ...d }));

    const simulation = d3.forceSimulation<Node, Link>(simNodes as Node[])
      .force("link", d3.forceLink<Node, Link>(simLinks as Link[]).id(d => d.id).distance(d => (11 - d.score) * 20))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        setNodes([...simNodes]);
        setLinks([...simLinks]);
      });

    simRef.current = simulation;
    return () => { simulation.stop(); };
  }, [initialData]);

  const zoomRef = useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const zoom = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((e) => {
        if (e.type === 'wheel') return true;
        return !e.target.closest('.d3-node');
      })
      .on("zoom", (e) => {
        setTransform(e.transform);
      });
    
    zoomRef.current = zoom;
    d3.select(containerRef.current)
      .call(zoom)
      .on("dblclick.zoom", null);
  }, []);

  // Auto-frame selected node and neighbors
  useEffect(() => {
    if (!selectedNodeId || !containerRef.current || !zoomRef.current) return;

    // Use current nodes (we don't add nodes to dependency array to avoid running on every physics tick)
    const targetNode = nodes.find(n => n.id === selectedNodeId);
    if (!targetNode || targetNode.x == null || targetNode.y == null) return;

    const coords = [{ x: targetNode.x, y: targetNode.y }];
    
    nodes.forEach(n => {
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
      scale = 2; // Default zoom for isolated node
    } else {
      scale = Math.min(
        (width - padding) / Math.max(1, w),
        (height - padding) / Math.max(1, h)
      );
      scale = Math.max(0.1, Math.min(scale, 4));
    }

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-cx, -cy);

    d3.select(containerRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, transform);
      
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // Pause physics during animation, resume after
  const prevObfuscated = useRef(obfuscated);
  useEffect(() => {
    if (prevObfuscated.current === obfuscated) return;
    prevObfuscated.current = obfuscated;
    const sim = simRef.current;
    if (!sim) return;
    // Freeze physics
    sim.stop();
    // Resume after animation completes (~900ms: max stagger 400 + anim ~500)
    const t = setTimeout(() => sim.restart(), 900);
    return () => clearTimeout(t);
  }, [obfuscated]);

  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const pointerStartPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent, node: Node) => {
    e.stopPropagation();
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (simRef.current) simRef.current.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;
    setDraggedNode(node);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedNode || !containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    draggedNode.fx = x;
    draggedNode.fy = y;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggedNode) {
      e.stopPropagation();
      if (simRef.current) simRef.current.alphaTarget(0);
      draggedNode.fx = null;
      draggedNode.fy = null;
      
      if (pointerStartPos.current) {
        const dx = e.clientX - pointerStartPos.current.x;
        const dy = e.clientY - pointerStartPos.current.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          setSelectedNodeId(prev => prev === draggedNode.id ? null : draggedNode.id);
        }
      }
      
      pointerStartPos.current = null;
      setDraggedNode(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

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
              id="asciiGrid" 
              width="60" height="40" 
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
            >
              <text x="0" y="15" fill="rgba(34, 197, 94, 0.2)" fontSize="14" fontFamily="monospace">+</text>
              <text x="15" y="15" fill="rgba(34, 197, 94, 0.15)" fontSize="14" fontFamily="monospace">_</text>
              <text x="30" y="15" fill="rgba(34, 197, 94, 0.15)" fontSize="14" fontFamily="monospace">_</text>
              <text x="45" y="15" fill="rgba(34, 197, 94, 0.15)" fontSize="14" fontFamily="monospace">_</text>
              <text x="0" y="35" fill="rgba(34, 197, 94, 0.15)" fontSize="14" fontFamily="monospace">|</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#asciiGrid)" />
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {links.map((link, i) => {
              const src = link.source as Node;
              const tgt = link.target as Node;
              if (src.x == null || src.y == null || tgt.x == null || tgt.y == null) return null;
              
              const isFaded = selectedNodeId ? (src.id !== selectedNodeId && tgt.id !== selectedNodeId) : false;
              
              return (
                <line 
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#22c55e"
                  strokeWidth={Math.max(0.5, link.score / 2)}
                  strokeOpacity={isFaded ? 0.05 : 0.2 + (link.score / 10) * 0.8}
                  className="transition-opacity duration-300"
                />
              );
            })}
          </g>
        </svg>

        <div className="absolute inset-0 pointer-events-none" style={{ transformOrigin: '0 0', transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}>
          {nodes.map((node, idx) => {
            if (node.x == null || node.y == null) return null;
            const isSelected = selectedNodeId === node.id;
            const isNeighbor = neighborSet.has(node.id);
            const isFaded = selectedNodeId ? (!isSelected && !isNeighbor) : false;
            const shouldObfuscate = obfuscated && !(isSelected || isNeighbor);

            return (
              <div 
                key={node.id}
                style={{ 
                  transform: `translate(${node.x}px, ${node.y}px) translate(-50%, -50%)`,
                  opacity: isFaded ? 0.3 : 1
                }}
                className={`d3-node absolute px-1 font-bold text-xs cursor-grab active:cursor-grabbing pointer-events-auto select-none border shadow-[0_0_10px_rgba(0,0,0,0.8)] rounded-sm transition-all duration-300 ${isSelected ? 'bg-green-400 text-zinc-950 border-green-400 z-10' : 'bg-zinc-950 text-green-400 border-green-900/30'}`}
                onPointerDown={(e) => handlePointerDown(e, node)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <NodeLabel name={node.id} obfuscated={shouldObfuscate} index={idx} totalNodes={nodes.length} />
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

    // Stagger: spread nodes evenly over 400ms window
    const staggerDelay = totalNodes > 1 ? (index / totalNodes) * 400 : 0;
    scheduleNodeAnim(name, el, obfuscated, staggerDelay);
  }, [obfuscated, name, index, totalNodes]);

  const initialText = useRef(obfuscated ? '*' : `[ ${name} ]`);
  return <span ref={spanRef}>{initialText.current}</span>;
}


export function GraphPage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  const [obfuscated, setObfuscated] = useState(false);

  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400 w-24">Graph</h2>
        <button 
          onClick={() => setObfuscated(!obfuscated)} 
          className="text-green-400 hover:text-green-300 font-bold tracking-widest px-4 py-1 border border-green-900/50 rounded bg-green-900/20"
        >
          {obfuscated ? '*' : '****'}
        </button>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors w-24 text-right">[ Close ]</button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <GraphVisualizer records={records} obfuscated={obfuscated} />
      </div>
    </div>
  );
}
