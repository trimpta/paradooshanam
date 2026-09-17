with open("src/GraphPage.tsx", "r") as f:
    content = f.read()

import re

# Add ref for initial mount
if "const isInitialZoom = useRef(true);" not in content:
    content = content.replace("const prevObfuscated = useRef(obfuscated);", "const isInitialZoom = useRef(true);\n  const prevObfuscated = useRef(obfuscated);")

# Inject check inside the effect
bad_check = "    if (!settings.autoZoom || !containerRef.current || !zoomRef.current) return;"
good_check = """    if (!settings.autoZoom || !containerRef.current || !zoomRef.current) return;
    if (isInitialZoom.current && !selectedNodeId) {
      isInitialZoom.current = false;
      return;
    }
    isInitialZoom.current = false;"""

content = content.replace(bad_check, good_check)

with open("src/GraphPage.tsx", "w") as f:
    f.write(content)
