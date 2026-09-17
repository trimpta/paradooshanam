import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Update signature
content = content.replace(
    "export default function App({ graphId, onBack }: { graphId: string, onBack: () => void }) {",
    "export default function App({ graphId, onBack, onEnterOnline }: { graphId?: string, onBack?: () => void, onEnterOnline?: () => void }) {"
)

# Update loadData
old_load = """    async function loadData() {
      if (!graphId) return;"""

new_load = """    async function loadData() {
      if (!graphId) {
        const savedNames = localStorage.getItem('connection-names');
        const savedRecords = localStorage.getItem('connection-records');
        const savedGenders = localStorage.getItem('connection-genders');
        if (savedNames) setNames(JSON.parse(savedNames));
        if (savedRecords) setRecords(JSON.parse(savedRecords));
        if (savedGenders) setGenders(JSON.parse(savedGenders));
        return;
      }"""

content = content.replace(old_load, new_load)

# Wrap real-time in if (graphId)
# We replace from "const channel = supabase.channel" down to "return () => {"
old_realtime = """    // Realtime channel for edits
    const channel = supabase.channel(`graph-${graphId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `graph_id=eq.${graphId}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes', filter: `graph_id=eq.${graphId}` }, () => {
        loadData();
      })
      .subscribe();
      
    // Broadcast presence
    const presenceChannel = supabase.channel('global-presence', {
      config: { presence: { key: 'user' } }
    });
    
    supabase.auth.getUser().then(({ data: { user } }) => {

      if (user) {
        presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: user.id, active_graph_id: graphId });
          }
        });
        
        presenceChannel.on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          let count = 0;
          for (const id in state) {
            state[id].forEach((presence: any) => {
              if (presence.active_graph_id === graphId && presence.user_id !== user.id) {
                count++;
              }
            });
          }
          setActiveUsers(count);
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };"""

new_realtime = """    let channel: any = null;
    let presenceChannel: any = null;

    if (graphId) {
      channel = supabase.channel(`graph-${graphId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `graph_id=eq.${graphId}` }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes', filter: `graph_id=eq.${graphId}` }, () => {
          loadData();
        })
        .subscribe();
        
      presenceChannel = supabase.channel('global-presence', {
        config: { presence: { key: 'user' } }
      });
      
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          presenceChannel.subscribe(async (status: any) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({ user_id: user.id, active_graph_id: graphId });
            }
          });
          
          presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            let count = 0;
            for (const id in state) {
              state[id].forEach((presence: any) => {
                if (presence.active_graph_id === graphId && presence.user_id !== user.id) {
                  count++;
                }
              });
            }
            setActiveUsers(count);
          });
        }
      });
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };"""

content = content.replace(old_realtime, new_realtime)

# Update saveToStorage
old_save = """  const saveToStorage = async (newNames: string[], newRecords: ConnectionRecord[], newGenders: Record<string, Gender>) => {
    setNames(newNames);
    setRecords(newRecords);
    setGenders(newGenders);
    
    // Simple backend sync approach for this prototype:"""

new_save = """  const saveToStorage = async (newNames: string[], newRecords: ConnectionRecord[], newGenders: Record<string, Gender>) => {
    setNames(newNames);
    setRecords(newRecords);
    setGenders(newGenders);
    
    if (!graphId) {
      localStorage.setItem('connection-names', JSON.stringify(newNames));
      localStorage.setItem('connection-records', JSON.stringify(newRecords));
      localStorage.setItem('connection-genders', JSON.stringify(newGenders));
      return;
    }

    // Simple backend sync approach for this prototype:"""

content = content.replace(old_save, new_save)

# Add "Online Mode" button in Menu
old_menu = """              <div 
                onClick={() => { setIsMenuOpen(false); setShowPersonEditor(true); }}
                onPointerEnter={() => setSelectedMenuIdx(1)}
                className={`flex items-center px-6 py-1 font-bold transition-colors cursor-pointer leading-none ${
                  selectedMenuIdx === 1 ? 'bg-green-900/50 text-green-300' : 'text-green-700/50'
                }`}
              >
                <span className="w-8 shrink-0">{selectedMenuIdx === 1 ? <span className="animate-pulse">{'>'}</span> : ''}</span>
                <span className="text-lg tracking-widest uppercase py-1">Person Editor</span>
              </div>
            </div>"""

new_menu = """              <div 
                onClick={() => { setIsMenuOpen(false); setShowPersonEditor(true); }}
                onPointerEnter={() => setSelectedMenuIdx(1)}
                className={`flex items-center px-6 py-1 font-bold transition-colors cursor-pointer leading-none ${
                  selectedMenuIdx === 1 ? 'bg-green-900/50 text-green-300' : 'text-green-700/50'
                }`}
              >
                <span className="w-8 shrink-0">{selectedMenuIdx === 1 ? <span className="animate-pulse">{'>'}</span> : ''}</span>
                <span className="text-lg tracking-widest uppercase py-1">Person Editor</span>
              </div>
              {!graphId && onEnterOnline && (
                <div 
                  onClick={() => { setIsMenuOpen(false); onEnterOnline(); }}
                  onPointerEnter={() => setSelectedMenuIdx(2)}
                  className={`flex items-center px-6 py-1 font-bold transition-colors cursor-pointer leading-none mt-4 ${
                    selectedMenuIdx === 2 ? 'bg-blue-900/50 text-blue-300' : 'text-blue-700/50'
                  }`}
                >
                  <span className="w-8 shrink-0">{selectedMenuIdx === 2 ? <span className="animate-pulse">{'>'}</span> : ''}</span>
                  <span className="text-lg tracking-widest uppercase py-1 text-blue-400 border border-blue-900/50 rounded px-2 bg-blue-900/20">Online Mode</span>
                </div>
              )}
            </div>"""

content = content.replace(old_menu, new_menu)

with open("src/App.tsx", "w") as f:
    f.write(content)
