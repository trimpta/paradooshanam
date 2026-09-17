with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace the style of the main div
old_style = "style={{ height: viewportHeight > 0 ? viewportHeight : '100dvh' }}"
new_style = "style={{ height: viewportHeight > 0 ? viewportHeight : '100dvh', paddingBottom: 'env(keyboard-inset-bottom, 0px)' }}"

content = content.replace(old_style, new_style)

with open("src/App.tsx", "w") as f:
    f.write(content)
