import re

with open("src/GraphPage.tsx", "r") as f:
    content = f.read()

old_effect_pattern = r"  // --- Auto-frame selected node and neighbors ---.*?// eslint-disable-next-line react-hooks/exhaustive-deps\n  \}, \[selectedNodeId\]\);"

new_effect = """  // --- Auto-frame selected node and neighbors ---
  useEffect(() => {
    if (!settings.autoZoom || !containerRef.current || !zoomRef.current) return;

    const currentNodes = nodesRef.current;
    if (currentNodes.length === 0) return;

    // If a specific node is selected, frame it and its neighbors
    // Otherwise, frame the entire graph
    const nodesToFrame: Node[] = [];
    if (selectedNodeId) {
      currentNodes.forEach(n => {
        if (n.id === selectedNodeId || neighborSet.has(n.id)) {
          nodesToFrame.push(n);
        }
      });
    } else {
      // Small delay before framing all to let physics settle if just mounted
      // But actually, we only want to frame if we just EXITED a selection.
      // We can just frame all nodes immediately.
      nodesToFrame.push(...currentNodes);
    }

    if (nodesToFrame.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodesToFrame.forEach(n => {
      if (n.x != null && n.y != null) {
        const el = nodeElsRef.current.get(n.id);
        const w = el ? el.offsetWidth : 100;
        const h = el ? el.offsetHeight : 30;
        
        minX = Math.min(minX, n.x - w / 2);
        maxX = Math.max(maxX, n.x + w / 2);
        minY = Math.min(minY, n.y - h / 2);
        maxY = Math.max(maxY, n.y + h / 2);
      }
    });

    if (minX === Infinity) return;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    // Add extra padding to ensure extreme end nodes aren't flush with edges
    const padding = 120; // 60px padding on each side

    let scale;
    if (w === 0 && h === 0) {
      scale = 1.5;
    } else {
      scale = Math.min(
        (width - padding) / Math.max(1, w),
        (height - padding) / Math.max(1, h)
      );
      // Let it zoom out slightly more (0.05) if the graph is huge
      scale = Math.max(0.05, Math.min(scale, 2.5));
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
  }, [selectedNodeId]);"""

content = re.sub(old_effect_pattern, new_effect, content, flags=re.DOTALL)

with open("src/GraphPage.tsx", "w") as f:
    f.write(content)
