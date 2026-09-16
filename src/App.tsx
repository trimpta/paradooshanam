import { useState, useEffect, useRef, useMemo, KeyboardEvent, TouchEvent } from 'react';
import { Menu } from 'lucide-react';
import { GraphPage } from './GraphPage';
import { KeyPeoplePage } from './KeyPeoplePage';
import { GroupDetectionPage } from './GroupDetectionPage';
import { PersonEditorPage } from './PersonEditorPage';
import { GenderAnalysisPage } from './GenderAnalysisPage';
import { DataManagementPage } from './DataManagementPage';

export interface ConnectionRecord {
  personOne: string;
  personTwo: string;
  score: number;
}

function useKeyboardState() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.height : (typeof window !== 'undefined' ? window.innerHeight : 0)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let normalHeight = window.visualViewport?.height ?? window.innerHeight;

    const handleResize = () => {
      const currentVpHeight = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(currentVpHeight);

      if ('virtualKeyboard' in navigator) {
        const vk = (navigator as any).virtualKeyboard;
        const rect = vk.boundingRect;
        if (rect && rect.height > 0) {
          setIsKeyboardOpen(true);
          return;
        } else if (rect && rect.height === 0) {
          setIsKeyboardOpen(false);
          return;
        }
      }

      // Keep tracking the max known height in case of orientation changes or initial load anomalies
      if (currentVpHeight > normalHeight) {
        normalHeight = currentVpHeight;
      }
      
      const difference = normalHeight - currentVpHeight;
      if (difference > 150) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    if ('virtualKeyboard' in navigator) {
      (navigator as any).virtualKeyboard.overlaysContent = true;
      (navigator as any).virtualKeyboard.addEventListener('geometrychange', handleResize);
    }
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      if ('virtualKeyboard' in navigator) {
        (navigator as any).virtualKeyboard.removeEventListener('geometrychange', handleResize);
      }
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isKeyboardOpen, viewportHeight };
}

export type Gender = 'M' | 'F' | 'U';

