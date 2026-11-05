import React, { useState } from 'react';
import { 
  PlusCircle, Edit2, Trash2, TrendingUp, Award, Users, 
  Settings as SettingsIcon, LogOut, FileText, ChevronLeft, 
  ChevronRight, Check, X, Shield, RefreshCw, BarChart3,
  MessageSquare, Copy, Menu
} from 'lucide-react';
import { Prize, AccessRequest, WinRecord } from '../../types/types';
import { readableTextColor } from '../../utils/colors';

const sectorColors = [
  { name: 'أصفر ذهبي', hex: '#E7B92B' },
  { name: 'برتقالي دافئ', hex: '#D98A2B' },
  { name: 'ذهبي فاتح', hex: '#E5C368' },
  { name: 'نحاسي', hex: '#C56B36' },
  { name: 'عاجي ذهبي', hex: '#F1D58A' },
  { name: 'برونزي', hex: '#AD713D' },
  { name: 'رملي', hex: '#DDBB73' },
  { name: 'برتقالي محروق', hex: '#CE792E' },
] as const;

interface AdminPortalProps {
  prizes: Prize[];
  accessRequests: AccessRequest[];
  onAddPrize: (prize: Prize) => void;
  onEditPrize: (id: string, updated: Partial<Prize>) => void;
  onDeletePrize: (id: string) => void;
  onLogout: () => void;
  totalStats: { totalDistributed: number };
  wins: WinRecord[];
  onDeleteWin: (id: string, valueAssumed: number) => void;
  onGoToWheel?: () => void;
}

