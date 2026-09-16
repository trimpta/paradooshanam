import { useMemo } from 'react';
import { ConnectionRecord } from './App';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

export function GroupDetectionPage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  const groups = useMemo(() => {
    if (records.length === 0) return null;
    const g = new Graph({ type: 'undirected', multi: false });
    
    records.forEach(r => { 
      if (!g.hasNode(r.personOne)) g.addNode(r.personOne);
      if (!g.hasNode(r.personTwo)) g.addNode(r.personTwo);
    });

    records.forEach(r => {
      if (!g.hasEdge(r.personOne, r.personTwo)) {
        // Louvain uses weight to pull nodes together (higher = stronger connection), so raw score is perfect.
        g.addEdge(r.personOne, r.personTwo, { weight: r.score });
      }
    });

    try {
      const details = louvain.detailed(g, { getEdgeWeight: 'weight' });
      const communities = details.communities;
      
      const clusters: Record<number, string[]> = {};
      Object.entries(communities).forEach(([node, commId]) => {
        if (!clusters[commId]) clusters[commId] = [];
        clusters[commId].push(node);
      });

      // Find leader for each cluster
      const groupsWithLeaders = Object.values(clusters).map(cluster => {
        let leader = cluster[0];
        let maxInternalWeight = -1;

        for (const node of cluster) {
          let internalWeight = 0;
          g.forEachEdge(node, (_edge, attr, source, target) => {
            const neighbor = source === node ? target : source;
            if (cluster.includes(neighbor)) {
              internalWeight += attr.weight;
            }
          });
          
          if (internalWeight > maxInternalWeight) {
            maxInternalWeight = internalWeight;
            leader = node;
          }
        }
        
        return {
          members: cluster,
          leader
        };
      });

      // Sort clusters by size descending
      return groupsWithLeaders.sort((a, b) => b.members.length - a.members.length);
    } catch (e) {
      console.warn('Louvain failed', e);
      return [];
    }
  }, [records]);

  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <div className="p-4 border-b border-green-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-green-400">Groups</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-400 font-bold transition-colors">[ Close ]</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {!groups ? (
          <div className="text-zinc-500 italic">No records to analyze.</div>
        ) : groups.length === 0 ? (
          <div className="text-zinc-500 italic">Not enough structure to detect groups.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group, i) => (
              <div key={i} className="bg-zinc-900 border border-green-900/30 rounded p-4">
                <h3 className="text-green-400 font-bold mb-3 border-b border-green-900/30 pb-2">
                  {i + 1}. {group.leader}'s group <span className="text-zinc-500 text-xs font-normal">({group.members.length} members)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.members.map(name => (
                    <span key={name} className={`px-2 py-1 rounded-sm text-sm border ${name === group.leader ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-zinc-950 border-green-900/50 text-green-500/80'}`}>
                      [ {name} ]
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
