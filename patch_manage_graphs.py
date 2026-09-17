with open("src/ManageGraphsPage.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "export function ManageGraphsPage({ onSelectGraph }: { onSelectGraph: (id: string) => void }) {",
    "export function ManageGraphsPage({ onSelectGraph, onBackToLocal }: { onSelectGraph: (id: string) => void, onBackToLocal: () => void }) {"
)

content = content.replace(
    '<h1 className="text-2xl font-bold mb-6 text-green-400">Manage Graphs</h1>',
    """<div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-400">Manage Graphs</h1>
        <button onClick={onBackToLocal} className="text-zinc-500 hover:text-green-400 font-bold transition-colors">
          [ Back to Local Mode ]
        </button>
      </div>"""
)

with open("src/ManageGraphsPage.tsx", "w") as f:
    f.write(content)