export default function App() {
  const [names, setNames] = useState<string[]>([]);
  const [records, setRecords] = useState<ConnectionRecord[]>([]);
  const [genders, setGenders] = useState<Record<string, Gender>>({});
  const { isKeyboardOpen, viewportHeight } = useKeyboardState();

  const [personOne, setPersonOne] = useState('');
  const [personTwo, setPersonTwo] = useState('');
  const [score, setScore] = useState(5);
  const [activeField, setActiveField] = useState<'ONE' | 'TWO'>('ONE');
  const [conflictRecord, setConflictRecord] = useState<ConnectionRecord | null>(null);
  const [mainTab, setMainTab] = useState<'IN' | 'OUT'>('IN');
  
  // Now explicitly bound to the robust keyboard state
  const isInputMode = isKeyboardOpen;

  const inputOneRef = useRef<HTMLInputElement>(null);
  const inputTwoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedNames = localStorage.getItem('connection-names');
    const savedRecords = localStorage.getItem('connection-records');
    const savedGenders = localStorage.getItem('connection-genders');
    if (savedNames) setNames(JSON.parse(savedNames));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedGenders) setGenders(JSON.parse(savedGenders));
  }, []);

  const saveToStorage = (newNames: string[], newRecords: ConnectionRecord[], newGenders: Record<string, Gender>) => {
    localStorage.setItem('connection-names', JSON.stringify(newNames));
    localStorage.setItem('connection-records', JSON.stringify(newRecords));
    localStorage.setItem('connection-genders', JSON.stringify(newGenders));
    setNames(newNames);
    setRecords(newRecords);
    setGenders(newGenders);
  };

  const handleFocus = (field: 'ONE' | 'TWO') => {
    setActiveField(field);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>, field: 'ONE' | 'TWO') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'ONE') {
        inputTwoRef.current?.focus();
      } else {
        inputTwoRef.current?.blur();
      }
    }
  };

  const suggestions = useMemo(() => {
    const currentInput = activeField === 'ONE' ? personOne : personTwo;
    const search = currentInput.toLowerCase();
    
    let filtered = names.filter(n => n.toLowerCase().includes(search));
    
    // Sort logic to match behavior
    filtered = filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(search);
      const bStarts = bLower.startsWith(search);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aLower.localeCompare(bLower);
    });

    if (currentInput.trim() && !filtered.includes(currentInput.trim())) {
      filtered.push(currentInput.trim());
    }

    return filtered;
  }, [names, personOne, personTwo, activeField]);

  const handleSuggestionSelect = (name: string) => {
    if (activeField === 'ONE') {
      setPersonOne(name);
      inputTwoRef.current?.focus();
    } else {
      setPersonTwo(name);
      inputTwoRef.current?.blur();
    }
  };

  const clearFormAndFocus = () => {
    setPersonOne('');
    setPersonTwo('');
    setScore(5);
    setConflictRecord(null);
    inputOneRef.current?.focus();
  };

  const commitSave = (record: ConnectionRecord) => {
    const updatedNames = [...names];
    if (!updatedNames.includes(record.personOne) && record.personOne.trim() !== "") {
      updatedNames.push(record.personOne.trim());
    }
    if (!updatedNames.includes(record.personTwo) && record.personTwo.trim() !== "") {
      updatedNames.push(record.personTwo.trim());
    }
    const updatedRecords = [...records, record];
    saveToStorage(updatedNames, updatedRecords, genders);
  };

  const handleSave = () => {
    if (!personOne.trim() || !personTwo.trim()) return;
    const p1 = personOne.trim();
    const p2 = personTwo.trim();

    const existing = records.find(r => 
      (r.personOne === p1 && r.personTwo === p2) || 
      (r.personOne === p2 && r.personTwo === p1)
    );

    if (existing) {
      setConflictRecord(existing);
    } else {
      commitSave({ personOne: p1, personTwo: p2, score });
      clearFormAndFocus();
    }
  };

  const handleUpdate = () => {
    if (!conflictRecord) return;
    const newRecord = { personOne: personOne.trim(), personTwo: personTwo.trim(), score };
    const updatedRecords = records.map(r => 
      (r.personOne === conflictRecord.personOne && r.personTwo === conflictRecord.personTwo) ? newRecord : r
    );
    saveToStorage(names, updatedRecords, genders);
    clearFormAndFocus();
  };

  const handleCancelConflict = () => {
    clearFormAndFocus();
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExportPage, setShowExportPage] = useState(false);
  const [showPersonEditor, setShowPersonEditor] = useState(false);
  const [activeOutTool, setActiveOutTool] = useState<'GRAPH' | 'PEOPLE' | 'GROUPS' | 'GENDER' | null>(null);
  const [selectedMenuIdx, setSelectedMenuIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleUpdatePerson = (oldName: string, newName: string, newGender: Gender) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) return;
    
    // Update names while preserving order
    let newNames = [...names];
    if (oldName !== trimmedNew) {
      const idx = newNames.indexOf(oldName);
      if (newNames.includes(trimmedNew)) {
        // Target name already exists (merge scenario), just remove oldName
        newNames = newNames.filter(n => n !== oldName);
      } else if (idx !== -1) {
        // Replace in place to preserve order
        newNames[idx] = trimmedNew;
      } else {
        newNames.push(trimmedNew);
      }
    }
    
    // Update records
    const newRecords = records.map(r => ({
      ...r,
      personOne: r.personOne === oldName ? trimmedNew : r.personOne,
      personTwo: r.personTwo === oldName ? trimmedNew : r.personTwo,
    }));
    
    // Update genders
    const newGenders = { ...genders };
    if (oldName !== trimmedNew) {
      delete newGenders[oldName];
    }
    newGenders[trimmedNew] = newGender;
    
    saveToStorage(newNames, newRecords, newGenders);
  };

  const [editingRecord, setEditingRecord] = useState<ConnectionRecord | null>(null);
  const [editingScore, setEditingScore] = useState(5);

  const handleDelete = (r: ConnectionRecord) => {
    const updated = records.filter(rec => rec !== r);
    saveToStorage(names, updated, genders);
  };

  const handleStartEdit = (r: ConnectionRecord) => {
    setEditingRecord(r);
    setEditingScore(r.score);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const updated = records.map(r => r === editingRecord ? { ...r, score: editingScore } : r);
    saveToStorage(names, updated, genders);
    setEditingRecord(null);
  };

  const handleImportData = (importedRecords: ConnectionRecord[]) => {
    const updatedNames = [...names];
    const updatedRecords = [...records];
    let added = 0;
    
    for (const record of importedRecords) {
      const p1 = record.personOne.toLowerCase().replace(/\s/g, '');
      const p2 = record.personTwo.toLowerCase().replace(/\s/g, '');
      if (!p1 || !p2) continue;

      const existing = updatedRecords.find(r => 
        (r.personOne === p1 && r.personTwo === p2) || 
        (r.personOne === p2 && r.personTwo === p1)
      );

      if (!existing) {
        updatedRecords.push({ personOne: p1, personTwo: p2, score: record.score });
        if (!updatedNames.includes(p1)) updatedNames.push(p1);
        if (!updatedNames.includes(p2)) updatedNames.push(p2);
        added++;
      }
    }
    
    saveToStorage(updatedNames, updatedRecords, genders);
    alert(`Imported ${added} new records. Skipped ${importedRecords.length - added} conflicts/invalid.`);
  };

  const handleImportGenders = (importedGenders: Record<string, Gender>) => {
    const updatedNames = [...names];
    const newGenders = { ...genders, ...importedGenders };
    let added = 0;
    
    for (const name of Object.keys(importedGenders)) {
      if (!updatedNames.includes(name)) {
        updatedNames.push(name);
      }
      added++;
    }
    
    saveToStorage(updatedNames, records, newGenders);
    alert(`Imported ${added} gender records.`);
  };

  if (showExportPage) {
    return <DataManagementPage 
      records={records} 
      names={names}
      genders={genders}
      onClose={() => setShowExportPage(false)} 
      onImport={handleImportData} 
      onImportGenders={handleImportGenders}
    />;
  }
  if (showPersonEditor) {
    return <PersonEditorPage names={names} genders={genders} onSave={handleUpdatePerson} onClose={() => setShowPersonEditor(false)} />;
  }
  if (activeOutTool === 'GRAPH') return <GraphPage records={records} onClose={() => setActiveOutTool(null)} />;
  if (activeOutTool === 'PEOPLE') return <KeyPeoplePage records={records} onClose={() => setActiveOutTool(null)} />;
  if (activeOutTool === 'GROUPS') return <GroupDetectionPage records={records} onClose={() => setActiveOutTool(null)} />;
  if (activeOutTool === 'GENDER') return <GenderAnalysisPage names={names} genders={genders} records={records} onClose={() => setActiveOutTool(null)} />;

  return (
    <div 
      style={{ height: viewportHeight > 0 ? viewportHeight : '100dvh' }}
      className="flex flex-col bg-zinc-950 text-green-500 font-mono relative"
    >
      {/* Menu Overlay */}
      {isMenuOpen && !isInputMode && (
        <div 
          className="absolute inset-0 z-50 flex flex-col justify-end overflow-hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Menu Panel */}
          <div 
            className="relative bg-zinc-950 border-t-2 border-green-800/50 flex flex-col pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '60%' }}
          >
            <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-green-400 uppercase tracking-wider">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="text-green-500 hover:text-green-300 font-bold">Close</button>
            </div>
            
            <div className="overflow-y-auto py-2 flex flex-col gap-1">
              <div 
                onClick={() => { setIsMenuOpen(false); setShowExportPage(true); }}
                onPointerEnter={() => setSelectedMenuIdx(0)}
                className={`flex items-center px-6 py-1 font-bold transition-colors cursor-pointer leading-none ${
                  selectedMenuIdx === 0 ? 'bg-green-900/50 text-green-300' : 'text-green-700/50'
                }`}
              >
                <span className="w-8 shrink-0">{selectedMenuIdx === 0 ? <span className="animate-pulse">{'>'}</span> : ''}</span>
                <span className="text-lg tracking-widest uppercase py-1">Data Management</span>
              </div>
              <div 
                onClick={() => { setIsMenuOpen(false); setShowPersonEditor(true); }}
                onPointerEnter={() => setSelectedMenuIdx(1)}
          [ Menu ]
        </button>
      </div>

      {editingRecord && (
        <div className="absolute inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 p-6 rounded border border-green-900/50 flex flex-col items-center w-full max-w-sm">
            <h2 className="text-green-400 font-bold mb-2">Edit Score</h2>
            <div className="text-zinc-500 font-bold mb-6 truncate w-full">
              {editingRecord.personOne} <span className="text-green-900">—</span> {editingRecord.personTwo}
            </div>
            
            <NumberScroller value={editingScore} onChange={setEditingScore} />
            
            <div className="flex gap-4 mt-8 w-full justify-center">
              <button 
                onClick={() => setEditingRecord(null)}
                className="text-zinc-500 hover:text-red-400 font-bold transition-colors"
              >
                [ Cancel ]
              </button>
              <button 
                onClick={handleSaveEdit}
                className="text-green-500 hover:text-green-300 font-bold transition-colors"
              >
                [ Save ]
              </button>
            </div>
          </div>
        </div>
      )}

      {mainTab === 'IN' ? (
        <>
          {/* Top: Current Record Input */}
          {showAddForm ? (
            <div className="p-4 border-b border-green-900/50 flex flex-col gap-3 shrink-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-400 font-bold text-sm">ADD CONNECTION</span>
                <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-red-400 text-sm font-bold">[ Cancel ]</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-zinc-500">1.</span>
                <input
                  ref={inputOneRef}
                  type="text"
                  value={personOne}
                  onChange={(e) => setPersonOne(e.target.value.toLowerCase().replace(/\s/g, ''))}
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
                  onChange={(e) => setPersonTwo(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  onFocus={() => handleFocus('TWO')}
                  onKeyDown={(e) => handleInputKeyDown(e, 'TWO')}
                  enterKeyHint="next"
                  className="flex-1 bg-transparent border-b border-green-800 focus:border-green-400 outline-none p-1 text-green-300"
                  placeholder="Person Two"
                  disabled={!!conflictRecord}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-green-900/50 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="flex-1 bg-zinc-900 border border-green-900/50 focus:border-green-400 outline-none px-3 py-2 text-green-300 rounded"
              />
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-green-900/30 text-green-400 border border-green-900/50 hover:bg-green-900/50 px-4 py-2 rounded font-bold transition-colors whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          )}

          {/* Middle: Records List OR (Autocomplete / Conflict Popup) */}
          <div className="flex-1 overflow-hidden relative border-b border-green-900/50">
            {!isInputMode ? (
              <div className="h-full overflow-y-auto p-4">
                {filteredRecords.length === 0 ? (
                  <div className="text-zinc-500 italic">{records.length === 0 ? 'No connections saved yet.' : 'No matches found.'}</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredRecords.map((r, i) => (
                      <RecordCard 
                        key={r.personOne + '-' + r.personTwo}
                        index={i}
                        record={r} 
                        onEdit={() => handleStartEdit(r)} 
                        onDelete={() => handleDelete(r)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : conflictRecord ? (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="bg-zinc-900 border border-green-800 p-6 rounded shadow-xl w-full max-w-sm">
                  <h3 className="text-xl font-bold text-green-400 mb-2">Record Exists</h3>
                  <p className="text-green-300 mb-6">
                    Current score is <span className="font-bold text-green-400">{conflictRecord.score}</span>
                  </p>
                  <div className="flex justify-between w-full mt-4">
                    <button 
                      onClick={(e) => { e.preventDefault(); handleCancelConflict(); }}
                      onPointerDown={(e) => e.preventDefault()}
                      className="text-zinc-500 hover:text-red-400 font-bold transition-colors"
                    >
                      [ Cancel ]
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleUpdate(); }}
                      onPointerDown={(e) => e.preventDefault()}
                      className="text-green-500 hover:text-green-300 font-bold transition-colors"
                    >
                      [ Update ]
                    </button>
                  </div>
                </div>
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
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setActiveOutTool('GRAPH')}
              className="bg-zinc-900 border border-green-900/50 p-4 rounded flex flex-col items-start hover:border-green-500 transition-colors text-left group"
            >
              <pre className="text-green-600 font-mono text-[10px] leading-tight mb-3">
{` O-O
 |/
 O`}
              </pre>
              <h3 className="text-green-400 font-bold text-sm sm:text-base mb-1 group-hover:text-green-300">Graph Visualization</h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold hidden sm:block">Interactive node network</p>
            </button>
            <button 
              onClick={() => setActiveOutTool('PEOPLE')}
              className="bg-zinc-900 border border-green-900/50 p-4 rounded flex flex-col items-start hover:border-green-500 transition-colors text-left group"
            >
              <pre className="text-green-600 font-mono text-[10px] leading-tight mb-3">
{`  O
 /|\\
 / \\`}
              </pre>
              <h3 className="text-green-400 font-bold text-sm sm:text-base mb-1 group-hover:text-green-300">Key People Analysis</h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold hidden sm:block">Centrality and influence metrics</p>
            </button>
            <button 
              onClick={() => setActiveOutTool('GROUPS')}
              className="bg-zinc-900 border border-green-900/50 p-4 rounded flex flex-col items-start hover:border-green-500 transition-colors text-left group"
            >
              <pre className="text-green-600 font-mono text-[10px] leading-tight mb-3">
{` O O
 O O`}
              </pre>
              <h3 className="text-green-400 font-bold text-sm sm:text-base mb-1 group-hover:text-green-300">Group Detection</h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold hidden sm:block">Social clusters and communities</p>
            </button>
            <button 
              onClick={() => setActiveOutTool('GENDER')}
              className="bg-zinc-900 border border-green-900/50 p-4 rounded flex flex-col items-start hover:border-green-500 transition-colors text-left group"
            >
              <pre className="text-green-600 font-mono text-[10px] leading-tight mb-3">
{` M F
 F M`}
              </pre>
              <h3 className="text-green-400 font-bold text-sm sm:text-base mb-1 group-hover:text-green-300">Gender Patterns</h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-bold hidden sm:block">Homophily and class composition</p>
            </button>
          </div>
        </div>
      )}

      {/* Bottom: Header/Menu OR Score Selector */}
      <div className="shrink-0 h-20 flex items-center p-2 gap-4 bg-zinc-900/50">
        {!isInputMode || mainTab === 'OUT' ? (
          <div className="w-full flex items-center justify-between px-2 gap-2">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-green-400 shrink-0">Paradooshanam</h1>
            
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

            <div className="flex justify-end shrink-0">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="text-green-400 p-2 hover:bg-green-900/30 rounded"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 h-full relative overflow-hidden bg-zinc-950 rounded border border-green-900/50">
              <ScoreSelector score={score} onChange={setScore} />
            </div>
            <button
              onClick={(e) => { e.preventDefault(); handleSave(); }}
              onPointerDown={(e) => e.preventDefault()}
              disabled={!personOne.trim() || !personTwo.trim() || !!conflictRecord}
              className="h-full px-6 text-green-500 hover:text-green-300 font-bold flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              [ OK ]
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TerminalAutocomplete({
  options,
  onSelect
}: {
  options: string[];
  onSelect: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleLines, setVisibleLines] = useState(5);
  
  // reset cursor when options change
  useEffect(() => {
    setCursorIdx(0);
    setVisibleStart(0);
  }, [options]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Assume 40px per line
        const lines = Math.max(1, Math.floor(height / 40));
        setVisibleLines(lines);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const startYRef = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault(); // Prevent input blur
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (options.length === 0) return;

    const y = e.touches[0].clientY;
    const delta = y - startYRef.current;
    
    // Swipe down (delta > 0) -> move cursor UP (decrease index)
    // Swipe up (delta < 0) -> move cursor DOWN (increase index)
    const threshold = 30;

    if (delta < -threshold) {
      // swipe up
      setCursorIdx(prev => {
        const next = Math.max(0, prev - 1);
        if (next < visibleStart) {
          setVisibleStart(next);
        }
        return next;
      });
      startYRef.current = y;
    } else if (delta > threshold) {
      // swipe down
      setCursorIdx(prev => {
        const next = Math.min(options.length - 1, prev + 1);
        if (next >= visibleStart + visibleLines) {
          setVisibleStart(next - visibleLines + 1);
        }
        return next;
      });
      startYRef.current = y;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (options.length > 0 && options[cursorIdx]) {
      onSelect(options[cursorIdx]);
    }
  };

  if (options.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full p-4 text-zinc-600 flex items-center justify-center"
        onPointerDown={(e) => e.preventDefault()}
      >
        No matches
      </div>
    );
  }

  const visibleOptions = options.slice(visibleStart, visibleStart + visibleLines);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onMouseDown={(e) => { e.preventDefault(); startYRef.current = e.clientY; }}
      onMouseMove={(e) => {
        if (e.buttons !== 1) return;
        e.preventDefault();
        const y = e.clientY;
        const delta = y - startYRef.current;
        const threshold = 30;
        if (delta < -threshold) {
          setCursorIdx(prev => {
            const next = Math.max(0, prev - 1);
            if (next < visibleStart) setVisibleStart(next);
            return next;
          });
          startYRef.current = y;
        } else if (delta > threshold) {
          setCursorIdx(prev => {
            const next = Math.min(options.length - 1, prev + 1);
            if (next >= visibleStart + visibleLines) setVisibleStart(next - visibleLines + 1);
            return next;
          });
          startYRef.current = y;
        }
      }}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full py-1">
        {visibleOptions.map((opt, i) => {
          const actualIdx = visibleStart + i;
          const isSelected = actualIdx === cursorIdx;
          return (
            <div 
              key={opt}
              className={`h-[40px] flex items-center px-4 font-bold transition-colors ${
                isSelected ? 'bg-green-900/50 text-green-300' : 'text-green-700/50'
              }`}
            >
              <span className="w-6 shrink-0">{isSelected ? <span className="animate-pulse">{'>'}</span> : ''}</span>
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreSelector({
  score,
  onChange
}: {
  score: number;
  onChange: (s: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const x = e.touches[0].clientX;
    const delta = x - startXRef.current;
    const threshold = 20;

    if (delta < -threshold) {
      // swipe left
      onChange(Math.max(1, score - 1));
      startXRef.current = x;
    } else if (delta > threshold) {
      // swipe right
      onChange(Math.min(10, score + 1));
      startXRef.current = x;
    }
  };
  
  const items = Array.from({length: 10}, (_, i) => i + 1);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-between px-2 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onMouseDown={(e) => { e.preventDefault(); startXRef.current = e.clientX; }}
      onMouseMove={(e) => {
        if (e.buttons !== 1) return;
        e.preventDefault();
        const x = e.clientX;
        const delta = x - startXRef.current;
        const threshold = 20;
        if (delta < -threshold) {
          onChange(Math.max(1, score - 1));
          startXRef.current = x;
        } else if (delta > threshold) {
          onChange(Math.min(10, score + 1));
          startXRef.current = x;
        }
      }}
    >
      {items.map(val => (
        <div 
          key={val}
          onClick={() => onChange(val)}
          className={`flex items-center justify-center font-bold cursor-pointer w-6 sm:w-8 h-8 ${
            val === score ? 'bg-green-400 text-zinc-950 animate-[pulse_1.5s_ease-in-out_infinite]' : 'text-green-800 hover:text-green-500 transition-colors'
          }`}
        >
          {val}
        </div>
      ))}
    </div>
  );
}



function RecordCard({ 
  record, 
  index,
  onEdit, 
  onDelete 
}: { 
  record: ConnectionRecord; 
  index: number;
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    isHorizontalSwipe.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || startPos.current === null) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
        if (isHorizontalSwipe.current) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } else {
          setIsDragging(false);
        }
      }
      return;
    }

    if (isHorizontalSwipe.current) {
      const dampedDelta = deltaX > 0 ? Math.min(deltaX, 120) : Math.max(deltaX, -120);
      setTranslateX(dampedDelta);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || startPos.current === null) return;
    const deltaX = e.clientX - startPos.current.x;
    startPos.current = null;
    setIsDragging(false);
    if (isHorizontalSwipe.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }

    if (isHorizontalSwipe.current) {
      if (deltaX > 75) {
        onEdit();
      } else if (deltaX < -75) {
        onDelete();
      }
    }
    setTranslateX(0);
  };

  return (
    <div className="relative rounded touch-pan-y">
      {/* Background Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded bg-zinc-950 overflow-hidden">
        <span className={`font-bold transition-opacity duration-200 ${translateX > 40 ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
          EDIT
        </span>
        <span className={`font-bold transition-opacity duration-200 ${translateX < -40 ? 'opacity-100 text-red-500' : 'opacity-0'}`}>
          DELETE
        </span>
      </div>
      
      {/* Draggable Card Surface */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        className="relative bg-zinc-900 rounded border border-zinc-800 px-3 py-3 grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center text-green-300 text-xs sm:text-sm font-bold cursor-grab active:cursor-grabbing select-none"
      >
        <span className="text-zinc-600 font-mono text-xs w-5">{index + 1}.</span>
        <div className="truncate text-zinc-500">{record.personOne}</div>
        <div className="truncate text-zinc-500">{record.personTwo}</div>
        <div className="text-right text-green-400 font-bold w-6">{record.score}</div>
      </div>
    </div>
  );
}
