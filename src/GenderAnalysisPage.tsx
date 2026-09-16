import { useMemo } from 'react';
import { ConnectionRecord, Gender } from './App';

interface GenderAnalysisPageProps {
  names: string[];
  genders: Record<string, Gender>;
  records: ConnectionRecord[];
  onClose: () => void;
}

export function GenderAnalysisPage({ names, genders, records, onClose }: GenderAnalysisPageProps) {
  const stats = useMemo(() => {
    let mCount = 0;
    let fCount = 0;
    let uCount = 0;

    names.forEach(n => {
      const g = genders[n] || 'U';
      if (g === 'M') mCount++;
      else if (g === 'F') fCount++;
      else uCount++;
    });

    const totalPop = names.length;
    const knownPop = mCount + fCount;

    let mm = 0;
    let ff = 0;
    let mf = 0;
    let other = 0;

    records.forEach(r => {
      const g1 = genders[r.personOne] || 'U';
      const g2 = genders[r.personTwo] || 'U';

      if (g1 === 'M' && g2 === 'M') mm++;
      else if (g1 === 'F' && g2 === 'F') ff++;
      else if ((g1 === 'M' && g2 === 'F') || (g1 === 'F' && g2 === 'M')) mf++;
      else other++;
    });

    const totalLinks = mm + ff + mf + other;
    const knownLinks = mm + ff + mf;

    let expectedMM = 0;
    let expectedFF = 0;
    let expectedMF = 0;

    if (knownPop > 0) {
      const pM = mCount / knownPop;
      const pF = fCount / knownPop;
      expectedMM = pM * pM;
      expectedFF = pF * pF;
      expectedMF = 2 * pM * pF;
    }

    return {
      mCount, fCount, uCount, totalPop, knownPop,
      mm, ff, mf, other, totalLinks, knownLinks,
      expectedMM, expectedFF, expectedMF
    };
  }, [names, genders, records]);

  const p = (num: number, total: number) => total > 0 ? ((num / total) * 100).toFixed(1) + '%' : '0.0%';
  const diff = (actual: number, total: number, expected: number) => {
    if (total === 0) return '0.0%';
    const act = actual / total;
    const d = (act - expected) * 100;
    return (d > 0 ? '+' : '') + d.toFixed(1) + '%';
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 text-green-500 font-mono flex flex-col">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Gender Patterns</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Close ]</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div className="bg-zinc-900/50 p-6 rounded border border-green-900/30">
          <h3 className="text-green-400 font-bold mb-4 border-b border-green-900/30 pb-2">Class Composition</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Male (M):</div><div className="text-right text-green-300 font-bold">{stats.mCount} <span className="text-zinc-500">({p(stats.mCount, stats.totalPop)})</span></div>
            <div>Female (F):</div><div className="text-right text-green-300 font-bold">{stats.fCount} <span className="text-zinc-500">({p(stats.fCount, stats.totalPop)})</span></div>
            <div>Unknown (U):</div><div className="text-right text-green-300 font-bold">{stats.uCount} <span className="text-zinc-500">({p(stats.uCount, stats.totalPop)})</span></div>
            <div className="pt-2 border-t border-green-900/30">Total:</div><div className="pt-2 border-t border-green-900/30 text-right text-green-300 font-bold">{stats.totalPop}</div>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded border border-green-900/30">
          <h3 className="text-green-400 font-bold mb-4 border-b border-green-900/30 pb-2">Homophily (Known Genders)</h3>
          {stats.knownLinks === 0 ? (
            <div className="text-zinc-500 italic text-sm">Not enough connections between known genders.</div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 text-sm text-right">
              <div className="text-left font-bold text-zinc-500 border-b border-green-900/30 pb-1">Type</div>
              <div className="font-bold text-zinc-500 border-b border-green-900/30 pb-1">Actual</div>
              <div className="font-bold text-zinc-500 border-b border-green-900/30 pb-1">Expected</div>
              <div className="font-bold text-zinc-500 border-b border-green-900/30 pb-1">Bias</div>

              <div className="text-left">M - M</div>
              <div className="text-green-300 font-bold">{p(stats.mm, stats.knownLinks)}</div>
              <div>{(stats.expectedMM * 100).toFixed(1)}%</div>
              <div className={stats.mm / stats.knownLinks > stats.expectedMM ? 'text-green-400' : 'text-red-400'}>{diff(stats.mm, stats.knownLinks, stats.expectedMM)}</div>

              <div className="text-left">F - F</div>
              <div className="text-green-300 font-bold">{p(stats.ff, stats.knownLinks)}</div>
              <div>{(stats.expectedFF * 100).toFixed(1)}%</div>
              <div className={stats.ff / stats.knownLinks > stats.expectedFF ? 'text-green-400' : 'text-red-400'}>{diff(stats.ff, stats.knownLinks, stats.expectedFF)}</div>

              <div className="text-left">M - F</div>
              <div className="text-green-300 font-bold">{p(stats.mf, stats.knownLinks)}</div>
              <div>{(stats.expectedMF * 100).toFixed(1)}%</div>
              <div className={stats.mf / stats.knownLinks > stats.expectedMF ? 'text-green-400' : 'text-red-400'}>{diff(stats.mf, stats.knownLinks, stats.expectedMF)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
