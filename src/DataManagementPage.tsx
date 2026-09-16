import { useState } from 'react';
import { ConnectionRecord } from './App';
import { GraphVisualizer } from './GraphPage';

interface DataManagementPageProps {
  records: ConnectionRecord[];
  onClose: () => void;
  onImport: (records: ConnectionRecord[]) => void;
}

export function DataManagementPage({ 
  records, 
  onClose,
  onImport
}: DataManagementPageProps) {
  const [downloadFormat, setDownloadFormat] = useState<'txt' | 'csv' | null>(null);
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');

  // Preview State
  const [previewRecords, setPreviewRecords] = useState<{ personOne: string, personTwo: string, score: number }[] | null>(null);
  const [rawMin, setRawMin] = useState(1);
  const [rawMax, setRawMax] = useState(10);
  const [order, setOrder] = useState<'ASC' | 'DESC'>('ASC');

  const rawText = records.map(r => `${r.personOne} ${r.personTwo} ${r.score}`).join('\n');
  const csvText = records.map(r => `${r.personOne},${r.personTwo},${r.score}`).join('\n');

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(rawText);
        alert('Copied to clipboard!');
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = rawText;
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
    const text = format === 'csv' ? csvText : rawText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paradooshanam_records.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadFormat(null);
  };

  const processImportText = (text: string) => {
    const lines = text.split('\n');
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
      if (content) processImportText(content);
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
        <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Map Scores</h2>
          <button onClick={() => setPreviewRecords(null)} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Cancel ]</button>
        </div>
        
        {/* Graph Preview */}
        <div className="flex-1 relative border-b border-green-900/50 min-h-0">
          <GraphVisualizer records={mappedRecords} />
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
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Data Management</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Close ]</button>
      </div>

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
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap break-words text-green-300 font-mono select-all">
              {rawText || "No records to export."}
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
                <button onClick={handleCopy} className="text-zinc-500 hover:text-green-300 transition-colors">[ Copy Raw ]</button>
                <button onClick={() => setDownloadFormat('txt')} className="text-green-500 hover:text-green-300 transition-colors">[ Download File ]</button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'IMPORT' && (
        <div className="flex-1 flex flex-col p-4 gap-6 overflow-y-auto">
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
              placeholder="personOne personTwo 5&#10;alice bob 8"
              className="flex-1 bg-zinc-900 border border-green-900/50 rounded p-4 text-green-300 focus:outline-none focus:border-green-500 resize-none font-mono text-sm"
            />
            <button 
              onClick={() => processImportText(importText)}
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
