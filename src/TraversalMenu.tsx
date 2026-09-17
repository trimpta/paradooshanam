import { useState, useMemo, useEffect } from 'react';

interface TraversalMenuProps {
  validNodes: string[];
  mode: 'none' | 'sequence' | 'random';
  setMode: (mode: 'none' | 'sequence' | 'random') => void;
  sequence: string[];
  setSequence: (seq: string[]) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

export function TraversalMenu({ validNodes, mode, setMode, sequence, setSequence, speed, setSpeed }: TraversalMenuProps) {
  const [inputVal, setInputVal] = useState(sequence.join(', ') + (sequence.length > 0 ? ', ' : ''));
  const [focused, setFocused] = useState(false);
  const validNodesSet = useMemo(() => new Set(validNodes), [validNodes]);
  
  // Parse input
  const segments = useMemo(() => {
    return inputVal.split(',').map(s => s.trim());
  }, [inputVal]);

  const committedSegments = segments.slice(0, -1);
  const currentSearch = segments[segments.length - 1];

  const invalidEntries = useMemo(() => {
    return committedSegments.filter(s => s && !validNodesSet.has(s));
  }, [committedSegments, validNodesSet]);

  useEffect(() => {
    // Only valid segments go to the actual sequence state if there are no invalid ones
    const validCommitted = committedSegments.filter(s => s && validNodesSet.has(s));
    setSequence(validCommitted);
  }, [committedSegments, validNodesSet, setSequence]);

  const suggestions = useMemo(() => {
    if (!currentSearch) return [];
    return validNodes
      .filter(n => n.toLowerCase().includes(currentSearch.toLowerCase()))
      .slice(0, 5);
  }, [currentSearch, validNodes]);

  const applySuggestion = (s: string) => {
    const newSegments = [...committedSegments, s, ''];
    setInputVal(newSegments.join(', '));
  };

  const deleteInvalid = (idx: number) => {
    // Find the actual index of the invalid entry in committedSegments
    let invalidCount = 0;
    const finalSegments = committedSegments.filter(s => {
      if (s && !validNodesSet.has(s)) {
        if (invalidCount === idx) {
          invalidCount++;
          return false;
        }
        invalidCount++;
      }
      return true;
    });
    setInputVal([...finalSegments, currentSearch].join(', '));
  };

  const replaceInvalid = (idx: number, replacement: string) => {
    let invalidCount = 0;
    const finalSegments = committedSegments.map(s => {
      if (s && !validNodesSet.has(s)) {
        if (invalidCount === idx) {
          invalidCount++;
          return replacement;
        }
        invalidCount++;
      }
      return s;
    });
    setInputVal([...finalSegments, currentSearch].join(', '));
  };

  const deleteAllInvalid = () => {
    const finalSegments = committedSegments.filter(s => !s || validNodesSet.has(s));
    setInputVal([...finalSegments, currentSearch].join(', '));
  };

  return (
    <div className="flex flex-col gap-4 p-2 bg-zinc-950 border border-green-900/30 rounded">
      <div className="text-green-400 font-bold text-sm uppercase tracking-wider mb-2">Graph Traversal</div>
      
      <div className="relative">
        <input 
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Node1, Node2, ..."
          className="w-full bg-zinc-900 border border-green-900/50 text-green-300 p-2 text-sm rounded outline-none focus:border-green-400"
        />
        {focused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-green-900/50 rounded shadow-xl z-50">
            {suggestions.map(s => (
              <div 
                key={s} 
                className="p-2 text-sm text-green-300 hover:bg-green-900/30 cursor-pointer"
                onClick={() => applySuggestion(s)}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {invalidEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-red-400 text-xs font-bold">
            <span>Invalid Nodes</span>
            <button onClick={deleteAllInvalid} className="hover:text-red-300 underline">Delete All</button>
          </div>
          {invalidEntries.map((invalidNode, i) => {
            return (
              <InvalidResolutionCard 
                key={i} 
                invalidNode={invalidNode} 
                validNodes={validNodes} 
                onReplace={(replacement) => replaceInvalid(i, replacement)} 
                onDelete={() => deleteInvalid(i)} 
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <label className="text-xs text-green-400 font-bold flex justify-between">
          Speed ({speed}ms)
          <input type="range" min="200" max="3000" step="100" value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-1/2 accent-green-500" />
        </label>
      </div>

      <div className="flex gap-2 mt-2">
        {mode === 'none' ? (
          <>
            <button 
              onClick={() => setMode('sequence')} 
              disabled={invalidEntries.length > 0 || sequence.length === 0}
              className="flex-1 bg-green-900/30 border border-green-900 text-green-400 text-xs font-bold p-2 rounded hover:bg-green-900/50 disabled:opacity-50"
            >
              Start Sequence
            </button>
            <button 
              onClick={() => setMode('random')} 
              className="flex-1 bg-green-900/30 border border-green-900 text-green-400 text-xs font-bold p-2 rounded hover:bg-green-900/50"
            >
              Start Random
            </button>
          </>
        ) : (
          <button 
            onClick={() => setMode('none')} 
            className="flex-1 bg-red-900/30 border border-red-900 text-red-400 text-xs font-bold p-2 rounded hover:bg-red-900/50"
          >
            Stop Traversal
          </button>
        )}
      </div>
    </div>
  );
}

function InvalidResolutionCard({ invalidNode, validNodes, onReplace, onDelete }: { invalidNode: string, validNodes: string[], onReplace: (r: string) => void, onDelete: () => void }) {
  // Simple Levenshtein distance for fuzzy matching
  const levenshtein = (a: string, b: string) => {
    let m: any[] = [], i: number, j: number;
    const min = Math.min;
    if (!(a && b)) return (b || a).length;
    for (i = 0; i <= b.length; m[i] = [i++]);
    for (j = 0; j <= a.length; m[0][j] = j++);
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                ? m[i - 1][j - 1]
                : m[i][j - 1] = min(
                    m[i - 1][j - 1] + 1,
                    min(m[i][j] + 1, m[i - 1][j] + 1)
                );
        }
    }
    return m[b.length][a.length];
  };

  const topMatch = useMemo(() => {
    let best = '';
    let bestScore = Infinity;
    validNodes.forEach(n => {
      const dist = levenshtein(invalidNode.toLowerCase(), n.toLowerCase());
      if (dist < bestScore) {
        bestScore = dist;
        best = n;
      }
    });
    return best;
  }, [invalidNode, validNodes]);

  const [replacing, setReplacing] = useState(false);
  const [replaceInput, setReplaceInput] = useState('');
  
  const suggestions = useMemo(() => {
    if (!replaceInput) return [];
    return validNodes.filter(n => n.toLowerCase().includes(replaceInput.toLowerCase())).slice(0, 5);
  }, [replaceInput, validNodes]);

  return (
    <div className="bg-red-950/20 border border-red-900/50 p-2 rounded flex flex-col gap-2">
      <div className="text-red-300 text-xs">
        "<span className="font-bold">{invalidNode}</span>" not found. Did you mean "<span className="font-bold text-green-400">{topMatch}</span>"?
      </div>
      {replacing ? (
        <div className="relative">
          <input 
            type="text" 
            autoFocus 
            value={replaceInput} 
            onChange={e => setReplaceInput(e.target.value)} 
            placeholder="Search another..."
            className="w-full bg-zinc-900 text-xs p-1 border border-zinc-700 text-green-300 rounded outline-none"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-green-900/50 rounded shadow-xl z-50">
              {suggestions.map(s => (
                <div 
                  key={s} 
                  className="p-1 text-xs text-green-300 hover:bg-green-900/30 cursor-pointer"
                  onClick={() => onReplace(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onReplace(topMatch)} className="bg-zinc-900 hover:bg-zinc-800 text-green-400 text-[10px] px-2 py-1 rounded border border-green-900/50 flex-1">
            Replace with {topMatch}
          </button>
          <button onClick={() => setReplacing(true)} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] px-2 py-1 rounded border border-zinc-700 flex-1">
            Replace other
          </button>
          <button onClick={onDelete} className="bg-zinc-900 hover:bg-red-900/30 text-red-400 text-[10px] px-2 py-1 rounded border border-red-900/50">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
