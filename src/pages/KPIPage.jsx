import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../services/supabaseClient';
import { 
  Wallet, Trophy, Target, Calendar, 
  Sparkles, TrendingUp, Zap, Edit, Plus, Trash2, X, Save
} from 'lucide-react';

// Маппинг флагов
const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺'
};

const KPIPage = () => {
  const { kpiRates, kpiSettings, user, fetchAllData } = useAppStore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Безопасное получение данных из стора с дефолтными значениями
  const baseSalary = kpiSettings?.base_salary || 0;
  
  // Парсим JSON настройки тиров, если они пришли строкой или объектом
  const dailyTiers = typeof kpiSettings?.daily_tiers === 'string' 
    ? JSON.parse(kpiSettings.daily_tiers) 
    : (kpiSettings?.daily_tiers || []);

  const monthlyTiers = typeof kpiSettings?.monthly_tiers === 'string' 
    ? JSON.parse(kpiSettings.monthly_tiers) 
    : (kpiSettings?.monthly_tiers || []);

  const isAdmin = user?.role === 'Admin' || user?.role === 'C-level'; // Доступ к кнопке

  return (
    <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2 tracking-tight">
            <Target className="text-blue-500" size={20} />
            Система Мотивации
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
            Актуальная тарифная сетка и бонусы
          </p>
        </div>
        
        {/* КНОПКА ИЗМЕНИТЬ (Только для Админа) */}
        {isAdmin && (
          <button 
            onClick={() => setIsEditOpen(true)} 
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity shadow-sm"
          >
            <Edit size={14} /> Изменить KPI
          </button>
        )}
      </div>

      {/* 1. HERO BLOCK: BASE SALARY */}
      <div className="relative overflow-hidden rounded-xl bg-[#111] border border-gray-800 shadow-xl mb-6 group">
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20 pointer-events-none"></div>

        <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Wallet size={32} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Гарантированный оклад</h3>
              <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                Фиксированная выплата каждую неделю при выполнении минимальных требований активности.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-2xl mt-2 text-gray-500 font-mono mr-1">$</span>
            <span className="text-6xl font-black text-white tracking-tighter font-mono drop-shadow-lg">{baseSalary}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ТАРИФЫ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-gray-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Тарифы за прогноз</h3>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">Dynamic</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {kpiRates.map((rate) => (
                <BonusItem 
                  key={rate.id}
                  title={rate.product_name} 
                  // subtitle={rate.subtitle} 
                  price={Number(rate.rate).toFixed(2)} 
                  isHighlight={rate.is_highlight} 
                />
              ))}
              {kpiRates.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-400 col-span-2">Тарифы не настроены</div>
              )}
            </div>
          </div>

          {/* КОМАНДНАЯ ПРЕМИЯ (Статика для визуализации, пока нет логики команд в БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Командная гонка</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
                <Zap size={12} fill="currentColor" /> +$30 бонус
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TeamCard number="I" countries={["UA", "PL", "IT", "HR"]} color="border-blue-500/30 bg-blue-500/5 text-blue-400" />
              <TeamCard number="II" countries={["BG", "CZ", "RO", "LT"]} color="border-purple-500/30 bg-purple-500/5 text-purple-400" />
              <TeamCard number="III" countries={["TR", "FR", "PT", "DE"]} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center opacity-70">
              * Бонус начисляется каждому участнику победившей группы по итогам недели
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ДНЕВНЫЕ ЦЕЛИ (Динамические из БД) */}
          <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold dark:text-white uppercase tracking-wide">Дневной KPI</h3>
            </div>
            
            <div className="p-4 space-y-3">
              {dailyTiers.map((tier, idx) => (
                <DailyTier 
                  key={idx} 
                  count={`${tier.min}${tier.max > 100 ? '+' : ' – ' + tier.max}`} 
                  reward={tier.reward} 
                  isMax={tier.reward >= 10} 
                />
              ))}
              {dailyTiers.length === 0 && <div className="text-xs text-gray-400 text-center">Не настроено</div>}
            </div>
          </div>

          {/* ИТОГИ МЕСЯЦА (Динамические из БД) */}
          <div className="relative overflow-hidden rounded-xl bg-[#09090b] border border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 to-black/80 pointer-events-none"></div>
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Бонус месяца</h3>
              </div>

              <div className="space-y-0">
                {monthlyTiers.map((tier, idx) => (
                  <MonthTier 
                    key={idx} 
                    label={tier.max > 1000 ? `${tier.min}+ продаж` : `${tier.min} - ${tier.max} продаж`} 
                    reward={tier.reward} 
                    isHighlight={tier.reward >= 100}
                    isDim={tier.reward < 75}
                  />
                ))}
                {monthlyTiers.length === 0 && <div className="text-xs text-gray-500 text-center">Не настроено</div>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {isEditOpen && (
        <EditKPIModal 
          onClose={() => setIsEditOpen(false)} 
          onUpdate={fetchAllData} 
          kpiRates={kpiRates} 
          kpiSettings={kpiSettings} 
        />
      )}
    </div>
  );
};

// --- КОМПОНЕНТЫ UI ---

