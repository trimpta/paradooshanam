import { useState } from 'react';
import { CardHeader } from './CardHeader';
import { Gender, fuzzyMatch } from './App';

interface PersonEditorPageProps {
  names: string[];
  genders: Record<string, Gender>;
  onSave: (oldName: string, newName: string, newGender: Gender) => void;
  onClose: () => void;
}

export function PersonEditorPage({ names, genders, onSave, onClose }: PersonEditorPageProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editGender, setEditGender] = useState<Gender>('U');
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartEdit = (name: string) => {
    setEditingName(name);
    setEditInput(name);
    setEditGender(genders[name] || 'U');
  };

  const handleCommit = () => {
    if (!editingName) return;
    onSave(editingName, editInput, editGender);
    setEditingName(null);
  };

  const filteredNames = names.filter(n => fuzzyMatch(searchQuery, n));

  return (
    <div className="absolute inset-0 z-[60] bg-zinc-950 text-green-500 font-mono flex flex-col">
      <CardHeader title="Person Editor" onClose={onClose} />

      <div className="p-4 border-b border-green-900/50 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full bg-zinc-900 border border-green-900/50 focus:border-green-400 outline-none px-3 py-2 text-green-300 rounded"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {filteredNames.length === 0 && (
          <div className="text-zinc-500 italic">{names.length === 0 ? 'No people found.' : 'No matches found.'}</div>
        )}
        {filteredNames.map(name => (
          <div key={name} className="bg-zinc-900/50 border border-green-900/30 rounded p-4">
            {editingName === name ? (
              <div className="flex flex-col gap-4">
                <input 
                  value={editInput}
                  onChange={e => setEditInput(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="bg-transparent border-b border-green-500 text-green-400 font-bold focus:outline-none py-1"
                />
                <div className="flex gap-4 font-bold text-sm">
                  <button 
                    onClick={() => setEditGender(editGender === 'M' ? 'U' : 'M')} 
                    className={`transition-colors ${editGender === 'M' ? 'text-green-400 bg-green-900/30' : 'text-zinc-500 hover:text-green-300'} px-2 py-1 rounded border border-green-900/30`}
                  >[ M ]</button>
                  <button 
                    onClick={() => setEditGender(editGender === 'F' ? 'U' : 'F')} 
                    className={`transition-colors ${editGender === 'F' ? 'text-green-400 bg-green-900/30' : 'text-zinc-500 hover:text-green-300'} px-2 py-1 rounded border border-green-900/30`}
                  >[ F ]</button>
                </div>
                <div className="flex justify-end gap-4 font-bold text-sm mt-2">
                  <button onClick={() => setEditingName(null)} className="text-zinc-500 hover:text-red-400 transition-colors">[ Cancel ]</button>
                  <button onClick={handleCommit} className="text-green-500 hover:text-green-300 transition-colors">[ Save ]</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center group">
                <span className="text-green-400 font-bold truncate pr-4">{name}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex border border-zinc-800 rounded overflow-hidden text-xs">
                    <button 
                      onClick={() => onSave(name, name, genders[name] === 'M' ? 'U' : 'M')}
                      className={`px-3 py-1 font-bold transition-colors ${genders[name] === 'M' ? 'bg-green-900 text-green-300' : 'bg-zinc-900 text-zinc-600 hover:text-green-500'}`}
                    >
                      M
                    </button>
                    <button 
                      onClick={() => onSave(name, name, genders[name] === 'F' ? 'U' : 'F')}
                      className={`px-3 py-1 font-bold transition-colors border-l border-zinc-800 ${genders[name] === 'F' ? 'bg-green-900 text-green-300' : 'bg-zinc-900 text-zinc-600 hover:text-green-500'}`}
                    >
                      F
                    </button>
                  </div>
                  <span onClick={() => handleStartEdit(name)} className="text-zinc-500 hover:text-green-400 transition-colors cursor-pointer text-sm font-bold">[ Edit ]</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
