with open("src/App.tsx", "r") as f:
    content = f.read()

start_marker = "{mainTab === 'IN' ? ("
end_marker = "{/* Bottom: Header/Menu OR Score Selector */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_in_tab = """{mainTab === 'IN' ? (
        <>
          {/* Top: Current Record Input */}
          <div className="p-4 border-b border-green-900/50 flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 text-zinc-500">1.</span>
              <input
                ref={inputOneRef}
                type="text"
                value={personOne}
                onChange={(e) => setPersonOne(e.target.value.toLowerCase().replace(/\\s/g, ''))}
                onFocus={() => handleFocus('ONE')}
                onKeyDown={(e) => handleInputKeyDown(e, 'ONE')}
                enterKeyHint="next"
                className="flex-1 bg-transparent border-b border-green-800 focus:border-green-400 outline-none p-1 text-green-300"
                placeholder="Person One"
                disabled={!!conflictRecord}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 text-zinc-500">2.</span>
              <input
                ref={inputTwoRef}
                type="text"
                value={personTwo}
                onChange={(e) => setPersonTwo(e.target.value.toLowerCase().replace(/\\s/g, ''))}
                onFocus={() => handleFocus('TWO')}
                onKeyDown={(e) => handleInputKeyDown(e, 'TWO')}
                enterKeyHint="next"
                className="flex-1 bg-transparent border-b border-green-800 focus:border-green-400 outline-none p-1 text-green-300"
                placeholder="Person Two"
                disabled={!!conflictRecord}
              />
            </div>
            
            {conflictRecord && (
              <div className="text-zinc-500 text-xs mt-1">
                Conflict: existing score is <span className="text-green-400 font-bold">{conflictRecord.score}</span>
              </div>
            )}
          </div>

          {/* Middle: Records List OR Autocomplete */}
          <div className="flex-1 overflow-hidden relative border-b border-green-900/50 bg-zinc-950">
            {!isInputMode ? (
              <div className="h-full overflow-y-auto p-4 pb-24 relative z-20 flex flex-col gap-2">
                {/* Search / Filter Card */}
                <div className="bg-zinc-900/50 border border-green-900/30 p-3 rounded mb-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search / Filter..."
                    className="w-full bg-transparent outline-none text-green-300 font-bold placeholder-green-700/50"
                  />
                </div>
                
                {filteredRecords.length === 0 ? (
                  <div className="text-zinc-500 italic">{records.length === 0 ? 'No connections saved yet.' : 'No matches found.'}</div>
                ) : (
                  filteredRecords.map((r, i) => (
                    <RecordCard 
                      key={r.personOne + '-' + r.personTwo}
                      index={i}
                      record={r}
                      onEdit={() => handleStartEdit(r)}
                      onDelete={() => handleDelete(r)}
                    />
                  ))
                )}
              </div>
            ) : (
              <TerminalAutocomplete 
                options={suggestions} 
                onSelect={handleSuggestionSelect} 
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 border-b border-green-900/50">
          <GraphPage records={records} genders={genders} />
        </div>
      )}

      """

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_in_tab + content[end_idx:]

with open("src/App.tsx", "w") as f:
    f.write(content)
