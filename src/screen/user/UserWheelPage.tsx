import React, { useState, useRef, useEffect } from 'react';
import { Gift, RefreshCw, User, Check, LogOut, Star, Sparkles } from 'lucide-react';
import { Prize } from '../../types/types';
import { isDarkColor, wheelTextColor } from '../../utils/colors';

interface UserWheelPageProps {
  prizes: Prize[];
  onLogout: () => void;
  onSpin: (
    valueAssumed: number,
    customerName?: string,
    customerPhone?: string,
    customerAddress?: string
  ) => Promise<{ prizeId: string }>;
  onAdminLoginClick?: () => void;
  userDisplayName?: string;
  userEmail?: string;
}

export default function UserWheelPage({
  prizes,
  onLogout,
  onSpin,
  userDisplayName = 'عضو مميز',
  userEmail,
}: UserWheelPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinSoundRef = useRef<number | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playClick = (volume: number, pitch: number) => {
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;

      // Loud punchy tick sound
      const bufSize = ctx.sampleRate * 0.05;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 6);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      // Bandpass for clicky peg sound
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = pitch;
      bp.Q.value = 3;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      // Add a tonal click for more presence
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = pitch * 0.5;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(volume * 0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.06);
    } catch (e) { /* ignore */ }
  };

  const startSpinSound = (durationSec: number, segmentCount: number) => {
    const totalClicks = segmentCount * 10;
    let click = 0;
    const schedule = () => {
      if (click >= totalClicks) return;
      const progress = click / totalClicks;
      const ease = progress * progress * progress;
      const interval = 25 + ease * 320;
      const pitch = 3200 + (Math.random() - 0.5) * 800;
      const vol = 0.8 - progress * 0.35;
      playClick(Math.max(vol, 0.15), pitch);
      click++;
      spinSoundRef.current = window.setTimeout(schedule, interval);
    };
    schedule();
  };

  const stopSpinSound = () => {
    if (spinSoundRef.current) {
      clearTimeout(spinSoundRef.current);
      spinSoundRef.current = null;
    }
  };

  const playWinSound = () => {
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;

      // Fanfare: ascending triumphant notes
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = t + i * 0.1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.7);
      });

      // Bright bell tone
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.value = 1568;
      bellGain.gain.setValueAtTime(0.35, t + 0.6);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(t + 0.6);
      bell.stop(t + 2.0);

      // Sparkle shimmer sweep
      const shimmer = ctx.createOscillator();
      const sGain = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(2500, t + 0.7);
      shimmer.frequency.exponentialRampToValueAtTime(5000, t + 1.5);
      sGain.gain.setValueAtTime(0.12, t + 0.7);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      shimmer.connect(sGain);
      sGain.connect(ctx.destination);
      shimmer.start(t + 0.7);
      shimmer.stop(t + 1.5);

      // Victory chord
      [1047, 1319, 1568].forEach(freq => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, t + 0.8);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t + 0.8);
        o.stop(t + 2.2);
      });
    } catch (e) { /* ignore */ }
  };

  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [winningValueAssumed, setWinningValueAssumed] = useState<number>(0);
  const [confetti, setConfetti] = useState<{
    id: number; left: string; color: string; delay: string;
    duration: string; size: string; shape: string;
  }[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPrice, setCustomerPrice] = useState<string>('');
  const [customerError, setCustomerError] = useState('');

  const [spinDuration] = useState(() => {
    const saved = localStorage.getItem('spin_duration');
    return saved ? parseFloat(saved) : 4.5;
  });

  const activePrizes = prizes.filter(p => p.status === 'نشط');

  useEffect(() => { drawWheel(); }, [activePrizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 500;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radius = SIZE / 2 - 10;
    const n = activePrizes.length;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (n === 0) {
      ctx.fillStyle = '#2e2318';
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#d4af37';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد جوائز نشطة', cx, cy);
      return;
    }

    const innerRadius = radius * 0.46;
    const outerRadius = radius - 8;
    const textRadius = (innerRadius + outerRadius) / 2;
    const sliceAngle = (Math.PI * 2) / n;

    // Draw every item as a 4-sided curved square block (مربع)
    activePrizes.forEach((prize, i) => {
      const startA = i * sliceAngle;
      const endA = startA + sliceAngle;
      const midA = startA + sliceAngle / 2;
      const darkSlice = isDarkColor(prize.color);

      // 4-sided curved square block
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, startA, endA, false);
      ctx.arc(cx, cy, innerRadius, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Divider lines between the square blocks
      ctx.beginPath();
      ctx.moveTo(cx + innerRadius * Math.cos(startA), cy + innerRadius * Math.sin(startA));
      ctx.lineTo(cx + outerRadius * Math.cos(startA), cy + outerRadius * Math.sin(startA));
      ctx.strokeStyle = darkSlice ? '#ffd30a' : '#6e4815';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Keep labels inside their square blocks
      ctx.save();
      ctx.translate(cx, cy);
      const normA = ((midA % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const flipLabel = normA > Math.PI * 0.5 && normA < Math.PI * 1.5;
      ctx.rotate(flipLabel ? midA + Math.PI : midA);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxTextWidth = (outerRadius - innerRadius) * 0.90;
      let fontSize = Math.max(14, Math.min(23, Math.floor(185 / n + 3)));
      const setLabelFont = () => {
        ctx.font = `800 ${fontSize}px "Cairo", "Tajawal", "Segoe UI", system-ui, sans-serif`;
      };
      setLabelFont();

      let label = prize.label.trim();
      while (fontSize > 13 && ctx.measureText(label).width > maxTextWidth) {
        fontSize -= 1;
        setLabelFont();
      }
      if (ctx.measureText(label).width > maxTextWidth) {
        const characters = Array.from(label);
        while (characters.length > 1 && ctx.measureText(`${characters.join('')}…`).width > maxTextWidth) {
          characters.pop();
        }
        label = `${characters.join('')}…`;
      }

      ctx.fillStyle = prize.textColor || wheelTextColor(prize.color);
      const labelX = flipLabel ? -textRadius : textRadius;
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 1;
      ctx.fillText(label, labelX, 0);
      ctx.restore();
    });

    // Outer multi-ring gold border framing the top of the squares
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e170c';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffd30a';
    ctx.stroke();

    // Inner multi-ring gold border framing the bottom of the squares
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffd30a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e170c';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // Fill center behind button
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0a06';
    ctx.fill();
  };

  const handleSpinClick = () => {
    if (isSpinning || activePrizes.length === 0) return;
    if (!customerName.trim() || customerName.trim().length < 3) {
      setCustomerError('الرجاء إدخال الاسم الكامل (3 أحرف على الأقل).');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      setCustomerError('الرجاء إدخال رقم هاتف صحيح (6 أرقام على الأقل).');
      return;
    }
    if (!customerPrice.trim() || isNaN(Number(customerPrice)) || Number(customerPrice) < 0) {
      setCustomerError('الرجاء إدخال تكلفة الهدية (رقم صحيح).');
      return;
    }
    setCustomerError('');
    spinTheWheel();
  };

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSpinClick();
  };

  const spinTheWheel = async () => {
    if (isSpinning || activePrizes.length === 0) return;
    setIsSpinning(true);
    let result: { prizeId: string };
    const val = Number(customerPrice);
    try {
      result = await onSpin(val, customerName, customerPhone);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : 'تعذر تدوير العجلة.');
      setIsSpinning(false);
      return;
    }
    const idx = activePrizes.findIndex(p => p.id === result.prizeId);
    if (idx < 0) {
      setCustomerError('تغيرت الجوائز؛ حدّث الصفحة وحاول مجددًا.');
      setIsSpinning(false);
      return;
    }
    const prize = activePrizes[idx];
    startSpinSound(spinDuration, activePrizes.length);
    setWinningPrize(prize);

    const deg = 360 / activePrizes.length;
    const mid = idx * deg + deg / 2;
    const offset = (270 - mid + 360) % 360;
    const spins = 360 * (7 + Math.floor(Math.random() * 5));
    setCurrentRotation(prev => prev + spins + offset - (prev % 360));

    setTimeout(() => {
      stopSpinSound();
      setIsSpinning(false);
      generateConfetti();
      playWinSound();
      setWinningValueAssumed(val);
      setShowWinModal(true);
    }, Math.round(spinDuration * 1000));
  };

  const generateConfetti = () => {
    const colors = ['#d4af37', '#fde8a0', '#c9a84c', '#fff8e7', '#e9c176', '#7c3aed', '#1d4ed8', '#059669'];
    setConfetti(Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      color: colors[i % colors.length],
      delay: `${Math.random() * 2}s`,
      duration: `${2.5 + Math.random() * 3}s`,
      size: `${5 + Math.random() * 10}px`,
      shape: ['circle', 'square', 'diamond'][i % 3],
    })));
  };

  const handleReset = () => {
    if (isSpinning) return;
    setCurrentRotation(0); setShowWinModal(false); setWinningPrize(null);
    setWinningValueAssumed(0); setConfetti([]);
    setCustomerName(''); setCustomerPhone(''); setCustomerPrice('');
  };

  // ─── BG: warm deep amber, visible & readable ───
  const PAGE_BG = 'linear-gradient(150deg, #2c2010 0%, #382810 20%, #2c2010 50%, #241a0a 80%, #1e1608 100%)';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: PAGE_BG,
      color: '#fde8a0',
      fontFamily: '"Hanken Grotesk", "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', overflowX: 'hidden',
      paddingTop: '84px', paddingBottom: '60px',
      userSelect: 'none',
    }}>

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Hanken+Grotesk:wght@400;600;700;800&display=swap');

        @keyframes confetti-fall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh)  rotate(540deg); opacity: 0; }
        }
        @keyframes levitate {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        @keyframes pointer-bob {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%     { transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes ring-out {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0;   }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.85) translateY(40px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes orb-drift {
          0%,100% { transform: translate(0,0); }
          50%     { transform: translate(25px,-18px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes star-twinkle {
          0%,100% { opacity: 0.2; transform: scale(0.6); }
          50%     { opacity: 0.9; transform: scale(1.2); }
        }

        .levitate   { animation: levitate 4.5s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg,#7a5c1a 0%,#c9a84c 20%,#fff8e1 50%,#c9a84c 80%,#7a5c1a 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }
        .pointer-bob { animation: pointer-bob 2s ease-in-out infinite; }
        .ring-out    { animation: ring-out 2s ease-out infinite; }
        .modal-in    { animation: modal-in 0.5s cubic-bezier(0.34,1.25,0.64,1) both; }
        .fade-in-up  { animation: fade-in-up 0.5s ease both; }
        .star-twinkle { animation: star-twinkle ease-in-out infinite; }

        .gold-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,245,220,0.08);
          border: 1.5px solid rgba(212,175,55,0.35);
          border-radius: 12px;
          color: #fff8e1;
          padding: 13px 16px;
          font-size: 14px; font-weight: 600; text-align: right;
          outline: none;
          transition: all 0.25s;
          font-family: "Hanken Grotesk", sans-serif;
          caret-color: #d4af37;
        }
        .gold-input::placeholder { color: rgba(212,175,55,0.4); }
        .gold-input:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.18);
          background: rgba(255,245,220,0.12);
        }
        .nav-action-btn {
          background: rgba(255,245,220,0.08);
          border: 1px solid rgba(212,175,55,0.3);
          border-radius: 10px; color: #e9c176;
          padding: 8px 14px; cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem; font-weight: 700;
          transition: all 0.2s;
          font-family: "Hanken Grotesk", sans-serif;
        }
        .nav-action-btn:hover {
          background: rgba(212,175,55,0.18);
          border-color: #d4af37;
          transform: translateY(-1px);
        }
        .primary-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg,#7a5c1a 0%,#c9a84c 40%,#f0d070 55%,#c9a84c 70%,#7a5c1a 100%);
          background-size: 200% auto;
          border: none; border-radius: 14px;
          color: #1a1208; font-weight: 900; font-size: 1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 6px 30px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.03em;
          font-family: "Playfair Display", serif;
        }
        .primary-btn:hover {
          background-position: right;
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(212,175,55,0.5);
        }
        .primary-btn:active { transform: translateY(0); }

        .prize-badge {
          background: rgba(255,245,220,0.08);
          border: 1px solid rgba(212,175,55,0.25);
          border-radius: 50px;
          padding: 10px 20px;
          font-size: 0.78rem; font-weight: 700;
          color: #e9c176;
          display: flex; align-items: center; gap: 8px;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 16px rgba(0,0,0,0.2);
          letter-spacing: 0.04em;
          transition: all 0.2s;
        }
        .prize-badge:hover {
          background: rgba(212,175,55,0.14);
          border-color: rgba(212,175,55,0.45);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(212,175,55,0.2);
        }
      `}</style>

      {/* ── Background orbs & texture ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {/* Warm amber glow orbs */}
        {[
          { s:500, t:'0%',  l:'-8%',  c:'rgba(212,175,55,0.12)', d:'13s' },
          { s:600, t:'45%', l:'58%',  c:'rgba(180,140,50,0.09)', d:'17s' },
          { s:320, t:'72%', l:'8%',   c:'rgba(212,175,55,0.1)',  d:'10s' },
          { s:260, t:'18%', l:'72%',  c:'rgba(240,200,80,0.08)', d:'8s'  },
        ].map((o,i) => (
          <div key={i} style={{
            position:'absolute', width:o.s, height:o.s, borderRadius:'50%',
            background:`radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
            top:o.t, left:o.l, filter:'blur(55px)',
            animation:`orb-drift ${o.d} ease-in-out infinite`,
            animationDelay:`${i*3}s`,
          }}/>
        ))}

        {/* Subtle dot grid for texture */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'radial-gradient(rgba(212,175,55,0.12) 1px, transparent 1px)',
          backgroundSize:'40px 40px',
          opacity:0.6,
        }}/>

        {/* Stars */}
        {Array.from({length:30}).map((_,i) => (
          <div key={i} className="star-twinkle" style={{
            position:'absolute',
            width: i%6===0?'3px':'2px',
            height: i%6===0?'3px':'2px',
            borderRadius:'50%',
            background: i%3===0?'#fff8e1':'#d4af37',
            left:`${(i*3.1+5)%96}%`,
            top:`${(i*6.7+4)%93}%`,
            animationDuration:`${1.3+(i%5)*0.5}s`,
            animationDelay:`${(i*0.21)%2.5}s`,
          }}/>
        ))}
      </div>

      {/* ── NAV BAR ── */}
      <nav style={{
        position:'fixed', top:0, width:'100%', zIndex:100,
        background:'rgba(40,28,12,0.95)',
        backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(212,175,55,0.25)',
        boxShadow:'0 4px 40px rgba(0,0,0,0.5)',
        height:'72px', display:'flex', alignItems:'center',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'0 28px', maxWidth:'1200px', margin:'0 auto' }} dir="rtl">
          <div>
            <div className="shimmer-text" style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(1.3rem,3vw,1.8rem)', fontWeight:900, letterSpacing:'0.06em' }}>
              Angel Perfum
            </div>
            <div style={{ fontSize:'0.52rem', letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(212,175,55,0.5)', marginTop:'-2px' }}>
              Luxury Gifts &amp; Prizes
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ textAlign:'right', lineHeight:1.4 }}>
              <div style={{ fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', color:'rgba(212,175,55,0.5)', letterSpacing:'0.1em' }}>
                {(userEmail === 'sbeihmorad07@gmail.com' || userEmail === 'kafehazyad5@gmail.com') ? 'MANAGER' : 'الموظف'}
              </div>
              <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#fde8a0' }}>{userDisplayName}</div>
            </div>
            <div style={{ width:'1px', height:'32px', background:'rgba(212,175,55,0.2)' }}/>
            <button className="nav-action-btn" onClick={handleReset}><RefreshCw size={14}/><span>ضبط</span></button>
            <button className="nav-action-btn" onClick={onLogout} style={{ padding:'8px 10px' }}><LogOut size={16}/></button>
          </div>
        </div>
      </nav>

      {/* ── Confetti ── */}
      {confetti.length > 0 && (
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:90, overflow:'hidden' }}>
          {confetti.map(c => (
            <div key={c.id} style={{
              position:'absolute', top:'-30px', left:c.left,
              width:c.size, height:c.size,
              background:c.color,
              borderRadius: c.shape==='circle'?'50%':c.shape==='diamond'?'0':'2px',
              transform: c.shape==='diamond'?'rotate(45deg)':undefined,
              animation:`confetti-fall ${c.duration} ${c.delay} linear forwards`,
              opacity:0,
            } as React.CSSProperties}/>
          ))}
        </div>
      )}

      {/* ── PAGE CONTENT ── */}
      <div style={{ zIndex:10, width:'100%', maxWidth:'960px', display:'flex', flexDirection:'column', alignItems:'center', gap:'32px', padding:'0 20px' }}>

        {/* Heading */}
        <div className="fade-in-up" style={{ textAlign:'center', width:'100%', maxWidth:'600px' }}>
          {/* Title matching reference screenshot */}
          <div style={{ margin: '6px 0 10px', textAlign: 'center', width: '100%', padding: '0 10px' }}>
            <h1 className="shimmer-text" style={{ fontFamily:'"Cairo", "Playfair Display", serif', fontSize:'clamp(2rem, 5.8vw, 2.8rem)', fontWeight:900, letterSpacing:'0.02em', lineHeight:1.3, margin:0, textShadow:'0 2px 20px rgba(212,175,55,0.45)' }} dir="rtl">
              عجلة الهدايا
            </h1>
            <p style={{ margin:'4px 0 0', fontSize:'clamp(0.85rem, 2.5vw, 1.05rem)', fontWeight:700, color:'#f5d37a', letterSpacing:'0.12em', fontFamily:'"Playfair Display", serif' }}>
              Angel Perfum
            </p>
          </div>
          
          <div style={{ height:'1.5px', width:'140px', background:'linear-gradient(90deg,transparent,#d4af37,transparent)', margin:'10px auto 14px', borderRadius:'2px' }}/>
          
          <h2 style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:'"Hanken Grotesk", "Segoe UI", sans-serif', fontSize:'clamp(1rem, 3.6vw, 1.3rem)', fontWeight:800, color:'#fde8a0', margin:0, letterSpacing:'0.02em', textShadow:'0 2px 10px rgba(0,0,0,0.5)' }}>
            <span>دور واربح هديتك</span>
            <span>🎁</span>
          </h2>
        </div>

        {/* ── WHEEL ── */}
        <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', direction:'ltr' }}>

          {/* Top golden horizon aura bar behind pointer */}
          <div style={{ position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', width:'220px', height:'28px', background:'radial-gradient(ellipse at center, rgba(255,211,10,0.4) 0%, rgba(212,175,55,0.18) 45%, transparent 75%)', pointerEvents:'none', zIndex:35 }}/>

          {/* SVG Pointer - Static at the top */}
          <div ref={pointerRef} style={{ position:'absolute', top:'-22px', left:'50%', transform:'translateX(-50%)', zIndex:40, filter:'drop-shadow(0 0 14px rgba(255,211,10,0.95))' }}>
            <svg width="42" height="44" viewBox="0 0 42 44" fill="none" aria-hidden="true">
              <polygon points="21,44 1,2 41,2" fill="url(#pointerGoldGrad)" stroke="#8E650A" strokeWidth="2"/>
              <defs>
                <linearGradient id="pointerGoldGrad" x1="21" y1="2" x2="21" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFF2A8"/>
                  <stop offset="0.4" stopColor="#FFD30A"/>
                  <stop offset="1" stopColor="#D4A116"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Outer glow rings */}
          <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>

            {/* Conic gold border frame */}
            <div style={{ borderRadius:'50%', padding:'4px', background:'conic-gradient(from 0deg,#9d7114,#f7d943,#b48716,#ffdf53,#9d7114)', boxShadow:'0 0 40px rgba(245,195,29,0.45), 0 0 90px rgba(212,175,55,0.14)' }}>

              {/* Dark bezel */}
              <div style={{ borderRadius:'50%', padding:'0px', background:'transparent' }}>

                {/* Wheel wrapper: Strictly 1:1 circular aspect ratio locked to prevent oval distortion */}
                <div
                  className=""
                  style={{
                    width:'min(82vw, 440px)',
                    height:'min(82vw, 440px)',
                    aspectRatio:'1 / 1',
                    borderRadius:'50%',
                    overflow:'hidden',
                    position:'relative',
                    direction:'ltr',
                    flexShrink:0,
                    boxShadow:'inset 0 0 50px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Canvas - Rotating Wheel */}
                  <div style={{
                    width:'100%', height:'100%',
                    transform:`rotate(${currentRotation}deg)`,
                    transition: isSpinning?`transform ${spinDuration}s cubic-bezier(0.12,0,0.08,1)`:'none',
                  }}>
                    <canvas ref={canvasRef} width={500} height={500} style={{ width:'100%', height:'100%', display:'block' }}/>
                  </div>

                  {/* Glass shine */}
                  <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.06) 0%, transparent 55%)', pointerEvents:'none' }}/>

                  {/* Center Spin Button Overlay: flex centered across inset 0 to guarantee dead-center alignment & perfect circular 1:1 shape */}
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:50 }}>
                    <button
                      type="button"
                      aria-label="اسحب عجلة الجوائز"
                      onClick={handleSpinClick}
                      disabled={isSpinning}
                      style={{
                        pointerEvents:'auto',
                        width:'44%',
                        height:'44%',
                        aspectRatio:'1 / 1',
                        borderRadius:'50%',
                        flexShrink:0,
                        boxSizing:'border-box',
                        background:'radial-gradient(circle at 40% 30%, #221a11 0%, #0d0a06 65%, #050403 100%)',
                        border:'3px solid #d4af37',
                        boxShadow:'0 0 0 2px #181208, 0 0 0 4.5px #ffd30a, 0 12px 30px rgba(0,0,0,0.7), inset 0 0 14px rgba(0,0,0,0.85)',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        color:'#f5d37a', fontWeight:800, cursor: isSpinning ? 'not-allowed' : 'pointer',
                        padding:'4px', opacity: isSpinning ? 0.8 : 1, transition:'all 0.25s',
                        fontFamily:'"Playfair Display", "Segoe UI", sans-serif'
                      }}
                      onMouseOver={(e) => { if(!isSpinning) e.currentTarget.style.transform = 'scale(1.04)'; }}
                      onMouseOut={(e) => { if(!isSpinning) e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {/* Luxury Monogram Emblem */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginBottom:'2px', filter:'drop-shadow(0 0 5px rgba(255,211,10,0.7))' }}>
                        <rect x="9" y="2" width="6" height="3" rx="1" fill="#FFD30A" stroke="#B48716" strokeWidth="0.8"/>
                        <rect x="10.5" y="5" width="3" height="2" fill="#FFE259"/>
                        <path d="M6 7.5C6 7 6.6 6.5 7.5 6.5H16.5C17.4 6.5 18 7 18 7.5L19 19C19 20.5 18 21.5 16.5 21.5H7.5C6 21.5 5 20.5 5 19L6 7.5Z" fill="url(#hubPerfumeGrad)" stroke="#FFD30A" strokeWidth="1"/>
                        <circle cx="12" cy="14" r="2.5" fill="#1C150A" stroke="#FFD30A" strokeWidth="0.8"/>
                        <path d="M12 12.5V15.5M10.5 14H13.5" stroke="#FFD30A" strokeWidth="0.8" strokeLinecap="round"/>
                        <defs>
                          <linearGradient id="hubPerfumeGrad" x1="12" y1="6.5" x2="12" y2="21.5" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FFF2A8"/>
                            <stop offset="0.45" stopColor="#FFD30A"/>
                            <stop offset="1" stopColor="#B48716"/>
                          </linearGradient>
                        </defs>
                      </svg>
                      <span style={{ fontSize:'clamp(12px, 3.5vw, 17px)', lineHeight:1.15, letterSpacing:'0.14em', fontWeight:900 }}>ANGEL</span>
                      <span style={{ fontSize:'clamp(9px, 2.5vw, 12px)', lineHeight:1.15, letterSpacing:'0.24em', opacity:0.95, color:'#f0ce4d' }}>PERFUM</span>
                      <span style={{ fontFamily:'"Cairo", "Tajawal", "Segoe UI", sans-serif', fontSize:'clamp(7.5px, 2vw, 10px)', lineHeight:1.1, marginTop:'3px', color:'rgba(245,211,122,0.85)', fontWeight:600 }}>اضغط للسحب</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status text */}
          <div style={{ marginTop:'22px', textAlign:'center', minHeight:'30px' }}>
            {isSpinning
              ? <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center' }}>
                  <Sparkles size={15} style={{ color:'#d4af37' }}/>
                  <span style={{ color:'#fde8a0', fontSize:'0.95rem', fontWeight:700, letterSpacing:'0.06em' }}>جاري السحب…</span>
                  <Sparkles size={15} style={{ color:'#d4af37' }}/>
                </div>
              : <span style={{ color:'rgba(212,175,55,0.65)', fontSize:'0.82rem', fontWeight:600 }}>
                  أدخل بيانات العميل واضغط على زر السحب 🎰
                </span>
            }
          </div>
        </div>

        {/* Prize badges */}
        <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap', width:'100%', maxWidth:'560px' }}>
          {[{i:'🎁',t:'جوائز حصرية'},{i:'✨',t:'هدايا فاخرة'},{i:'🏆',t:'مفاجآت مميزة'},{i:'💫',t:'سحب فوري'}].map((b,i) => (
            <div key={i} className="prize-badge"><span>{b.i}</span><span>{b.t}</span></div>
          ))}
        </div>

        {/* ── INLINE CUSTOMER FORM ── */}
        <div style={{ width:'100%', maxWidth:'620px' }} dir="rtl">

          {/* Section header */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap' }}>
              <User size={15} style={{ color:'#d4af37' }}/>
              <span style={{ fontSize:'0.78rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'#d4af37' }}>بيانات العميل</span>
            </div>
            <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }}/>
          </div>

          {/* Form card */}
          <div style={{
            background:'rgba(255,245,220,0.05)',
            border:'1px solid rgba(212,175,55,0.25)',
            borderRadius:'20px',
            padding:'clamp(20px,4vw,32px)',
            backdropFilter:'blur(10px)',
            boxShadow:'0 8px 40px rgba(0,0,0,0.3)',
            position:'relative',
            overflow:'hidden',
          }}>
            {/* Top accent line */}
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'120px', height:'2px', background:'linear-gradient(90deg,transparent,#d4af37,transparent)' }}/>

            <form onSubmit={handleCustomerFormSubmit}>
              {/* 3-column grid on desktop, stacked on mobile */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'16px', marginBottom:'16px' }}>

                {/* Name */}
                <div>
                  <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.71rem', fontWeight:700, color:'rgba(212,175,55,0.75)', marginBottom:'8px', letterSpacing:'0.05em' }}>
                    <span>👤</span> اسم العميل *
                  </label>
                  <input
                    className="gold-input"
                    type="text"
                    placeholder="مثال: محمد علي"
                    value={customerName}
                    onChange={e => { setCustomerName(e.target.value); setCustomerError(''); }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.71rem', fontWeight:700, color:'rgba(212,175,55,0.75)', marginBottom:'8px', letterSpacing:'0.05em' }}>
                    <span>📞</span> رقم الهاتف *
                  </label>
                  <input
                    className="gold-input"
                    type="tel"
                    placeholder="مثال: 07XXXXXXXX"
                    value={customerPhone}
                    onChange={e => { setCustomerPhone(e.target.value); setCustomerError(''); }}
                  />
                </div>


                {/* Price */}
                <div>
                  <label style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.71rem', fontWeight:700, color:'rgba(212,175,55,0.75)', marginBottom:'8px', letterSpacing:'0.05em' }}>
                    <span>💰</span> التكلفة *
                  </label>
                  <div style={{ position:'relative' }}>
                    <input
                      className="gold-input"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="مثال: 25"
                      value={customerPrice}
                      onChange={e => { setCustomerPrice(e.target.value); setCustomerError(''); }}
                      style={{ paddingLeft: '48px' }}
                    />
                    <span style={{
                      position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                      fontSize:'0.7rem', fontWeight:800, color:'rgba(212,175,55,0.6)',
                      pointerEvents:'none', letterSpacing:'0.04em',
                    }}>JD</span>
                  </div>
                </div>

              </div>

              {/* Error */}
              {customerError && (
                <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'11px 16px', fontSize:'0.79rem', color:'#fca5a5', fontWeight:700, marginBottom:'14px' }}>
                  ⚠️ {customerError}
                </div>
              )}



            </form>
          </div>
        </div>

      </div>

      {/* ── WIN MODAL ── */}
      {showWinModal && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.3)', padding:'20px', paddingBottom:'8vh' }}>
          <div className="modal-in" style={{
            background:'#1f160a',
            border:'1px solid rgba(212,175,55,0.35)',
            borderRadius:'24px', padding:'clamp(24px,5vw,40px)',
            maxWidth:'440px', width:'100%', textAlign:'center',
            boxShadow:'0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.1)',
            position:'relative', overflow:'hidden',
          }} dir="rtl">

            {/* Top gold glowing edge */}
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'60%', height:'2px', background:'linear-gradient(90deg,transparent,#d4af37,transparent)', borderRadius:'2px', boxShadow:'0 2px 15px #d4af37' }}/>
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', height:'80px', background:'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)', pointerEvents:'none' }}/>

            <div className="shimmer-text" style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.25rem', fontWeight:900, letterSpacing:'0.06em', marginBottom:'24px' }}>
              Angel Perfum
            </div>

            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(1.1rem,4vw,1.4rem)', fontWeight:900, color:'#fff8e1', margin:'0 0 16px' }}>
              تهانينا! فزت بـ 🎉
            </h2>

            {/* Clean prize name box */}
            <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(212,175,55,0.5)', borderRadius:'12px', padding:'16px', margin:'0 0 24px 0', fontFamily:'"Playfair Display",serif', fontSize:'clamp(1.2rem,4vw,1.6rem)', fontWeight:900, color:'#ffffff' }}>
              {winningPrize?.label}
            </div>



            <button className="primary-btn" onClick={() => setShowWinModal(false)}>
              <Check size={18}/> تأكيد واستلام الجائزة
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={{ marginTop:'50px', textAlign:'center', zIndex:10, paddingTop:'22px', width:'100%', maxWidth:'600px', borderTop:'1px solid rgba(212,175,55,0.15)' }}>
        <div className="shimmer-text" style={{ fontFamily:'"Playfair Display",serif', fontSize:'1.05rem', fontWeight:900, letterSpacing:'0.09em', marginBottom:'5px' }}>
          Angel Perfum
        </div>
        <div style={{ fontSize:'0.63rem', color:'rgba(212,175,55,0.4)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
          © 2026 — Luxury Fragrance &amp; Exclusive Gifts
        </div>
      </footer>

    </div>
  );
}
