const fs = require('fs');
let content = fs.readFileSync('src/GraphPage.tsx', 'utf8');

content = content.replace(
  `export function GraphVisualizer({ records, obfuscated }: { records: ConnectionRecord[], obfuscated: boolean }) {`,
  `export interface GraphSettings {
  physicsEnabled: boolean;
  baseDistance: number;
  autoZoom: boolean;
  chargeStrength: number;
  alphaDecay: number;
}

export function GraphVisualizer({ records, obfuscated, settings }: { records: ConnectionRecord[], obfuscated: boolean, settings: GraphSettings }) {`
);

content = content.replace(
  `      .force("link", d3.forceLink<Node, Link>(simLinks).id(d => d.id).distance(d => (11 - d.score) * 20))
      .force("charge", d3.forceManyBody().strength(-200).theta(1.5))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.05)`,
  `      .force("link", d3.forceLink<Node, Link>(simLinks).id(d => d.id).distance(d => (11 - d.score) * settings.baseDistance))
      .force("charge", d3.forceManyBody().strength(settings.chargeStrength).theta(1.5))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(settings.alphaDecay)`
);

// Auto-frame toggle
content = content.replace(
  `  // --- Auto-frame selected node and neighbors ---
  useEffect(() => {
    if (!selectedNodeId || !containerRef.current || !zoomRef.current) return;`,
  `  // --- Auto-frame selected node and neighbors ---
  useEffect(() => {
    if (!settings.autoZoom || !selectedNodeId || !containerRef.current || !zoomRef.current) return;`
);

fs.writeFileSync('src/GraphPage.tsx', content);
