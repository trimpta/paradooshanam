with open("src/GraphPage.tsx", "r") as f:
    content = f.read()

import re

# Remove all isInitialZoom declarations
content = re.sub(r"  const isInitialZoom = useRef\(true\);\n", "", content)

# Inject it just before the auto-frame effect
content = content.replace("  // --- Auto-frame selected node and neighbors ---", "  const isInitialZoom = useRef(true);\n  // --- Auto-frame selected node and neighbors ---")

with open("src/GraphPage.tsx", "w") as f:
    f.write(content)
