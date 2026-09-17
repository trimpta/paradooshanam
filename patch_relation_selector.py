with open("src/App.tsx", "r") as f:
    content = f.read()

start_marker = "function RelationshipStatusSelector({"
end_marker = "function ScoreSelector({"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_selector = """function RelationshipStatusSelector({
  status,
  onChange
}: {
  status: RelationshipStatus;
  onChange: (s: RelationshipStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<RelationshipStatus | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const options: { val: RelationshipStatus, abbr: string, sym: string }[] = [
    { val: 'None', abbr: 'N', sym: '—' },
    { val: 'Talking Stage', abbr: 'T', sym: '^_^' },
    { val: 'Complicated', abbr: 'C', sym: '</3' },
    { val: 'In a Relationship', abbr: 'R', sym: '<3' }
  ];

  const currentOpt = options.find(o => o.val === status) || options[0];

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsOpen(true);
    setHighlighted(status);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isOpen || isAnimating) return;
    
    // Find element under pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      const optVal = el.getAttribute('data-status-val');
      if (optVal) {
        setHighlighted(optVal as RelationshipStatus);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!isOpen || isAnimating) return;
    
    setIsAnimating(true);
    if (highlighted) {
      onChange(highlighted);
    }
    
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 100);
  };

  return (
    <div className="relative h-full select-none touch-none flex items-center justify-center">
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`h-full border rounded flex items-center justify-center px-4 font-bold transition-colors cursor-pointer ${
          isOpen ? 'bg-green-900/50 border-green-400 text-green-300' : 'bg-zinc-950 border-green-900/50 text-green-500 hover:text-green-400'
        }`}
      >
        <span>{currentOpt.abbr} ▼</span>
      </div>

      {isOpen && (
        <div 
          className="absolute bottom-full right-0 mb-2 bg-zinc-950 border border-green-900/50 rounded shadow-[0_0_15px_rgba(0,0,0,0.8)] z-50 flex flex-col p-1 w-48 touch-none pointer-events-none"
        >
          {options.map(opt => {
            const isSel = highlighted === opt.val;
            return (
              <div 
                key={opt.val}
                data-status-val={opt.val}
                className={`px-3 py-3 rounded text-sm font-bold pointer-events-auto transition-colors flex justify-between items-center ${
                  isSel ? 'bg-green-400 text-zinc-950' : 'text-green-500'
                }`}
              >
                <span>{opt.val}</span>
                <span className="font-mono text-xs opacity-75">{opt.sym}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"""

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_selector + content[end_idx:]

with open("src/App.tsx", "w") as f:
    f.write(content)