const BonusItem = ({ title, subtitle, price, isHighlight }) => (
  <div className={`
    flex justify-between items-center p-4 border-b sm:border-b-0 sm:odd:border-r border-gray-200 dark:border-[#333] last:border-0 hover:bg-gray-50 dark:hover:bg-[#161616] transition-colors group
    ${isHighlight ? 'bg-purple-50/30 dark:bg-purple-900/5' : ''}
  `}>
    <div>
      <div className={`text-xs font-bold ${isHighlight ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {title}
      </div>
      {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
    <div className={`text-sm font-mono font-bold flex items-center ${isHighlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
      <span className="text-[10px] mr-0.5 opacity-60">$</span>{price}
    </div>
  </div>
);

const DailyTier = ({ count, reward, isMax }) => (
  <div className={`
    flex justify-between items-center p-3 rounded-lg border transition-all
    ${isMax 
      ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
      : 'bg-gray-50 dark:bg-[#161616] border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
    }
  `}>
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Продаж</span>
      <span className={`text-sm font-bold ${isMax ? 'text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
        {count}
      </span>
    </div>
    <div className={`flex items-center gap-1 font-mono font-bold text-lg ${isMax ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const MonthTier = ({ label, reward, isDim, isHighlight }) => (
  <div className={`
    flex justify-between items-center py-3 border-b border-gray-800 last:border-0
    ${isHighlight ? 'py-4' : ''}
  `}>
    <span className={`text-xs font-medium ${isDim ? 'text-gray-500' : 'text-gray-300'} ${isHighlight ? 'text-white font-bold' : ''}`}>
      {label}
    </span>
    <div className={`
      flex items-center gap-1 font-mono font-bold
      ${isHighlight ? 'text-emerald-400 text-lg drop-shadow-md' : isDim ? 'text-gray-600' : 'text-emerald-600/70'}
    `}>
      <span className="text-xs opacity-50">+</span>${reward}
    </div>
  </div>
);

const TeamCard = ({ number, countries, color }) => (
  <div className={`p-4 rounded-lg border ${color} flex flex-col items-center text-center relative overflow-hidden`}>
    <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">Группа {number}</div>
    <div className="flex flex-wrap justify-center gap-2">
      {countries.map(c => (
        <span 
          key={c} 
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-black/40 border border-white/10 text-white text-[11px] font-bold shadow-sm"
        >
          <span className="text-sm leading-none">{FLAGS[c] || '🏳️'}</span> 
          {c}
        </span>
      ))}
    </div>
  </div>
);

// --- MODAL EDITOR (АДМИНСКАЯ ПАНЕЛЬ) ---
const EditKPIModal = ({ onClose, onUpdate, kpiRates, kpiSettings }) => {
    // Локальный стейт для редактирования
    const [rates, setRates] = useState(kpiRates || []);
    const [baseSalary, setBaseSalary] = useState(kpiSettings?.base_salary || 0);
    const [newProduct, setNewProduct] = useState({ name: '', rate: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Обновляем существующие тарифы
            for (const r of rates) {
                await supabase.from('kpi_product_rates').upsert({ 
                    id: r.id, 
                    product_name: r.product_name, 
                    rate: parseFloat(r.rate) 
                });
            }
            // 2. Добавляем новый, если введен
            if (newProduct.name && newProduct.rate) {
                await supabase.from('kpi_product_rates').insert({ 
                    product_name: newProduct.name, 
                    rate: parseFloat(newProduct.rate) 
                });
            }
            // 3. Обновляем настройки (Оклад)
            await supabase.from('kpi_settings').upsert({ key: 'base_salary', value: baseSalary });

            await onUpdate(); // Обновляем стор
            onClose();
        } catch (e) {
            console.error(e);
            alert('Ошибка при сохранении');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm('Удалить этот тариф?')) return;
        await supabase.from('kpi_product_rates').delete().eq('id', id);
        setRates(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-xl border border-gray-200 dark:border-[#333] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50/50 dark:bg-[#161616]">
                    <h3 className="text-sm font-bold dark:text-white flex items-center gap-2">
                        <Edit size={16} className="text-blue-500" /> Редактор KPI
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white"><X size={18}/></button>
                </div>
                
                <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Base Salary */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Базовая ставка ($)</label>
                        <input 
                            type="number" 
                            value={baseSalary} 
                            onChange={e => setBaseSalary(e.target.value)} 
                            className="w-full bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded p-2 text-sm font-bold dark:text-white outline-none focus:border-blue-500 transition-colors" 
                        />
                    </div>

                    {/* Product Rates */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Тарифы продуктов</label>
                        <div className="space-y-2 bg-gray-50 dark:bg-[#161616] p-3 rounded-lg border border-gray-200 dark:border-[#222]">
                            {rates.map((r, idx) => (
                                <div key={r.id} className="flex gap-2 items-center group">
                                    <input 
                                        value={r.product_name} 
                                        onChange={e => {const n=[...rates]; n[idx].product_name=e.target.value; setRates(n)}} 
                                        className="flex-1 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 dark:text-white outline-none focus:border-blue-500" 
                                    />
                                    <span className="text-gray-400 text-xs">$</span>
                                    <input 
                                        type="number" 
                                        value={r.rate} 
                                        onChange={e => {const n=[...rates]; n[idx].rate=e.target.value; setRates(n)}} 
                                        className="w-14 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 font-mono font-bold text-right dark:text-white outline-none focus:border-blue-500" 
                                    />
                                    <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                </div>
                            ))}
                            
                            {/* Add New Input */}
                            <div className="flex gap-2 items-center pt-3 border-t border-dashed border-gray-300 dark:border-[#333] mt-2">
                                <Plus size={14} className="text-green-500" />
                                <input 
                                    placeholder="Название нового продукта..." 
                                    value={newProduct.name} 
                                    onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                                    className="flex-1 bg-transparent text-xs py-1 dark:text-white outline-none placeholder:text-gray-500" 
                                />
                                <span className="text-gray-400 text-xs">$</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={newProduct.rate} 
                                    onChange={e => setNewProduct({...newProduct, rate: e.target.value})} 
                                    className="w-14 bg-transparent border-b border-gray-300 dark:border-[#444] text-xs py-1 font-mono text-right dark:text-white outline-none focus:border-green-500" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#161616] flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">Отмена</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        <Save size={14} /> {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default KPIPage;