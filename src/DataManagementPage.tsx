import { useState } from 'react';
import { ConnectionRecord, Gender } from './App';
import { GraphVisualizer } from './GraphPage';
import { CardHeader } from './CardHeader';

interface DataManagementPageProps {
  records: ConnectionRecord[];
  names: string[];
  genders: Record<string, Gender>;
  onClose: () => void;
  onImport: (records: ConnectionRecord[]) => void;
  onImportGenders: (genders: Record<string, Gender>) => void;
}

export function DataManagementPage({ 
  records, 
  names,
  genders,
  onClose,
  onImport,
  onImportGenders
}: DataManagementPageProps) {
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'csv' | null>(null);
  const [downloadMode, setDownloadMode] = useState<'CONNECTIONS' | 'GENDERS'>('CONNECTIONS');
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [importMode, setImportMode] = useState<'CONNECTIONS' | 'GENDERS'>('CONNECTIONS');

  // Preview State
  const [previewRecords, setPreviewRecords] = useState<{ personOne: string, personTwo: string, score: number }[] | null>(null);
  const [rawMin, setRawMin] = useState(1);
  const [rawMax, setRawMax] = useState(10);
  const [order, setOrder] = useState<'ASC' | 'DESC'>('ASC');

  const rawText = records.map(r => `${r.personOne} ${r.personTwo} ${r.score}`).join('\n');
  const csvText = records.map(r => `${r.personOne},${r.personTwo},${r.score}`).join('\n');

  const rawGenderText = names.map(n => `${n} ${genders[n] || 'U'}`).join('\n');
  const csvGenderText = names.map(n => `${n},${genders[n] || 'U'}`).join('\n');

  const handleCopy = async (mode: 'CONNECTIONS' | 'GENDERS') => {
    try {
      const textToCopy = mode === 'CONNECTIONS' ? rawText : rawGenderText;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        alert('Copied to clipboard!');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert('Copied to clipboard!');
        } catch (error) {
          console.error(error);
          alert('Failed to copy. Try manually selecting the text.');
        } finally {
          textArea.remove();
        }
      }
    } catch (e) {
      console.error(e);
      alert('Failed to copy');
    }
  };

  const handleDownload = (format: 'txt' | 'csv') => {
    const text = downloadMode === 'CONNECTIONS' ? (format === 'csv' ? csvText : rawText) : (format === 'csv' ? csvGenderText : rawGenderText);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadMode === 'CONNECTIONS' ? `paradooshanam_records.${format}` : `paradooshanam_genders.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadFormat(null);
  };

  const processImportText = (text: string, mode: 'CONNECTIONS' | 'GENDERS') => {
    const lines = text.split('\n');
    
    if (mode === 'GENDERS') {
      const newGenders: Record<string, Gender> = {};
      for (const line of lines) {
        const parts = line.trim().split(/[\s,]+/);
        if (parts.length >= 2) {
          const name = parts.slice(0, -1).join(' ').toLowerCase();
          const g = parts[parts.length - 1].toUpperCase();
          if (g === 'M' || g === 'F' || g === 'U') {
            newGenders[name] = g as Gender;
          }
        }
      }
      if (Object.keys(newGenders).length === 0) {
        alert("No valid gender records found.");
        return;
      }
      onImportGenders(newGenders);
      setImportText('');
      return;
    }

    const newRecords: { personOne: string, personTwo: string, score: number }[] = [];
    let minScore = Infinity;
    let maxScore = -Infinity;
    
    for (const line of lines) {
      const parts = line.trim().split(/[\s,]+/);
      if (parts.length >= 3) {
        const score = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(score)) {
          const p1 = parts[0];
          const p2 = parts[1];
          if (score < minScore) minScore = score;
          if (score > maxScore) maxScore = score;
          newRecords.push({ personOne: p1, personTwo: p2, score });
        }
      }
    }

    if (newRecords.length === 0) {
      alert("No valid records found to import.");
      return;
    }

    if (minScore === Infinity) minScore = 1;
    if (maxScore === -Infinity) maxScore = 10;
    if (minScore === maxScore) maxScore = minScore + 1; // avoid division by zero

    setRawMin(minScore);
    setRawMax(maxScore);
    setOrder('ASC');
    setPreviewRecords(newRecords);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) processImportText(content, importMode);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!previewRecords) return;
    const mapped = previewRecords.map(r => {
      let m = 0;
      const raw = Math.max(rawMin, Math.min(rawMax, r.score)); // clamp
      if (order === 'ASC') {
        m = 1 + 9 * (raw - rawMin) / (rawMax - rawMin);
      } else {
        m = 10 - 9 * (raw - rawMin) / (rawMax - rawMin);
      }
      return { ...r, score: Math.round(m) };
    });
    onImport(mapped);
    setPreviewRecords(null);
    setImportText('');
  };

  if (previewRecords) {
    const mappedRecords = previewRecords.map(r => {
      let m = 0;
      const raw = Math.max(rawMin, Math.min(rawMax, r.score));
      if (order === 'ASC') {
        m = 1 + 9 * (raw - rawMin) / (rawMax - rawMin);
      } else {
        m = 10 - 9 * (raw - rawMin) / (rawMax - rawMin);
      }
      return { ...r, score: Math.round(m) };
    });

    return (
      <div className="absolute inset-0 z-50 h-[100dvh] bg-zinc-950 text-green-500 font-mono flex flex-col">
        <CardHeader title="Map Scores" onClose={() => setPreviewRecords(null)} />
        
        {/* Graph Preview */}
        <div className="flex-1 relative border-b border-green-900/50 min-h-0">
          <GraphVisualizer records={mappedRecords} obfuscated={false} settings={{
            physicsEnabled: true,
            baseDistance: 20,
            autoZoom: false,
            chargeStrength: -200,
            alphaDecay: 0.05
          }} />
        </div>

        {/* Controls */}
        <div className="shrink-0 p-4 flex flex-col gap-4 bg-zinc-900/30 overflow-y-auto" style={{ maxHeight: '40vh' }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-green-400 font-bold uppercase tracking-widest text-sm text-center">Minimum Score</label>
              <div className="flex justify-center items-center gap-4 bg-zinc-900 border border-green-900/50 rounded p-2">
                <button onClick={() => setRawMin(m => m - 1)} className="text-zinc-400 hover:text-green-300 font-bold px-3 py-1 bg-zinc-950 rounded border border-green-900/30">[-]</button>
                <span className="font-bold text-xl w-8 text-center">{rawMin}</span>
                <button onClick={() => setRawMin(m => m + 1)} className="text-zinc-400 hover:text-green-300 font-bold px-3 py-1 bg-zinc-950 rounded border border-green-900/30">[+]</button>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <label className="text-green-400 font-bold uppercase tracking-widest text-sm text-center">Maximum Score</label>
              <div className="flex justify-center items-center gap-4 bg-zinc-900 border border-green-900/50 rounded p-2">
                <button onClick={() => setRawMax(m => Math.max(rawMin + 1, m - 1))} className="text-zinc-400 hover:text-green-300 font-bold px-3 py-1 bg-zinc-950 rounded border border-green-900/30">[-]</button>
                <span className="font-bold text-xl w-8 text-center">{rawMax}</span>
                <button onClick={() => setRawMax(m => m + 1)} className="text-zinc-400 hover:text-green-300 font-bold px-3 py-1 bg-zinc-950 rounded border border-green-900/30">[+]</button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-green-400 font-bold uppercase tracking-widest text-sm text-center">Order</label>
            <div className="flex justify-center items-center bg-zinc-900 border border-green-900/50 p-1 rounded mx-auto max-w-sm w-full">
              <button 
                onClick={() => setOrder('ASC')}
                className={`flex-1 px-4 py-2 rounded text-sm font-bold transition-colors ${order === 'ASC' ? 'bg-green-700 text-zinc-950' : 'text-green-600/50'}`}
              >
                ASCENDING
              </button>
              <button 
                onClick={() => setOrder('DESC')}
                className={`flex-1 px-4 py-2 rounded text-sm font-bold transition-colors ${order === 'DESC' ? 'bg-green-700 text-zinc-950' : 'text-green-600/50'}`}
              >
                DESCENDING
              </button>
            </div>
          </div>

          <button 
            onClick={handleConfirmImport}
            className="w-full mt-2 bg-green-900/50 text-green-300 font-bold py-3 rounded hover:bg-green-800/50 transition-colors uppercase tracking-widest"
          >
            [ Confirm Import ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 h-[100dvh] bg-zinc-950 text-green-500 font-mono flex flex-col">
      <CardHeader title="Data Management" onClose={onClose} />

      <div className="flex border-b border-green-900/50 shrink-0">
        <button 
          onClick={() => setActiveTab('EXPORT')}
          className={`flex-1 py-3 font-bold transition-colors ${activeTab === 'EXPORT' ? 'bg-green-900/30 text-green-300' : 'text-zinc-500 hover:text-green-300'}`}
        >
          [ EXPORT ]
        </button>
        <button 
          onClick={() => setActiveTab('IMPORT')}
          className={`flex-1 py-3 font-bold transition-colors ${activeTab === 'IMPORT' ? 'bg-green-900/30 text-green-300' : 'text-zinc-500 hover:text-green-300'}`}
        >
          [ IMPORT ]
        </button>
      </div>
      
      {activeTab === 'EXPORT' && (
        <>
          <div className="flex justify-center border-b border-green-900/50 p-2 gap-4 shrink-0 bg-zinc-900/30 text-sm">
            <button 
              onClick={() => setDownloadMode('CONNECTIONS')}
              className={`font-bold transition-colors ${downloadMode === 'CONNECTIONS' ? 'text-green-300 underline' : 'text-zinc-500 hover:text-green-400'}`}
            >Connections</button>
            <button 
              onClick={() => setDownloadMode('GENDERS')}
              className={`font-bold transition-colors ${downloadMode === 'GENDERS' ? 'text-green-300 underline' : 'text-zinc-500 hover:text-green-400'}`}
            >Genders</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap break-words text-green-300 font-mono select-all">
              {downloadMode === 'CONNECTIONS' ? (rawText || "No records to export.") : (rawGenderText || "No genders to export.")}
            </pre>
          </div>

          <div className="p-4 border-t border-green-900/50 flex flex-col gap-2 shrink-0">
            {downloadFormat ? (
              <>
                <div className="text-center text-green-400 text-sm mb-2 font-bold uppercase tracking-widest">Select Format</div>
                <div className="flex justify-between w-full font-bold">
                  <button onClick={() => handleDownload('txt')} className="text-green-500 hover:text-green-300 transition-colors">[ .TXT ]</button>
                  <button onClick={() => handleDownload('csv')} className="text-green-500 hover:text-green-300 transition-colors">[ .CSV ]</button>
                  <button onClick={() => setDownloadFormat(null)} className="text-zinc-500 hover:text-red-400 transition-colors">[ Cancel ]</button>
                </div>
              </>
            ) : (
              <div className="flex justify-between w-full font-bold">
                <button onClick={() => handleCopy(downloadMode)} className="text-zinc-500 hover:text-green-300 transition-colors">[ Copy Raw ]</button>
                <button onClick={() => setDownloadFormat('txt')} className="text-green-500 hover:text-green-300 transition-colors">[ Download File ]</button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'IMPORT' && (
        <div className="flex-1 flex flex-col p-4 gap-6 overflow-y-auto">
          <div className="flex justify-center border-b border-green-900/50 pb-4 gap-4 shrink-0 text-sm">
            <button 
              onClick={() => setImportMode('CONNECTIONS')}
              className={`font-bold transition-colors ${importMode === 'CONNECTIONS' ? 'text-green-300 underline' : 'text-zinc-500 hover:text-green-400'}`}
            >Connections</button>
            <button 
              onClick={() => setImportMode('GENDERS')}
              className={`font-bold transition-colors ${importMode === 'GENDERS' ? 'text-green-300 underline' : 'text-zinc-500 hover:text-green-400'}`}
            >Genders</button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-green-400 font-bold uppercase tracking-widest text-sm">Upload File (.txt, .csv)</label>
            <input 
              type="file" 
              accept=".txt,.csv"
              onChange={handleFileImport}
              className="bg-zinc-900 border border-green-900/50 p-2 rounded text-green-300 file:bg-green-900/50 file:border-none file:text-green-400 file:px-4 file:py-1 file:rounded file:font-bold file:mr-4 file:cursor-pointer hover:file:bg-green-800/50 transition-colors cursor-pointer"
            />
          </div>
          <div className="text-center text-zinc-500 font-bold text-sm">- OR -</div>
          <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
            <label className="text-green-400 font-bold uppercase tracking-widest text-sm">Paste Raw Data</label>
            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={importMode === 'CONNECTIONS' ? "personOne personTwo 5\nalice bob 8" : "alice F\nbob M"}
              className="flex-1 bg-zinc-900 border border-green-900/50 rounded p-4 text-green-300 focus:outline-none focus:border-green-500 resize-none font-mono text-sm"
            />
            <button 
              onClick={() => processImportText(importText, importMode)}
              disabled={!importText.trim()}
              className="mt-2 bg-green-900/50 text-green-300 font-bold py-3 rounded hover:bg-green-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              [ Import Pasted Data ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
