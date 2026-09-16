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

export function GraphVisualizer({ records }: { records: ConnectionRecord[] }) {
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
    
    d3.select(containerRef.current)
      .call(zoom)
      .on("dblclick.zoom", null);
  }, []);

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
          {nodes.map((node) => {
            if (node.x == null || node.y == null) return null;
            const isSelected = selectedNodeId === node.id;
            const isNeighbor = neighborSet.has(node.id);
            const isFaded = selectedNodeId ? (!isSelected && !isNeighbor) : false;
            
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
                [ {node.id} ]
              </div>
            );
          })}
        </div>
      </div>
  );
}

export function GraphPage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Graph</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Close ]</button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <GraphVisualizer records={records} />
      </div>
    </div>
  );
}
