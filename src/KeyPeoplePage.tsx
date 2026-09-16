import { useMemo } from 'react';
import { ConnectionRecord } from './App';
import Graph from 'graphology';
import eigenvectorCentrality from 'graphology-metrics/centrality/eigenvector';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import closenessCentrality from 'graphology-metrics/centrality/closeness';

export function KeyPeoplePage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  const analysis = useMemo(() => {
    if (records.length === 0) return null;
    const g = new Graph({ type: 'undirected', multi: false });
    
    records.forEach(r => { 
      if (!g.hasNode(r.personOne)) g.addNode(r.personOne);
      if (!g.hasNode(r.personTwo)) g.addNode(r.personTwo);
    });

    records.forEach(r => {
      if (!g.hasEdge(r.personOne, r.personTwo)) {
        g.addEdge(r.personOne, r.personTwo, { weight: r.score, distance: 11 - r.score });
      }
    });

    const toSorted = (map: Record<string, number>) => Object.entries(map)
      .filter(([_, val]) => !isNaN(val))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let eigen = {};
    try { eigen = eigenvectorCentrality(g, { getEdgeWeight: 'weight' }); } catch (e) { console.warn('Eigenvector failed', e); }

    let between = {};
    try { between = betweennessCentrality(g, { getEdgeWeight: 'distance' }); } catch (e) { console.warn('Betweenness failed', e); }
    
    let degree = {};
    try { degree = degreeCentrality(g); } catch (e) { console.warn('Degree failed', e); }

    let closeness = {};
    // closeness centrality does not support edge weights in graphology
    try { closeness = closenessCentrality(g); } catch (e) { console.warn('Closeness failed', e); }

    return {
      influential: toSorted(eigen),
      bridges: toSorted(between),
      connected: toSorted(degree),
      speed: toSorted(closeness)
    };
  }, [records]);

  const renderLeaderboard = (title: string, explanation: string, data: [string, number][] | undefined) => (
    <div className="mb-8">
      <h3 className="text-green-400 font-bold mb-1 border-b border-green-900/50 pb-1">{title}</h3>
      <p className="text-zinc-500 text-xs mb-3 italic">{explanation}</p>
      {(!data || data.length === 0) ? (
        <div className="text-zinc-500 italic text-sm">Not enough data to calculate.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map(([name, score], i) => (
            <div key={name} className="flex justify-between items-center text-sm">
              <div className="flex gap-3 items-center">
                <span className="text-zinc-500 w-4">{i + 1}.</span>
                <span className="text-green-300 font-bold">{name}</span>
              </div>
              <span className="text-green-700">{score.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Key People</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Close ]</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {!analysis ? (
          <div className="text-zinc-500 italic">No records to analyze.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {renderLeaderboard("Most Influential (Eigenvector)", "People connected to other highly connected people.", analysis.influential)}
            {renderLeaderboard("Best Bridges (Betweenness)", "People who connect different groups together.", analysis.bridges)}
            {renderLeaderboard("Most Connected (Degree)", "People with the highest number of direct connections.", analysis.connected)}
            {renderLeaderboard("Fastest Spread (Closeness)", "People who can reach everyone else in the fewest steps.", analysis.speed)}
          </div>
        )}
      </div>
    </div>
  );
}
