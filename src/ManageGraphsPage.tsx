import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function ManageGraphsPage({ onSelectGraph }: { onSelectGraph: (id: string) => void }) {
  const [graphs, setGraphs] = useState<any[]>([]);
  const [newGraphName, setNewGraphName] = useState('');
  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadGraphs();
    
    // Global presence subscription
    const channel: RealtimeChannel = supabase.channel('global-presence', {
      config: { presence: { key: 'user' } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const counts: Record<string, number> = {};
      
      for (const id in state) {
        state[id].forEach((presence: any) => {
          if (presence.active_graph_id) {
            counts[presence.active_graph_id] = (counts[presence.active_graph_id] || 0) + 1;
          }
        });
      }
      setPresenceCounts(counts);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGraphs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load owned graphs
    const { data } = await supabase
      .from('graphs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setGraphs(data);
  };

  const handleCreate = async () => {
    if (!newGraphName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('graphs').insert({
      name: newGraphName,
      owner_id: user.id
    });
    setNewGraphName('');
    loadGraphs();
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-green-500 font-mono p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-400">Manage Graphs</h1>
      
      <div className="mb-8 flex gap-2">
        <input 
          value={newGraphName}
          onChange={e => setNewGraphName(e.target.value)}
          placeholder="New graph name..."
          className="bg-zinc-900 border border-green-900/50 p-2 rounded text-green-300 outline-none focus:border-green-400 flex-1"
        />
        <button 
          onClick={handleCreate}
          className="bg-green-900/30 text-green-400 px-4 rounded font-bold hover:bg-green-900/50 transition-colors"
        >
          Create
        </button>
      </div>

      <div className="grid gap-4">
        {graphs.map(g => {
          const activeUsers = presenceCounts[g.id] || 0;
          return (
            <div 
              key={g.id} 
              onClick={() => onSelectGraph(g.id)}
              className="bg-zinc-900 border border-green-900/30 p-4 rounded cursor-pointer hover:border-green-500 transition-colors flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-bold text-green-300">{g.name}</h2>
                <div className="text-xs text-zinc-500 mt-1">
                  Nodes: {g.total_nodes} | Connections: {g.total_connections}
                </div>
              </div>
              
              {activeUsers > 0 && (
                <div className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded animate-pulse">
                  {activeUsers} user{activeUsers > 1 ? 's' : ''} active
                </div>
              )}
            </div>
          );
        })}
        {graphs.length === 0 && <div className="text-zinc-600 italic">No graphs found. Create one above.</div>}
      </div>
    </div>
  );
}
