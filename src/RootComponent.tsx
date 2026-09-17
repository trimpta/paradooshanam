import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { ManageGraphsPage } from './ManageGraphsPage';
import App from './App';

export default function RootComponent() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await supabase.auth.signUp({ email, password });
      alert('Check your email for the login link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  if (loading) {
    return <div className="bg-zinc-950 min-h-screen text-green-500 font-mono p-6 flex items-center justify-center">Loading...</div>;
  }

  if (!isOnlineMode) {
    return <App onEnterOnline={() => setIsOnlineMode(true)} />;
  }

  if (!session) {
    return (
      <div className="bg-zinc-950 min-h-screen text-green-500 font-mono flex items-center justify-center p-6 flex-col">
        <button onClick={() => setIsOnlineMode(false)} className="absolute top-6 left-6 text-zinc-500 hover:text-green-400 font-bold transition-colors">
          [ &larr; Back to Local Mode ]
        </button>
        <form onSubmit={handleAuth} className="bg-zinc-900 p-8 rounded border border-green-900/50 flex flex-col gap-4 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-green-400 mb-4">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="bg-zinc-950 border border-green-900/30 p-2 rounded text-green-300 outline-none focus:border-green-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-zinc-950 border border-green-900/30 p-2 rounded text-green-300 outline-none focus:border-green-400"
          />
          <button type="submit" className="bg-green-900/50 text-green-400 font-bold p-2 rounded hover:bg-green-800/50 transition-colors">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
          <div className="text-center text-sm text-zinc-500 mt-2 cursor-pointer hover:text-green-400" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </div>
        </form>
      </div>
    );
  }

  if (activeGraphId) {
    return <App graphId={activeGraphId} onBack={() => setActiveGraphId(null)} />;
  }

  return <ManageGraphsPage onSelectGraph={setActiveGraphId} onBackToLocal={() => setIsOnlineMode(false)} />;
}
