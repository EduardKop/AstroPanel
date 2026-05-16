import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabaseClient';
import { showToast } from '../../utils/toastEvents';
import { X, Clipboard, Check, ChevronRight, Database } from 'lucide-react';

const FIXED_PRODUCT = 'TaroNew';
const FIXED_AMOUNT_EUR = 11;

const PAYMENT_METHODS = [
    'Lava', 'JETFEX', 'IBAN', 'Прямые реквизиты', 'MyFatoorah', 'INSTAPAY',
    'Stripe (AstroPayments)', 'PayPal (AstroPayments)',
    'Мексика Барбадос (дроп)', 'Турция астрология (дроп)', 'астрология Грузия (дроп)',
    'Horizon Азб - Узб (дроп)', 'Бразилия (дроп)', 'Реквизиты Аз (дроп)'
];

// Parse a tab-separated lead row:
// 2026-05-13T09:47:28.148Z  FRANCESCA  3470159189  Lafra9283  francescazeno83@gmail.com
const parseLeadRow = (raw) => {
    const cols = raw.trim().split('\t');
    if (cols.length < 3) return null;

    const dateStr = cols[0]?.trim();
    const phone = cols[2]?.trim();

    if (!dateStr || !phone) return null;

    // The datetime from the sheet is already ISO UTC
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    return { date, phone, rawDate: dateStr };
};

