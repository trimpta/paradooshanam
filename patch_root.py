with open("src/RootComponent.tsx", "r") as f:
    content = f.read()

# Add isOnlineMode state
content = content.replace(
    "const [activeGraphId, setActiveGraphId] = useState<string | null>(null);",
    "const [activeGraphId, setActiveGraphId] = useState<string | null>(null);\n  const [isOnlineMode, setIsOnlineMode] = useState(false);"
)

# Return logic update
old_return = """  if (!session) {
    return (
      <div className="bg-zinc-950 min-h-screen text-green-500 font-mono flex items-center justify-center p-6">"""

new_return = """  if (!isOnlineMode) {
    return <App onEnterOnline={() => setIsOnlineMode(true)} />;
  }

  if (!session) {
    return (
      <div className="bg-zinc-950 min-h-screen text-green-500 font-mono flex items-center justify-center p-6 flex-col">
        <button onClick={() => setIsOnlineMode(false)} className="absolute top-6 left-6 text-zinc-500 hover:text-green-400 font-bold transition-colors">
          [ <- Back to Local Mode ]
        </button>"""

content = content.replace(old_return, new_return)

content = content.replace(
    "return <ManageGraphsPage onSelectGraph={setActiveGraphId} />;",
    "return <ManageGraphsPage onSelectGraph={setActiveGraphId} onBackToLocal={() => setIsOnlineMode(false)} />;"
)

with open("src/RootComponent.tsx", "w") as f:
    f.write(content)
