with open("src/App.tsx", "r") as f:
    content = f.read()

start_marker = "{/* Bottom: Header/Menu OR Score Selector */}"
end_marker = "    </div>\n  );\n}\n\nfunction TerminalAutocomplete"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_bottom = """{/* Bottom: Header/Menu OR Score Selector */}
      <div className="shrink-0 flex items-center p-2 gap-4 bg-zinc-900/50 min-h-[5rem]">
        {!isInputMode ? (
          <div className="w-full flex items-center justify-between px-2 gap-2 h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-zinc-950 border border-green-900/50 p-1 shrink-0 rounded-sm">
                <button 
                  onClick={() => setMainTab('IN')}
                  className={`px-3 sm:px-4 py-1 rounded-sm text-xs sm:text-sm font-bold transition-colors ${mainTab === 'IN' ? 'bg-green-700 text-zinc-950' : 'text-green-600/50'}`}
                >
                  IN
                </button>
                <button 
                  onClick={() => setMainTab('OUT')}
                  className={`px-3 sm:px-4 py-1 rounded-sm text-xs sm:text-sm font-bold transition-colors ${mainTab === 'OUT' ? 'bg-green-700 text-zinc-950' : 'text-green-600/50'}`}
                >
                  OUT
                </button>
              </div>
              
              {activeUsers > 0 && (
                <div className="text-[10px] font-bold text-green-400 bg-green-900/20 px-1 py-0.5 rounded animate-pulse w-max">
                  {activeUsers} user{activeUsers > 1 ? 's' : ''} active
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsMenuOpen(true)}
              className="text-zinc-500 hover:text-green-400 font-bold transition-colors"
            >
              [ Menu ]
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center gap-2 h-16">
              <div className="flex-1 overflow-hidden bg-zinc-950 rounded border border-green-900/50 h-full relative">
                <ScoreSelector score={score} onChange={setScore} />
              </div>
              <div className="shrink-0">
                <RelationshipStatusSelector status={relationshipStatus} onChange={setRelationshipStatus} />
              </div>
              <button 
                onClick={handleAdd}
                className="shrink-0 h-full px-6 bg-green-900/30 text-green-400 font-bold border border-green-500/50 rounded hover:bg-green-900/50 active:bg-green-900 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>\n"""

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_bottom + content[end_idx:]

with open("src/App.tsx", "w") as f:
    f.write(content)
