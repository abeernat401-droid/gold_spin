import { useState, type FormEvent } from 'react';
import { Gift, Headphones, X } from 'lucide-react';
import { api, json, type SessionUser } from '../../services/api';

interface Props {
  onLoginSuccess: (user: SessionUser) => void | Promise<void>;
}

export default function AuthPage({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      const result = await api<{ user: SessionUser }>('/auth/login', json('POST', { email, password }));
      setPassword('');
      await onLoginSuccess(result.user);
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.'); }
    finally { setBusy(false); }
  };

  return <div className="w-full flex items-center justify-center min-h-[75vh] px-3 py-8" dir="rtl">
    <div className="w-full max-w-md bg-white luxury-shadow rounded-2xl border border-[#d1c5b4]/40 p-6 sm:p-10 text-center">
      <div className="flex flex-col items-center mb-7">
        <div className="p-4 rounded-full bg-[#775a19]/10 border border-[#775a19]/30 mb-4"><Gift className="text-[#775a19] w-11 h-11" /></div>
        <h1 className="font-serif text-3xl font-black text-[#775a19]" dir="ltr">Angel Perfum</h1>
        <p className="text-xs tracking-[0.3em] text-[#775a19]/60 mt-1" dir="ltr">LUXURY FRAGRANCE</p>
      </div>
      <form onSubmit={submit} className="space-y-4 text-right">
        <label className="block text-sm font-semibold text-[#4e4639]">البريد الإلكتروني<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg p-3 outline-[#775a19]" /></label>
        <label className="block text-sm font-semibold text-[#4e4639]">كلمة المرور<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border rounded-lg p-3 outline-[#775a19]" /></label>
        {error && <p role="alert" className="bg-red-50 text-red-800 text-sm p-3 rounded-lg">{error}</p>}
        <button disabled={busy} className="w-full py-3.5 bg-gradient-to-r from-[#775a19] to-[#c5a059] text-white rounded-xl font-bold disabled:opacity-50">{busy ? 'يرجى الانتظار...' : 'تسجيل الدخول'}</button>
      </form>
      <footer className="mt-7 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span dir="ltr">© 2026 angel perfum Concierge</span>
        <button onClick={() => setSupportOpen(true)} className="flex items-center gap-1 hover:text-[#775a19]"><Headphones size={14} /> الدعم والمساعدة</button>
      </footer>
    </div>
    {supportOpen && <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setSupportOpen(false)}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-right space-y-4" onClick={event => event.stopPropagation()}>
        <div className="flex justify-between items-center"><h2 className="font-bold text-lg text-[#775a19]">الدعم والمساعدة</h2><button onClick={() => setSupportOpen(false)} aria-label="إغلاق"><X /></button></div>
        <p className="text-sm text-gray-600">للمساعدة في تسجيل الدخول، تواصل معنا:</p>
        <a className="block text-[#775a19] font-bold" href="tel:0777744189">0777744189</a>
        <a className="block text-[#775a19] font-bold" href="tel:0780090698">0780090698</a>
      </div>
    </div>}
  </div>;
}
