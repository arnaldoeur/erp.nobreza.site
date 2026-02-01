
import React, { useState, useMemo } from 'react';
import { Lock, Save, AlertTriangle, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { DailyClosure, Sale, User as UserType } from '../types';
import { NotificationService } from '../services';

interface DailyCloseProps {
  sales: Sale[];
  dailyClosures: DailyClosure[];
  onConfirmClosure: (closure: DailyClosure) => void;
  onUpdateClosure?: (closure: DailyClosure) => void;
  user: UserType;
}

export const DailyClose: React.FC<DailyCloseProps> = ({ sales, dailyClosures, onConfirmClosure, user }) => {
  const [cashValue, setCashValue] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [activeTab, setActiveTab] = useState<'FORM' | 'HISTORY'>('FORM');

  const todayStr = new Date().toLocaleDateString();

  // Sort daily closures desc
  const todayClosures = useMemo(() => {
    return dailyClosures
      .filter(c => new Date(c.closureDate).toLocaleDateString() === todayStr)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dailyClosures, todayStr]);

  // Determine Shift Name
  const currentShiftName = useMemo(() => {
    if (todayClosures.length === 0) return 'Turno da Manhã';
    if (todayClosures.length === 1) return 'Turno da Tarde';
    return 'Turno Extra';
  }, [todayClosures]);

  // Determine start time for this shift (time of last closure or start of day)
  const shiftStartTime = useMemo(() => {
    if (todayClosures.length > 0) {
      return new Date(todayClosures[0].createdAt); // Start after last closure
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }, [todayClosures]);

  // Filter sales for this shift
  const salesThisShift = useMemo(() => {
    return sales.filter(s => {
      const t = new Date(s.timestamp);
      return t > shiftStartTime && t.toLocaleDateString() === todayStr;
    });
  }, [sales, shiftStartTime, todayStr]);

  const systemTotal = useMemo(() => {
    return salesThisShift.reduce((sum, s) => sum + s.total, 0);
  }, [salesThisShift]);

  const reportedCash = parseFloat(cashValue) || 0;
  const difference = reportedCash - systemTotal;

  const handleFinish = () => {
    if (confirm(`Deseja confirmar o fecho do "${currentShiftName}"?`)) {
      const newClosure: DailyClosure = {
        id: `CLOS-${Date.now()}`,
        companyId: user.companyId,
        closureDate: new Date(),
        shift: currentShiftName,
        responsibleId: user.id,
        responsibleName: user.name,
        systemTotal,
        manualCash: reportedCash,
        difference,
        observations,
        status: 'CLOSED',
        createdAt: new Date()
      };

      onConfirmClosure(newClosure);

      // Notify via Email
      NotificationService.sendDailyClosureEmail(newClosure, {
        name: 'Empresa',
        address: '',
        phone: '',
        nuit: '',
        email: '',
        website: '',
        id: '',
        slogan: ''
      }, user).finally(() => console.log("Email Notification Processed"));
      // Note: Passing minimal company info as it's not available in props directly here, strictly strictly should come from props or service
      // To fix this cleanly I should pass companyInfo to DailyClose or fetch it.

      setIsFinished(true);
    }
  };

  const handleStartNewShift = () => {
    setIsFinished(false);
    setCashValue('');
    setObservations('');
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-lg animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-emerald-950 uppercase tracking-tighter">Turno Encerrado</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Dados processados com sucesso</p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setActiveTab('HISTORY')} className="px-6 py-3 bg-gray-100 rounded-xl font-black text-xs uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-all">
            Ver Histórico
          </button>
          <button onClick={handleStartNewShift} className="px-6 py-3 bg-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg hover:bg-emerald-800 transition-all">
            Novo Turno
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-10">
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 w-full md:w-fit mx-auto">
        <button onClick={() => setActiveTab('FORM')} className={`flex-1 md:px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'FORM' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400'}`}>Operação Atual</button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 md:px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-400'}`}>Histórico ({todayClosures.length})</button>
      </div>

      {activeTab === 'FORM' ? (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/10 space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 border-b border-gray-50 dark:border-white/5 pb-6">
            <div className="p-4 bg-red-50 dark:bg-red-500/20 text-red-600 rounded-2xl shadow-inner"><Lock size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-tight leading-none">Fecho de Caixa</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                {currentShiftName} em curso
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">Movimento do Turno</h4>
              <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.3em] mb-1">Vendas (Sistema)</p>
                <p className="text-4xl font-black text-emerald-950 dark:text-white tracking-tighter">MT {systemTotal.toLocaleString()}</p>
                <p className="text-[9px] text-gray-400 font-bold mt-4 uppercase">{salesThisShift.length} Vendas desde {shiftStartTime.toLocaleTimeString().slice(0, 5)}</p>
              </div>

              {todayClosures.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-2xl text-[10px] font-bold uppercase border border-blue-100 dark:border-blue-500/20 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Turno anterior fechado às {new Date(todayClosures[0].createdAt).toLocaleTimeString().slice(0, 5)}</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">Valor Físico (Contado)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-gray-300 dark:text-white/20">MT</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full pl-16 pr-6 py-6 bg-white dark:bg-black/40 border-2 border-gray-100 dark:border-white/10 rounded-2xl focus:border-red-500 outline-none text-3xl font-black text-emerald-950 dark:text-white shadow-inner"
                    placeholder="0,00"
                    value={cashValue}
                    onChange={e => setCashValue(e.target.value)}
                  />
                </div>
              </div>

              {difference !== 0 && cashValue !== '' && (
                <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-2 ${difference < 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'}`}>
                  <AlertTriangle size={24} />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wide">Diferença de Caixa</p>
                    <p className="text-sm font-black uppercase tracking-tight">MT {difference.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">Observações</label>
                <textarea
                  className="w-full p-5 bg-gray-50 dark:bg-black/20 border-2 border-transparent rounded-2xl focus:bg-white dark:focus:bg-black/40 focus:border-emerald-500 outline-none font-bold text-sm text-gray-700 dark:text-white min-h-[100px] transition-all"
                  placeholder="Justifique quebras ou sobras..."
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                />
              </div>

              <button
                onClick={handleFinish}
                className="w-full bg-red-600 text-white py-6 rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-red-700"
              >
                <Save size={20} /> CONFIRMAR FECHO: {currentShiftName.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-right-4">
          {dailyClosures.length === 0 ? (
            <div className="bg-white p-20 rounded-[2rem] text-center opacity-20 border-2 border-dashed flex flex-col items-center gap-4">
              <History size={64} />
              <p className="font-black uppercase tracking-widest text-xs">Sem Histórico de Auditoria</p>
            </div>
          ) : (
            dailyClosures.map(c => (
              <div key={c.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                      {new Date(c.closureDate).toLocaleDateString()} • {new Date(c.createdAt).toLocaleTimeString().slice(0, 5)}
                    </div>
                    <p className="text-sm font-black text-emerald-950 uppercase">{c.responsibleName} • {c.shift || 'Turno Único'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Sistema</p>
                    <p className="text-sm font-black text-gray-800">MT {c.systemTotal.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-950 p-3 rounded-xl text-white">
                    <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Declarado</p>
                    <p className="text-sm font-black">MT {c.manualCash.toLocaleString()}</p>
                  </div>
                </div>
                {c.difference !== 0 && (
                  <div className={`p-2 rounded-lg text-center text-[9px] font-black uppercase ${c.difference < 0 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                    Divergência: MT {c.difference.toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
