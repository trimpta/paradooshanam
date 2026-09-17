import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface MenuOption {
  id: string;
  label?: string;
  type: 'toggle' | 'slider' | 'number' | 'custom';
  value?: any;
  onChange?: (val: any) => void;
  info?: string;
  min?: number;
  max?: number;
  step?: number;
  render?: () => React.ReactNode;
}

interface CardHeaderProps {
  title: string;
  onClose: () => void;
  menuOptions?: MenuOption[];
  children?: React.ReactNode;
  centerContent?: React.ReactNode;
}

export function CardHeader({ title, onClose, menuOptions, children, centerContent }: CardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  return (
    <div className="relative shrink-0 z-50">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center bg-zinc-950 relative">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-zinc-500 hover:text-green-400 font-bold transition-colors text-xl">
             &lt;-
          </button>
          <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">{title}</h2>
        </div>
        {centerContent && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {centerContent}
          </div>
        )}
        <div className="flex items-center gap-4">
          {children}
          {menuOptions && menuOptions.length > 0 && (
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-zinc-500 hover:text-green-400 font-bold transition-colors">
              [ Menu ]
            </button>
          )}
        </div>
      </div>

      {menuOpen && menuOptions && menuOptions.length > 0 && (
        <div className="absolute top-full right-0 mt-0 w-full sm:w-80 bg-zinc-900 border-b border-l border-green-900/50 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 overflow-y-auto flex flex-col gap-4">
            {menuOptions.map(opt => (
              <div key={opt.id} className="flex flex-col gap-2">
                {opt.type === 'custom' && opt.render ? (
                  opt.render()
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-sm">{opt.label}</span>
                        {opt.info && (
                          <button onClick={() => setActiveInfo(activeInfo === opt.id ? null : opt.id)} className="text-zinc-500 hover:text-green-300">
                            <Info size={14} className="rounded-full border border-current p-[1px]" />
                          </button>
                        )}
                      </div>
                      {opt.type === 'toggle' && opt.onChange && (
                        <button 
                          onClick={() => opt.onChange!( !opt.value )}
                          className={`text-xs font-bold px-2 py-1 border rounded ${opt.value ? 'bg-green-900/50 border-green-400 text-green-400' : 'border-zinc-700 text-zinc-500'}`}
                        >
                          {opt.value ? 'ON' : 'OFF'}
                        </button>
                      )}
                      {opt.type === 'number' && opt.onChange && (
                        <input 
                          type="number" 
                          value={opt.value} 
                          onChange={e => opt.onChange!(parseFloat(e.target.value))}
                          className="bg-zinc-950 border border-green-900/30 text-green-300 px-2 py-1 text-right w-20 rounded text-sm outline-none focus:border-green-400"
                        />
                      )}
                    </div>
                    {opt.type === 'slider' && opt.onChange && (
                      <input 
                        type="range" 
                        min={opt.min} max={opt.max} step={opt.step} 
                        value={opt.value} 
                        onChange={e => opt.onChange!(parseFloat(e.target.value))}
                        className="w-full accent-green-500"
                      />
                    )}
                    
                    {activeInfo === opt.id && opt.info && (
                      <div className="text-xs text-zinc-400 bg-zinc-950/50 p-2 rounded border border-green-900/30 leading-relaxed">
                        {opt.info}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