const FieldRow = ({ label, value, highlight, mono }) => (
    <div className="flex justify-between items-center py-0.5">
        <span className="text-gray-400 text-xs font-mono shrink-0">{label}</span>
        <span className={`text-xs ml-3 text-right break-all ${mono ? 'font-mono' : 'font-bold'} ${highlight ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
            {value}
        </span>
    </div>
);

const AddLeadPaymentModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, countries } = useAppStore();
    const [step, setStep] = useState('form'); // 'form' | 'confirm'
    const [rawRow, setRawRow] = useState('');
    const [parsed, setParsed] = useState(null);
    const [parseError, setParseError] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('IT');
    const [selectedMethod, setSelectedMethod] = useState('Stripe (AstroPayments)');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Italy always first, rest sorted alphabetically
    const sortedCountries = useMemo(() => {
        if (!countries?.length) return [];
        const italy = countries.find(c => c.code === 'IT');
        const rest = countries.filter(c => c.code !== 'IT').sort((a, b) => a.code.localeCompare(b.code));
        return italy ? [italy, ...rest] : rest;
    }, [countries]);

    const selectedCountryObj = sortedCountries.find(c => c.code === selectedCountry);
    const canProceed = parsed && selectedMethod && selectedCountry;

    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setRawRow('');
            setParsed(null);
            setParseError('');
            setSelectedCountry('IT');
            setSelectedMethod('Stripe (AstroPayments)');
        }
    }, [isOpen]);

    const handleParse = () => {
        setParseError('');
        setParsed(null);
        const result = parseLeadRow(rawRow);
        if (!result) {
            setParseError('Не удалось распознать строку. Ожидается формат: Дата/Время↹Имя↹Телефон↹Instagram↹Email');
            return;
        }
        setParsed(result);
    };

    const handleSubmit = async () => {
        if (!canProceed) return;
        setIsSubmitting(true);
        try {
            const payload = {
                transaction_date: parsed.date.toISOString(), // Already UTC from sheet
                amount_eur: FIXED_AMOUNT_EUR,
                amount_local: FIXED_AMOUNT_EUR,
                manager_id: user.id,
                product: FIXED_PRODUCT,
                country: selectedCountry,
                payment_type: selectedMethod,
                crm_link: parsed.phone, // WhatsApp phone number
                status: 'completed',
                telegram_id: user?.telegram_id || null,
                created_at: new Date().toISOString(),
            };

            const { data, error } = await supabase.from('payments').insert(payload).select();
            if (error) throw error;

            // Patch local store for instant UI update (no Realtime wait)
            const currentManagersMap = {};
            (useAppStore.getState().managers || []).forEach(m => {
                currentManagersMap[m.id] = { name: m.name, role: m.role, telegram_username: m.telegram_username };
            });

            const newItem = data[0];
            const formattedLocal = {
                ...newItem,
                id: newItem.id,
                transactionDate: newItem.transaction_date || newItem.created_at,
                amountEUR: FIXED_AMOUNT_EUR,
                amountLocal: FIXED_AMOUNT_EUR,
                amount: FIXED_AMOUNT_EUR,
                manager: currentManagersMap[newItem.manager_id]?.name || 'Не назначен',
                managerId: newItem.manager_id,
                managerRole: currentManagersMap[newItem.manager_id]?.role || null,
                manager_tg: currentManagersMap[newItem.manager_id]?.telegram_username || null,
                type: newItem.payment_type || 'Other',
                status: 'completed',
                source: 'whatsapp',
                country: selectedCountry,
                product: FIXED_PRODUCT,
            };

            // Broadcast to other users / tabs
            const bChannel = supabase.channel('dashboard-new-payments');
            bChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    bChannel.send({
                        type: 'broadcast',
                        event: 'new_payment_added',
                        payload: formattedLocal,
                    }).then(() => supabase.removeChannel(bChannel));
                }
            });

            useAppStore.setState(state => {
                if (state.payments.some(p => p.id === formattedLocal.id)) return state;
                return {
                    payments: [formattedLocal, ...state.payments],
                    stats: {
                        ...state.stats,
                        totalEur: Number(state.stats?.totalEur || 0) + FIXED_AMOUNT_EUR,
                        count: (state.stats?.count || 0) + 1,
                    },
                };
            });

            onClose();
            if (onSuccess) onSuccess();
            else showToast('Лид успешно добавлен!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Ошибка при сохранении: ' + e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#151515] flex justify-between items-center shrink-0">
                    <div>
                        <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Добавить лид</div>
                        <div className="font-bold text-lg dark:text-white flex items-center gap-2">
                            TaroNew · €11
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded text-[10px]">WhatsApp</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {step === 'confirm' ? (
                    /* ── CONFIRM STEP ── */
                    <div className="p-6 flex flex-col gap-5 overflow-y-auto">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Database size={22} />
                            </div>
                            <h3 className="text-lg font-bold dark:text-white">Проверьте данные</h3>
                            <p className="text-gray-500 text-xs mt-1">Именно так запись попадёт в БД</p>
                        </div>

                        {/* DB preview */}
                        <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-xl p-4 space-y-2 border border-gray-100 dark:border-[#333]">
                            <FieldRow label="transaction_date" value={parsed?.date.toISOString()} mono />
                            <FieldRow label="crm_link (WhatsApp)" value={parsed?.phone} highlight />
                            <FieldRow label="product" value={FIXED_PRODUCT} />
                            <FieldRow label="amount_eur / amount_local" value={`€${FIXED_AMOUNT_EUR}`} />
                            <FieldRow
                                label="country"
                                value={`${selectedCountryObj?.emoji ?? ''} ${selectedCountry}`}
                            />
                            <FieldRow label="payment_type" value={selectedMethod} />
                            <FieldRow label="manager_id" value={user?.id} mono />
                            <FieldRow label="status" value="completed" />
                        </div>

                        {/* UTC clarification */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Из строки:</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">{parsed?.rawDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">📅 В БД (UTC-0):</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">{parsed?.date.toISOString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <button
                                onClick={() => setStep('form')}
                                className="flex-1 py-3 bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:opacity-80 transition-opacity"
                            >
                                Назад
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Сохранение...' : '💾 Записать в БД'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── FORM STEP ── */
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">

                        {/* GEO selector — Italy first */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">🌍 ГЕО</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                {sortedCountries.map(c => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => setSelectedCountry(c.code)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                            selectedCountry === c.code
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/30'
                                                : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-purple-400'
                                        }`}
                                    >
                                        <span>{c.emoji}</span>
                                        <span>{c.code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Paste Row */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase flex items-center gap-2">
                                <Clipboard size={12} /> Вставить строку из таблицы
                            </label>
                            <textarea
                                rows={3}
                                value={rawRow}
                                onChange={e => {
                                    setRawRow(e.target.value);
                                    setParsed(null);
                                    setParseError('');
                                }}
                                placeholder={"2026-05-13T09:47:28.148Z\tFRANCESCA\t3470159189\tLafra9283\tfrancescazeno83@gmail.com"}
                                className="w-full font-mono text-xs bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleParse}
                                className="mt-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Парсить
                            </button>

                            {parseError && (
                                <p className="mt-2 text-xs text-red-500">{parseError}</p>
                            )}

                            {parsed && (
                                <div className="mt-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 rounded-lg p-3 space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400 font-bold mb-1">
                                        <Check size={13} /> Распознано успешно
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-1 text-xs">
                                        <span className="text-gray-400">Дата (UTC):</span>
                                        <span className="font-mono font-bold dark:text-white text-[11px]">{parsed.date.toISOString()}</span>
                                        <span className="text-gray-400">Телефон (WhatsApp):</span>
                                        <span className="font-bold text-green-600 dark:text-green-400">{parsed.phone}</span>
                                        <span className="text-gray-400">Продукт:</span>
                                        <span className="font-bold dark:text-white">{FIXED_PRODUCT}</span>
                                        <span className="text-gray-400">Сумма:</span>
                                        <span className="font-bold text-emerald-600">€{FIXED_AMOUNT_EUR}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Метод оплаты</label>
                            <div className="flex flex-wrap gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setSelectedMethod(m)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                            selectedMethod === m
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-purple-400'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Proceed */}
                        <button
                            onClick={() => setStep('confirm')}
                            disabled={!canProceed}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Проверить <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddLeadPaymentModal;
