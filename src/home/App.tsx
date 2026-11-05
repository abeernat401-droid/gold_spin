import { useCallback, useEffect, useState } from 'react';
import SplashScreen from '../components/SplashScreen';
import type { Prize, AccessRequest, WinRecord } from '../types/types';
import AuthPage from '../screen/auth/AuthPage';
import UserWheelPage from '../screen/user/UserWheelPage';
import AdminPortal from '../screen/admin/AdminPortal';
import { api, json, type AppState, type SessionUser } from '../services/api';

const defaultPrizes: Prize[] = [{ id: '1', label: 'item', probability: 100, color: '#F4EBD0', textColor: '#775a19', status: 'نشط' }];

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (sessionStorage.getItem('splash_shown')) return false;
    sessionStorage.setItem('splash_shown', 'true');
    return true;
  });
  const [user, setUser] = useState<SessionUser | null>(null);
  const [view, setView] = useState<'visitor' | 'admin' | 'user'>('visitor');
  const [prizes, setPrizes] = useState<Prize[]>(defaultPrizes);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [wins, setWins] = useState<WinRecord[]>([]);
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const state = await api<AppState>('/state');
    setUser(state.user);
    setPrizes(state.prizes);
    setAccessRequests(state.accessRequests);
    setWins(state.wins);
    setTotalDistributed(state.totalDistributed);
    setView(previous => previous === 'visitor' ? state.user.role : previous);
    setError('');
  }, []);

  useEffect(() => {
    api<{ user: SessionUser | null }>('/session').then(async ({ user }) => {
      setUser(user);
      if (user) await refresh();
    }).catch(err => setError(err.message));
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => refresh().catch(err => setError(err.message)), 5000);
    return () => window.clearInterval(timer);
  }, [user?.email, refresh]);

  const mutate = async (route: string, method: string, body?: unknown) => {
    try { await api(route, json(method, body)); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ التغيير.'); }
  };
  const login = async (nextUser: SessionUser) => {
    setUser(nextUser);
    setView(nextUser.role);
    await refresh();
  };
  const logout = async () => {
    try { await api('/auth/logout', json('POST')); }
    finally { setUser(null); setView('visitor'); setWins([]); setAccessRequests([]); setPrizes(defaultPrizes); }
  };
  return (
    <div className="min-h-screen flex flex-col relative select-none" style={{ background: '#2c2010' }}>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {error && <div role="alert" className="fixed top-2 left-2 right-2 z-[100] bg-red-100 text-red-800 rounded-lg p-3 text-center" onClick={() => setError('')}>{error}</div>}
      <div className="flex-grow flex items-center justify-center">
        {view === 'visitor' && <AuthPage onLoginSuccess={login} />}
        {view === 'user' && <UserWheelPage
          prizes={prizes}
          onLogout={logout}
          onSpin={async (valueAssumed, customerName, customerPhone, customerAddress) => {
            const result = await api<{ prizeId: string }>('/spin', json('POST', { valueAssumed, customerName, customerPhone, customerAddress }));
            void refresh().catch(err => setError(err.message));
            return result;
          }}
          userDisplayName={user?.displayName}
          userEmail={user?.email}
        />}
        {view === 'admin' && <AdminPortal
          prizes={prizes}
          accessRequests={accessRequests}
          onAddPrize={prize => { void mutate('/prizes', 'POST', prize); }}
          onEditPrize={(id, fields) => { void mutate(`/prizes/${encodeURIComponent(id)}`, 'PATCH', fields); }}
          onDeletePrize={id => { void mutate(`/prizes/${encodeURIComponent(id)}`, 'DELETE'); }}
          onLogout={logout}
          onGoToWheel={() => setView('user')}
          totalStats={{ totalDistributed }}
          wins={wins}
          onDeleteWin={(id) => { void mutate(`/wins/${encodeURIComponent(id)}`, 'DELETE'); }}
        />}
      </div>
    </div>
  );
}