export default function AdminPortal({
  prizes,
  accessRequests,
  onAddPrize,
  onEditPrize,
  onDeletePrize,
  onLogout,
  totalStats,
  wins = [],
  onDeleteWin,
  onGoToWheel
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'prizes' | 'dashboard' | 'access' | 'settings'>('prizes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteWinId, setDeleteWinId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  
  const [prizeLabel, setPrizeLabel] = useState('');
  const [prizeProb, setPrizeProb] = useState(10);
  const [prizeColor, setPrizeColor] = useState('#ffffff');
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [prizeTextCol, setPrizeTextCol] = useState('#775a19');
  const [prizeStatus, setPrizeStatus] = useState<'نشط' | 'غير نشط'>('نشط');
  const [prizeCost, setPrizeCost] = useState<number>(100);

  const [msgTemplate, setMsgTemplate] = useState<string>(
    'مرحباً {customer_name}! مبروك فوزك بـ {prize_name} بقيمة {prize_value}$ في سحب angel perfum! تفاصيل جائزتك جاهزة للاستلام لدى الفرع.'
  );
  const [successSentMsg, setSuccessSentMsg] = useState<string | null>(null);

  const [reportSuccessMsg, setReportSuccessMsg] = useState('');

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('sound_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [spinDuration, setSpinDuration] = useState(() => {
    const saved = localStorage.getItem('spin_duration');
    return saved ? parseFloat(saved) : 4.1;
  });
  const [autoApprove, setAutoApprove] = useState(() => {
    const saved = localStorage.getItem('auto_approve');
    return saved === 'true';
  });

  const openAddModal = () => {
    setEditingPrize(null);
    setPrizeLabel('');
    setPrizeProb(10);
    setPrizeColor(sectorColors[0].hex);
    setIsCustomColor(false);
    setPrizeTextCol(readableTextColor(sectorColors[0].hex));
    setPrizeStatus('نشط');
    setPrizeCost(100);
    setIsModalOpen(true);
  };

  const openEditModal = (prize: Prize) => {
    setEditingPrize(prize);
    setPrizeLabel(prize.label);
    setPrizeProb(prize.probability);
    setPrizeColor(prize.color);
    setIsCustomColor(!sectorColors.some(color => color.hex.toLowerCase() === prize.color.toLowerCase()));
    setPrizeTextCol(prize.textColor);
    setPrizeStatus(prize.status);
    setPrizeCost(prize.cost ?? 0);
    setIsModalOpen(true);
  };

  const handlePrizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeLabel) return;

    if (editingPrize) {
      onEditPrize(editingPrize.id, {
        label: prizeLabel,
        probability: Number(prizeProb),
        color: prizeColor,
        textColor: prizeTextCol,
        status: prizeStatus,
        cost: Number(prizeCost)
      });
    } else {
      onAddPrize({
        id: Math.random().toString(36).substring(2, 9),
        label: prizeLabel,
        probability: Number(prizeProb),
        color: prizeColor,
        textColor: prizeTextCol,
        status: prizeStatus,
        cost: Number(prizeCost)
      });
    }
    setIsModalOpen(false);
  };

  const selectSectorColor = (color: string, custom = false) => {
    setPrizeColor(color);
    setIsCustomColor(custom);
    setPrizeTextCol(readableTextColor(color));
  };

  const handleGenerateReport = () => {
    setReportSuccessMsg('تم توليد التقرير السنوي الشامل بنجاح لحساب angel perfum.');
    setTimeout(() => {
      setReportSuccessMsg('');
    }, 4000);
  };

  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);

  return (
    <div className="flex min-h-screen w-full bg-[#f9f9f9] text-[#1a1c1c] text-right font-sans">
      
      {/* Backdrop overlay for mobile screens */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-[#4e4639]/30 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* 1. Sidebar - Fixed on the right (`right-0`) since this is RTL Arabic layout */}
      <aside className={`w-68 fixed right-0 top-0 h-full bg-white border-l border-[#d1c5b4]/80 shadow-md flex flex-col justify-between p-5 z-40 transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } lg:translate-x-0`}>
        
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="px-2 pb-2 flex items-center justify-between lg:block">
            <div className="text-right">
              <h1 className="font-serif text-3xl font-bold text-[#775a19] tracking-tight">angel perfum</h1>
              <p className="text-[10px] font-sans text-[#4e4639] tracking-wider opacity-70 font-semibold uppercase select-none">Admin Portal</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-[#775a19]/10 rounded-lg lg:hidden text-gray-400 hover:text-[#775a19] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {/* Dashboard Link */}
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-end gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#e8dfc5] text-[#68634d]'
                  : 'text-[#4e4639] hover:bg-[#f3f3f4] hover:text-[#775a19]'
              }`}
            >
              <span>لوحة التحليلات</span>
              <Award className="w-4.5 h-4.5" />
            </button>

            {/* Prize Pool Link */}
            <button
              onClick={() => {
                setActiveTab('prizes');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-end gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'prizes'
                  ? 'bg-[#e8dfc5] text-[#68634d]'
                  : 'text-[#4e4639] hover:bg-[#f3f3f4] hover:text-[#775a19]'
              }`}
            >
              <span>إدارة الجوائز</span>
              <FileText className="w-4.5 h-4.5" />
            </button>

            {/* User Access Requests */}
            <button
              onClick={() => {
                setActiveTab('access');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-end gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer relative ${
                activeTab === 'access'
                  ? 'bg-[#e8dfc5] text-[#68634d]'
                  : 'text-[#4e4639] hover:bg-[#f3f3f4] hover:text-[#775a19]'
              }`}
            >
              {accessRequests.filter(r => r.status === 'قيد الانتظار').length > 0 && (
                <span className="absolute left-2.5 top-2.5 bg-red-600 text-white font-sans text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                  {accessRequests.filter(r => r.status === 'قيد الانتظار').length}
                </span>
              )}
              <span>سجل الطلبات السابق</span>
              <Users className="w-4.5 h-4.5" />
            </button>

            {/* Settings Link */}
            <button
              onClick={() => {
                setActiveTab('settings');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-end gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#e8dfc5] text-[#68634d]'
                  : 'text-[#4e4639] hover:bg-[#f3f3f4] hover:text-[#775a19]'
              }`}
            >
              <span>الإعدادات</span>
              <SettingsIcon className="w-4.5 h-4.5" />
            </button>

            {/* Go to Wheel Link */}
            {onGoToWheel && (
              <button
                onClick={onGoToWheel}
                className="w-full mt-4 flex items-center justify-end gap-3 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              >
                <span>فتح عجلة الحظ</span>
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
            )}
          </nav>
        </div>

        {/* User Card & Action Footer inside Sidebar */}
        <div className="pt-4 border-t border-[#d1c5b4]/80 space-y-4">
          <div className="flex items-center justify-end gap-3 px-2">
            <div>
              <p className="text-xs font-bold text-[#1a1c1c]">مسؤول النظام</p>
              <p className="text-[10px] text-[#4e4639] font-medium opacity-70">إدارة angel perfum</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#c5a059] flex items-center justify-center text-white font-serif text-base font-bold">A</div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <span>تسجيل الخروج</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </aside>

      {/* 2. Main Content Container - Padded on the right to clear Sidebar */}
      <main className="flex-grow mr-0 lg:mr-68 min-h-screen bg-[#f9f9f9] p-6 md:p-14 select-none pb-24">
        
        {/* Mobile top navigation/header bar */}
        <div className="flex lg:hidden items-center justify-between pb-4 mb-6 border-b border-[#F4EBD0]/55 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#c5a059] flex items-center justify-center text-white font-serif text-sm font-bold animate-pulse">A</div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#1a1c1c]">لوحة التحكم</p>
              <p className="text-[9px] text-[#4e4639] font-medium">مسؤول النظام</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f3f3f4] border border-[#d1c5b4]/85 text-[#775a19] text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <span>القائمة</span>
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 border-b border-[#F4EBD0]/55 pb-6">
          <div className="space-y-1">
            <h2 className="font-serif text-3xl md:text-4xl text-[#775a19] font-bold">إدارة دولاب الحظ</h2>
            <p className="font-sans text-xs md:text-sm text-[#4e4639] font-medium leading-relaxed">
              تخصيص الجوائز ونسب الربح وتصميم ألوان قطاعات عجلة الحظ
            </p>
          </div>

          <div className="flex gap-2">
            {onGoToWheel && (
              <button
                onClick={onGoToWheel}
                className="bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200 text-xs font-bold px-5 py-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <span>فتح العجلة الآن</span>
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            {activeTab === 'prizes' && (
              <button
                onClick={openAddModal}
                className="gold-gradient text-white text-xs font-bold px-5 py-3 rounded-lg flex items-center gap-2 cursor-pointer btn-hover-effect"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة جائزة جديدة</span>
              </button>
            )}
          </div>
        </header>

        {reportSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-3 rounded-lg mb-6 leading-relaxed flex items-center justify-end gap-2 animate-fadeIn">
            <span>{reportSuccessMsg}</span>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        {/* Display System warnings if total probability ≠ 100% */}
        {activeTab === 'prizes' && Math.abs(totalProbability - 100) > 0.01 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs px-4 py-3 rounded-lg mb-6 leading-relaxed text-right flex items-center justify-end gap-2">
            <div>
              <p className="font-bold">تنبيه احتمالية دولاب الحظ</p>
              <p className="opacity-90">مجموع نسب الفوز الحالية تساوي {totalProbability}% . يفضل دائماً جعل المجموع 100% لضمان توازن العجلة.</p>
            </div>
            <Shield className="w-6 h-6 text-amber-600 shrink-0" />
          </div>
        )}

        {/* 3. Screen Views based on Navigation State */}
        
        {/* A. PRIZES MANAGEMENT TAB */}
        {activeTab === 'prizes' && (
          <div className="gold-border bg-white rounded-xl overflow-hidden shadow-sm animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#f3f3f4] border-b border-[#d1c5b4]/80 text-xs font-bold text-[#4e4639]">
                    <th className="p-4">اسم الجائزة</th>
                    <th className="p-4">احتمالية الفوز (%)</th>
                    <th className="p-4 text-center">تكلفة الهدية ($)</th>
                    <th className="p-4 text-center">لون القطاع</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-left pl-8">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1c5b4]/60">
                  {prizes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[#4e4639]/70 font-medium">
                        لا توجد قائمة جوائز مضافة حالياً. انقر على إضافة جائزة جديدة بالأعلى.
                      </td>
                    </tr>
                  ) : (
                    prizes.map((prize) => (
                      <tr key={prize.id} className="hover:bg-[#f3f3f4]/45 transition-colors text-sm">
                        
                        {/* Prize Name */}
                        <td className="p-4 font-serif font-bold text-[#775a19]">{prize.label}</td>
                        
                        {/* Win Probability Bar */}
                        <td className="p-4">
                          <div className="flex items-center gap-3 justify-end">
                            <div className="w-24 h-1.5 bg-[#e2e2e2] rounded-full overflow-hidden block">
                              <div className="h-full bg-[#775a19]" style={{ width: `${Math.min(prize.probability, 100)}%` }}></div>
                            </div>
                            <span className="font-sans text-xs font-semibold">{prize.probability}%</span>
                          </div>
                        </td>

                        {/* Prize Cost Display */}
                        <td className="p-4 text-center font-mono font-bold text-amber-700">
                          ${(prize.cost ?? 0).toLocaleString('ar-EG')}
                        </td>

                        {/* Segment Color Circle Preview */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <div
                              className="w-7 h-7 rounded-full border border-[#d1c5b4] shadow-sm flex items-center justify-center text-[10px]"
                              style={{ backgroundColor: prize.color }}
                              title={prize.color}
                            />
                          </div>
                        </td>

                        {/* State Badge */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                              prize.status === 'نشط'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {prize.status}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-4 text-left pl-8">
                          <div className="flex items-center justify-start gap-3">
                            <button
                              onClick={() => openEditModal(prize)}
                              className="text-[#4e4639] hover:text-[#775a19] p-1.5 hover:bg-[#e8dfc5]/35 rounded transition-all cursor-pointer"
                              title="تعديل الجائزة"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {prize.id === '1' ? (
                              <span className="text-[10px] text-[#775a19] font-bold bg-[#775a19]/10 px-2 py-0.5 rounded border border-[#775a19]/25 flex items-center gap-1 select-none">
                                🔒 عنصر أساسي محمي
                              </span>
                            ) : (
                              <button
                                onClick={() => onDeletePrize(prize.id)}
                                className="text-[#4e4639] hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-all cursor-pointer"
                                title="حذف الجائزة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Banner */}
            <div className="p-4 bg-[#f3f3f4] flex justify-between items-center text-xs text-[#4e4639] font-medium border-t border-[#d1c5b4]/80">
              <span className="font-sans">عرض 1 - {prizes.length} من أصل {prizes.length} جوائز</span>
              <div className="flex gap-1.5">
                <button disabled className="p-1.5 border border-[#d1c5b4]/80 rounded hover:bg-white transition-colors disabled:opacity-40">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button disabled className="p-1.5 border border-[#d1c5b4]/80 rounded hover:bg-white transition-colors disabled:opacity-40">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* B. ANALYTICS & STATS TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Visual Grid Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Asymmetric Section: Dynamic Bar Chart */}
              <div className="lg:col-span-2 gold-border bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-[#775a19] mb-6 flex items-center justify-end gap-1.5">
                  <span>أداء الجوائز ونسب السحب (آخر 30 يوم)</span>
                  <BarChart3 className="w-4.5 h-4.5" />
                </h3>

                {/* Drawn responsive SVG bar chart based on actual current prizes list */}
                <div className="h-44 w-full flex items-end gap-4 px-2 relative min-h-[160px]">
                  {prizes.slice(0, 5).map((p, idx) => {
                    const heightPercent = p.status === 'نشط' ? Math.max(15, Math.min(p.probability * 1.1, 95)) : 10;
                    return (
                      <div key={p.id} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-10 bg-black text-white text-[10px] py-1 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-sans shadow pointer-events-none">
                          نسبة: {p.probability}%
                        </div>
                        {/* Bar Body */}
                        <div 
                          className="w-full rounded-t-lg transition-all duration-300 relative group-hover:brightness-95 cursor-pointer"
                          style={{ 
                            height: `${heightPercent}%`,
                            background: idx === 0 
                              ? 'linear-gradient(to top, #775a19, #c5a059)' 
                              : idx % 2 === 0 ? '#ebe2c8' : '#ffdea5',
                            border: '1px solid #c5a059'
                          }}
                        />
                        {/* Under Label */}
                        <span className="text-[10px] text-[#4e4639] font-bold mt-2 text-center overflow-ellipsis overflow-hidden w-full whitespace-nowrap block">
                          {p.label}
                        </span>
                      </div>
                    );
                  })}
                  {prizes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-[#4e4639] opacity-75">
                      لا يمكن رسم المخطط، أضف قائمة من جوائز دولاب الحظ أولاً.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section: Total Revenue / Distributions Card */}
              <div className="gold-border bg-white p-6 rounded-xl shadow-sm flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#775a19]/10 flex items-center justify-center shadow-inner">
                  <TrendingUp className="text-[#775a19] w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#4e4639] uppercase tracking-wider mb-1">إجمالي توزيعات الجوائز التقديرية</p>
                  <h4 className="font-serif text-3xl font-bold text-[#775a19]">
                    ${totalStats.totalDistributed.toLocaleString('ar-EG')}
                  </h4>
                  <p className="text-[11px] text-emerald-600 mt-2 font-semibold">
                    12% زيادة في السحوبات هذا الشهر
                  </p>
                </div>
              </div>

            </div>

            {/* General Database Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-white p-5 rounded-lg border border-[#d1c5b4]/85">
                <h4 className="text-xs font-bold text-[#775a19] mb-2">إحصائيات توازن العجلة</h4>
                <ul className="text-xs text-[#4e4639] space-y-2">
                  <li className="flex justify-between">
                    <span className="font-semibold">{prizes.length}</span>
                    <span>عدد الجوائز الإجمالي</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">{prizes.filter(p => p.status === 'نشط').length}</span>
                    <span>الجوائز النشطة بالعجلة</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">{totalProbability}%</span>
                    <span>مجموع احتماليات السحب للتوازن</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#d1c5b4]/85">
                <h4 className="text-xs font-bold text-[#775a19] mb-2">تراخيص الدخول</h4>
                <ul className="text-xs text-[#4e4639] space-y-2">
                  <li className="flex justify-between">
                    <span className="font-semibold">{accessRequests.length}</span>
                    <span>إجمالي طلبات التسجيل المودعة</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold text-amber-600">
                      {accessRequests.filter(r => r.status === 'قيد الانتظار').length}
                    </span>
                    <span> طلبات قيد المراجعة الفورية</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold text-emerald-600">
                      {accessRequests.filter(r => r.status === 'مقبول').length}
                    </span>
                    <span>الطلبات المعتمدة المقبولة</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ✉️ Winner Custom Messaging Configurator Section */}
            <div className="gold-border bg-white rounded-xl p-6 shadow-sm mt-6 text-right">
              <div className="flex items-center justify-between border-b border-[#F4EBD0] pb-3 mb-4">
                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">قالب ديناميكي جاهز للواتساب</span>
                <h3 className="font-serif text-lg font-bold text-[#775a19] flex items-center gap-2 justify-end">
                  <span>إعداد رسالة الفائز المخصصة وتفاصيل الهدايا</span>
                  <MessageSquare className="w-5 h-5 text-[#886a19]" />
                </h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs text-[#4e4639] leading-relaxed">
                  قم بصياغة الرسالة المناسبة للتواصل مع العميل الفائز وتأكيد استلام جائزته. يمكنك استخدام الأكواد التلقائية التالية بالصورة المكتوبة، ليقوم النظام بتعويضها لكل عميل تلقائياً:
                </p>
                
                {/* Visual Variable Tag chips */}
                <div className="flex flex-wrap gap-2 justify-end text-[10px] font-sans">
                  <span className="bg-[#f3f3f4] text-[#4e4639] border border-[#d1c5b4]/40 px-2 py-1 rounded">اسم العميل: <code className="font-bold font-mono text-amber-800">{`{customer_name}`}</code></span>
                  <span className="bg-[#f3f3f4] text-[#4e4639] border border-[#d1c5b4]/40 px-2 py-1 rounded">اسم الهدية: <code className="font-bold font-mono text-amber-800">{`{prize_name}`}</code></span>
                  <span className="bg-[#f3f3f4] text-[#4e4639] border border-[#d1c5b4]/40 px-2 py-1 rounded">قيمة الهدية: <code className="font-bold font-mono text-amber-800">{`{prize_value}`}</code></span>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={msgTemplate}
                    onChange={(e) => setMsgTemplate(e.target.value)}
                    className="w-full p-4 bg-[#fbfbf9] border border-[#d1c5b4] rounded-lg text-xs outline-none focus:border-[#775a19] text-right font-sans focus:ring-1 focus:ring-[#775a19] leading-relaxed"
                    placeholder="اكتب تهنئة وتفاصيل الجائزة هنا..."
                  />
                </div>

                {successSentMsg && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-lg flex items-center justify-end gap-2 animate-fadeIn">
                    <span>{successSentMsg}</span>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Live Winners Registry Ledger */}
            <div className="gold-border bg-white rounded-xl overflow-hidden shadow-sm mt-6">
              <div className="bg-[#f3f3f4] p-4 border-b border-[#d1c5b4]/80 flex justify-between items-center">
                <span className="text-[10px] bg-[#775a19]/10 text-[#775a19] px-2 py-0.5 rounded-full font-bold">بوابة متصلة بـ Neon</span>
                <h4 className="text-xs font-bold text-[#775a19]">سجل عمليات الفوز الأخيرة للعملاء (بيانات حيّة)</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#d1c5b4]/50 text-[11px] font-bold text-[#4e4639]">
                      <th className="p-3">اسم العميل (الزبون)</th>
                      <th className="p-3">رقم هاتف العميل</th>
                      <th className="p-3">الجائزة المستلمة</th>
                      <th className="p-3">المسؤول عن السحب</th>
                      <th className="p-3">حساب الموظف</th>
                      <th className="p-3 text-center">القيمة الموزعة</th>
                      <th className="p-3 text-center">خدمة الإرسال والتواصل</th>
                      <th className="p-3 text-left pl-6">التاريخ والوقت</th>
                      <th className="p-3 text-center">حذف الفائز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d1c5b4]/30 font-sans">
                    {wins.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-xs text-[#4e4639]/70 font-medium">
                          لا توجد عمليات سحب مسجلة حالياً بقاعدة البيانات. قم بتدوير العجلة لتسجيل فوز جديد.
                        </td>
                      </tr>
                    ) : (
                      wins.slice(0, 50).map((w) => (
                        <tr key={w.id} className="hover:bg-gray-50 transition-colors text-xs border-b border-gray-100">
                          <td className="p-3 font-extrabold text-[#775a19]">{w.customerName || '—'}</td>
                          <td className="p-3 font-semibold text-gray-700">{w.customerPhone || '—'}</td>
                          <td className="p-3 font-serif font-bold text-gray-900">{w.prizeLabel}</td>
                          <td className="p-3 font-medium text-gray-600">{w.displayName}</td>
                          <td className="p-3 text-[10px] text-gray-400 font-mono">{w.email}</td>
                          <td className="p-3 text-center font-bold text-emerald-700">${(w.valueAssumed || 0).toLocaleString('ar-EG')}</td>
                          
                          {/* Sending operations actions */}
                          <td className="p-3 text-center">
                            {w.customerPhone ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {/* WhatsApp Trigger */}
                                <button
                                  onClick={() => {
                                    const formatted = msgTemplate
                                      .replace(/{customer_name}/g, w.customerName || 'عميلنا العزيز')
                                      .replace(/{prize_name}/g, w.prizeLabel)
                                      .replace(/{prize_value}/g, (w.valueAssumed || 0).toLocaleString('ar-EG'));
                                    
                                    let cleanNum = w.customerPhone ? w.customerPhone.replace(/\D/g, '') : '';
                                    if (cleanNum.startsWith('05') && cleanNum.length === 10) {
                                      cleanNum = '966' + cleanNum.substring(1);
                                    } else if (cleanNum.startsWith('5') && cleanNum.length === 9) {
                                      cleanNum = '966' + cleanNum;
                                    }
                                    
                                    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encodeURIComponent(formatted)}`;
                                    window.open(waUrl, '_blank');
                                    
                                    setSuccessSentMsg(`تم فتح نافذة WhatsApp لإرسال تفاصيل الجائزة للعميل ${w.customerName || 'العميل'}`);
                                    setTimeout(() => setSuccessSentMsg(null), 3500);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                  title="مراسلة عبر واتساب"
                                >
                                  <span>واتساب</span>
                                  <MessageSquare className="w-3 h-3" />
                                </button>

                                {/* Copy message detail to clipboard */}
                                <button
                                  onClick={() => {
                                    const formatted = msgTemplate
                                      .replace(/{customer_name}/g, w.customerName || 'عميلنا العزيز')
                                      .replace(/{prize_name}/g, w.prizeLabel)
                                      .replace(/{prize_value}/g, (w.valueAssumed || 0).toLocaleString('ar-EG'));
                                    
                                    navigator.clipboard.writeText(formatted);
                                    setSuccessSentMsg(`تم نسخ رسالة التهنئة للوظيفة المحددة لـ ${w.customerName || 'العميل'}!`);
                                    setTimeout(() => setSuccessSentMsg(null), 3500);
                                  }}
                                  className="bg-amber-100 hover:bg-amber-200 text-[#775a19] text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                  title="نسخ الرسالة كاملة"
                                >
                                  <span>نسخ التفاصيل</span>
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[10px]">لا يوجد هاتف</span>
                            )}
                          </td>

                          <td className="p-3 text-left pl-6 text-[10px] text-gray-400 font-mono">{w.winDate}</td>
                          
                          {/* Winner Record Deletion Control */}
                          <td className="p-3 text-center">
                            {deleteWinId === w.id ? (
                              <div className="flex items-center justify-center gap-1 animate-fadeIn">
                                <button
                                  onClick={() => {
                                    onDeleteWin(w.id, w.valueAssumed || 0);
                                    setDeleteWinId(null);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  تأكيد الحذف
                                </button>
                                <button
                                  onClick={() => setDeleteWinId(null)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-bold px-1 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteWinId(w.id)}
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="حذف الفائز من السجل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* C. USER ACCESS REQUESTS PANEL */}
        {activeTab === 'access' && (
          <div className="gold-border bg-white rounded-xl overflow-hidden shadow-sm animate-fadeIn">
            <p className="p-4 text-xs text-[#775a19] bg-amber-50">هذا سجل الطلبات القديمة فقط، ولا يغيّر صلاحيات الحسابات الثابتة.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#f3f3f4] border-b border-[#d1c5b4]/80 text-xs font-bold text-[#4e4639]">
                    <th className="p-4">اسم المتقدم</th>
                    <th className="p-4">البريد الإلكتروني المهني</th>
                    <th className="p-4">الغرض من الوصول</th>
                    <th className="p-4">تاريخ الطلب</th>
                    <th className="p-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d1c5b4]/60">
                  {accessRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-[#4e4639]/70 font-medium">
                        لا توجد طلبات سابقة.
                      </td>
                    </tr>
                  ) : (
                    accessRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#f3f3f4]/45 transition-colors text-sm">
                        
                        <td className="p-4 font-semibold text-[#1a1c1c]">
                          {req.firstName} {req.lastName}
                        </td>
                        
                        <td className="p-4 font-sans text-xs">{req.email}</td>
                        
                        <td className="p-4 text-xs opacity-90 max-w-xs overflow-ellipsis overflow-hidden">
                          {req.purpose || 'طلب انضمام لنخبة LuxeSpin'}
                        </td>
                        
                        <td className="p-4 font-sans text-xs opacity-75">{req.requestDate}</td>
                        
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            req.status === 'مقبول'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                              : req.status === 'مرفوض'
                              ? 'bg-red-50 text-red-800 border border-red-250'
                              : 'bg-amber-50 text-amber-800 border border-amber-250'
                          }`}>
                            {req.status}
                          </span>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* D. SETTINGS PARAMETERS PANEL */}
        {activeTab === 'settings' && (
          <div className="flex flex-col items-center justify-center w-full py-12 animate-fadeIn">
            <div className="gold-border bg-white rounded-2xl p-8 sm:p-10 shadow-xl space-y-8 text-right max-w-xl w-full mx-auto border border-[#ffdea5]/80 relative overflow-hidden">
              {/* Elegant golden ribbon visual at top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 gold-gradient" />
              
              <div className="text-center space-y-2 mb-2">
                <h3 className="font-serif text-2xl font-black text-[#775a19]">لوحة التحكم في العجلة الدوارة</h3>
                <p className="text-xs text-gray-500">قم بتخصيص خيارات ومؤثرات العجلة التفاعلية وتعيين وقت الدوران بدقة</p>
              </div>

              {/* 🕒 STEP-BY-STEP CUSTOM TIME CONFIGURATION SECTION */}
              <div className="bg-[#fcfbfa] border border-[#ffdea5]/60 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#f4ebd0] pb-2.5">
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">قابل للتعديل بالكامل</span>
                  <div className="text-right font-serif text-sm font-bold text-[#775a19] flex items-center gap-1.5">
                    <span>توقيت دوران العجلة</span>
                    <span className="text-amber-600 font-mono">🕒</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-right leading-relaxed">
                  اضبط مدة الدوران الكلية للعجلة بالثواني بدقة لتناسب رغبتك. المدة الافتراضية هي 4.1 ثانية.
                </p>

                {/* Main Interactive Dial Controls */}
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-lg space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    {/* Decrement Button */}
                    <button
                      type="button"
                      onClick={() => setSpinDuration(prev => Math.max(1, parseFloat((prev - 0.5).toFixed(1))))}
                      className="w-10 h-10 rounded-full border border-[#d1c5b4] hover:border-[#775a19] hover:bg-amber-50 text-[#775a19] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 select-none text-lg"
                      title="تقليل المدة بمقدار 0.5 ثانية"
                    >
                      -
                    </button>

                    {/* Numeric Input & Label */}
                    <div className="text-center flex flex-col items-center">
                      <div className="flex items-baseline gap-1.5 justify-center">
                        <span className="text-xs font-bold text-gray-400">ثانية</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="30"
                          value={spinDuration}
                          onChange={(e) => setSpinDuration(Math.max(0.5, parseFloat(parseFloat(e.target.value).toFixed(1)) || 4.1))}
                          className="w-20 text-center font-mono text-3xl font-black text-amber-900 bg-transparent border-b-2 border-[#c5a059] focus:outline-none focus:border-[#775a19] pb-0.5"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold mt-1">اضبط الوقت كما تحب</span>
                    </div>

                    {/* Increment Button */}
                    <button
                      type="button"
                      onClick={() => setSpinDuration(prev => Math.min(30, parseFloat((prev + 0.5).toFixed(1))))}
                      className="w-10 h-10 rounded-full border border-[#d1c5b4] hover:border-[#775a19] hover:bg-amber-50 text-[#775a19] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 select-none text-lg"
                      title="زيادة المدة بمقدار 0.5 ثانية"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick-Adjust Preset Tags */}
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {[
                      { label: 'سريع جداً', val: 3 },
                      { label: 'معتدل فاخر', val: 4.1 },
                      { label: 'تشويق مطلق', val: 6 },
                      { label: 'عرض كلاسيكي', val: 8 },
                      { label: 'سينمائي طويل', val: 10 }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSpinDuration(p.val)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          spinDuration === p.val
                            ? 'bg-amber-950/90 text-white border-amber-950 shadow-sm'
                            : 'bg-amber-50/50 text-[#775a19] border-amber-200/60 hover:bg-amber-50 hover:border-[#775a19]'
                        }`}
                      >
                        {p.label} ({p.val}s)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles removed as requested */}

              {/* Centered actions to Save */}
              <div className="flex flex-col items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('spin_duration', String(spinDuration));
                    localStorage.setItem('sound_enabled', String(soundEnabled));
                    localStorage.setItem('auto_approve', String(autoApprove));
                    
                    // Show beautiful toast / alert inside the page
                    alert('✨ تم حفظ ومزامنة الخيارات وضبط زمن دوران العجلة بنجاح!');
                  }}
                  className="gold-gradient text-white font-extrabold text-sm px-10 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer w-full text-center btn-hover-effect"
                >
                  حفظ وتطبيق التعديلات الحالية 💾
                </button>
                <p className="text-[10px] text-gray-400 mt-2">سيتم تطبيق زمن الدوران والخصائص الجديدة فوراً عند زيارة صفحة السحب.</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 4. MODAL DIALOG: ADD/EDIT PRIZE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-[#ffdea5] space-y-4">
            
            <div className="flex justify-between items-center border-b border-[#d1c5b4]/80 pb-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-serif text-lg font-bold text-[#775a19]">
                {editingPrize ? 'تعديل الجائزة الحالية' : 'إضافة جائزة جديدة'}
              </h3>
            </div>

            <form onSubmit={handlePrizeSubmit} className="space-y-4">
              
              {/* Prize Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e4639] block text-right">اسم الجائزة</label>
                <input
                  type="text"
                  required
                  value={prizeLabel}
                  onChange={(e) => setPrizeLabel(e.target.value)}
                  placeholder="مثال: ساعة رولكس ديت جست"
                  className="w-full px-3 py-2 bg-[#fbfbf9] border border-[#d1c5b4] rounded-lg text-sm outline-none focus:border-[#775a19] text-right"
                />
              </div>

              {/* Win percentage probability input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e4639] block text-right">احتمالية الفوز (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  max="100"
                  value={prizeProb}
                  onChange={(e) => setPrizeProb(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#fbfbf9] border border-[#d1c5b4] rounded-lg text-sm outline-none focus:border-[#775a19] text-right font-sans"
                />
              </div>

              {/* Prize Cost Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e4639] block text-right">تكلفة الهدية (القيمة المقدرة بالدولار $)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={prizeCost}
                  onChange={(e) => setPrizeCost(Number(e.target.value))}
                  placeholder="مثال: 500"
                  className="w-full px-3 py-2 bg-[#fbfbf9] border border-[#d1c5b4] rounded-lg text-sm outline-none focus:border-[#775a19] text-right font-sans"
                />
              </div>

              {/* Sector color palette and custom picker */}
              <div className="space-y-2" dir="rtl">
                <label className="text-xs font-semibold text-[#4e4639] block">اختر لون القطاع من هذه الدرجات أو لونًا مخصصًا</label>
                <div className="flex flex-wrap items-center gap-2">
                  {sectorColors.map(({ name, hex }) => {
                    const selected = !isCustomColor && prizeColor.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={name}
                        aria-pressed={selected}
                        title={name}
                        onClick={() => selectSectorColor(hex)}
                        className={`h-9 w-9 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#775a19] ${selected ? 'border-[#3b2b12] ring-2 ring-[#c5a059] ring-offset-2' : 'border-white shadow-sm'}`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#4e4639]">
                    <input
                      type="color"
                      aria-label="لون مخصص للقطاع"
                      title="اختر لونًا مخصصًا"
                      value={prizeColor}
                      onChange={(e) => selectSectorColor(e.target.value, true)}
                      className={`h-9 w-9 p-0.5 bg-white rounded border-2 cursor-pointer ${isCustomColor ? 'border-[#3b2b12] ring-2 ring-[#c5a059] ring-offset-2' : 'border-[#d1c5b4]'}`}
                    />
                    <span>مخصص</span>
                  </label>
                </div>
                <label className="text-xs font-semibold text-[#4e4639] block pt-1">لون كتابة القطاع</label>
                <input
                  type="color"
                  aria-label="لون كتابة القطاع"
                  value={prizeTextCol}
                  onChange={(e) => setPrizeTextCol(e.target.value)}
                  className="h-9 w-20 p-0.5 bg-white border border-[#d1c5b4] rounded-lg cursor-pointer block"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4e4639] block text-right">الحالة</label>
                {editingPrize?.id === '1' ? (
                  <div className="w-full px-3 py-2.5 bg-gray-50 border border-[#d1c5b4] rounded-lg text-sm text-[#775a19] font-extrabold text-right select-none">
                     نشط (عنصر أساسي محمي بموجب نظام التوازن)
                  </div>
                ) : (
                  <select
                    value={prizeStatus}
                    onChange={(e) => setPrizeStatus(e.target.value as 'نشط' | 'غير نشط')}
                    className="w-full px-3 py-2.5 bg-[#fbfbf9] border border-[#d1c5b4] rounded-lg text-sm outline-none focus:border-[#775a19] text-right"
                  >
                    <option value="نشط">نشط (مدرج بعجلة الحظ)</option>
                    <option value="غير نشط">غير نشط (معطل)</option>
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-4 justify-start">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-[#f3f3f4] text-[#4e4639] border border-[#d1c5b4]/70 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  className="gold-gradient text-white font-bold text-xs px-5 py-2.5 rounded-lg hover:shadow transition-transform active:scale-95 cursor-pointer"
                >
                  حفظ وتطبيق
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Clean Footer layout at the outer edge */}
      <footer className="fixed bottom-0 mr-0 lg:mr-68 left-0 right-0 h-auto md:h-14 bg-white/80 backdrop-blur-md border-t border-[#d1c5b4]/80 px-4 md:px-10 flex flex-col md:flex-row items-center justify-between text-[10px] md:text-[11px] text-[#4e4639] z-30 py-2.5 md:py-0 gap-1 text-center md:text-right">
        <div className="flex flex-col md:flex-row gap-1 md:gap-4">
          <span className="text-[#4e4639] font-bold">الدعم والمساعدة هاتفياً: <span className="font-mono text-[#775a19] whitespace-nowrap">0777744189</span> أو <span className="font-mono text-[#775a19] whitespace-nowrap">0780090698</span></span>
        </div>
        <p className="opacity-90">© 2026 angel perfum. All rights reserved.</p>
      </footer>

    </div>
  );
}
