import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../utils/toastEvents';
import { X, Check, Instagram, Phone, Calendar, DollarSign, AlertCircle, ChevronRight, Calculator } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '../../services/supabaseClient';
import confetti from 'canvas-confetti';

// --- CONFETTI EFFECTS ---
const fireBasicConfetti = () => {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
};

const fireSideCannons = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

    const frame = () => {
        if (Date.now() > end) return;

        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            startVelocity: 60,
            origin: { x: 0, y: 0.5 },
            colors: colors,
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            startVelocity: 60,
            origin: { x: 1, y: 0.5 },
            colors: colors,
        });

        requestAnimationFrame(frame);
    };

    frame();
};

const fireStars = () => {
    const defaults = {
        spread: 360,
        ticks: 50,
        gravity: 0,
        decay: 0.94,
        startVelocity: 30,
        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    };

    const shoot = () => {
        confetti({
            ...defaults,
            particleCount: 40,
            scalar: 1.2,
            shapes: ['star'],
        });

        confetti({
            ...defaults,
            particleCount: 10,
            scalar: 0.75,
            shapes: ['circle'],
        });
    };

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
};

const triggerConfetti = (todayPaymentsCount) => {
    // Check if animations are disabled
    const animationsDisabled = localStorage.getItem('disableAnimations') === 'true';
    if (animationsDisabled) return;

    if (todayPaymentsCount >= 10) {
        fireStars();
    } else if (todayPaymentsCount >= 8) {
        fireSideCannons();
    } else {
        fireBasicConfetti();
    }
};

const REQUIRED_ROLES = ['Owner', 'Admin', 'Sales', 'SalesTaro', 'Retention', 'Consultant'];

const PRODUCTS = [
    'Лич5', 'Лич1',
    'Финансы1', 'Финансы5',
    'Общий1', 'Общий5',
    'Дети', 'Мандала лич', 'Мандала фин',
    'ТАРО', 'Соляр', 'Календарь',
    'Курс (с куратором)', 'Курс (без куратора)'
];

const TAROT_PRODUCTS = [
    'ТАРО', 'Таро2', 'Таро3', 'Таро4', 'Таро5', 'Таро6'
];

const PAYMENT_METHODS = [
    'Lava', 'JETFEX', 'IBAN', 'Прямые реквизиты'
];

const CURRENCIES = {
    'PL': 'PLN', 'RO': 'RON', 'CZ': 'CZK', 'UA': 'UAH',
    'DE': 'EUR', 'PT': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'US': 'USD', 'KZ': 'KZT', 'TR': 'TRY'
};

const AddPaymentModal = ({ isOpen, onClose, onSuccess }) => {
    const { user, logActivity, kpiRates, countries } = useAppStore();
    const [step, setStep] = useState('form'); // form, confirm
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productTab, setProductTab] = useState('general'); // general, tarot

    // Check if user is SalesTaro (sees all countries) or has multiple geos
    const isSalesTaro = user?.role === 'SalesTaro';
    const userGeoCount = user?.geo?.length || 0;
    const showGeoSelector = isSalesTaro || userGeoCount > 1;

    // Get available countries: SalesTaro sees all, others see only their assigned
    const availableCountries = isSalesTaro
        ? countries
        : countries.filter(c => user?.geo?.includes(c.code));

    // Form State
    const [formData, setFormData] = useState({
        product: '',
        customProduct: '',
        source: 'instagram', // instagram, whatsapp
        link: '',
        nickname: '',
        currency: 'EUR',
        amountLocal: '',
        amountEUR: '',
        paymentMethod: '',
        customMethod: '',
        date: new Date(),
        managerId: user?.id,
        country: 'UA' // Default
    });

    // Reset on open
    useEffect(() => {
        if (isOpen && user) {
            const userCountry = user.geo && user.geo.length > 0 ? user.geo[0] : 'UA';
            setFormData(prev => ({
                ...prev,
                managerId: user.id,
                country: userCountry,
                currency: CURRENCIES[userCountry] || 'EUR',
                date: new Date()
            }));
            setStep('form');
        }
    }, [isOpen, user]);

    // Auto-parse Nickname
    useEffect(() => {
        if (!formData.link) return;
        let nick = '';
        const raw = formData.link;

        if (raw.includes('instagram.com')) {
            const match = raw.match(/instagram\.com\/([^/?#]+)/);
            if (match) nick = match[1];
        } else if (raw.includes('wa.me') || /^\+?\d+$/.test(raw)) {
            // Simple phone extraction or keep as is
            nick = raw.replace('https://wa.me/', '');
        } else {
            // Just use raw if nothing else mimics a known pattern, 
            // but user asked to extract username.
            // If it's just a username entered, keep it.
            nick = raw.replace('@', '').replace('https://t.me/', '');
        }

        setFormData(p => ({ ...p, nickname: nick }));
    }, [formData.link]);

    // Handle Amount Change & Auto-Conversion
    // We assume simple manual rate or 1:1 if EUR. 
    // Ideally we'd have a rate map. For now simple estimation:
    // PL: ~4.3, CZ: ~25, RO: ~5, UA: ~42
    const estimateEUR = (amount, cur) => {
        if (!amount) return '';
        const val = parseFloat(amount);
        if (cur === 'EUR') return val;
        // Simple hardcoded rates for UX estimation
        const RATES = { 'PLN': 4.3, 'RON': 4.97, 'CZK': 25.3, 'UAH': 42.5, 'USD': 1.05, 'KZT': 530, 'TRY': 36 };
        if (RATES[cur]) return (val / RATES[cur]).toFixed(2);
        return val; // Fallback
    };

    const handleLocalAmountChange = (val) => {
        const eur = estimateEUR(val, formData.currency);
        setFormData(p => ({ ...p, amountLocal: val, amountEUR: eur }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                transaction_date: formData.date.toISOString(),
                amount_eur: parseFloat(formData.amountEUR),
                amount_local: parseFloat(formData.amountLocal),
                manager_id: formData.managerId,
                product: formData.product === 'Other' ? formData.customProduct : formData.product,
                country: formData.country,
                payment_type: formData.paymentMethod === 'Other' ? formData.customMethod : formData.paymentMethod,
                crm_link: formData.nickname || formData.link,
                status: 'completed',
                telegram_id: user?.telegram_id || null,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('payments').insert(payload).select();
            if (error) throw error;

            // Count today's payments for this manager to determine confetti type
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: todayCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('manager_id', user.id)
                .gte('transaction_date', today.toISOString());

            // Fire confetti based on payment count
            triggerConfetti(todayCount || 1);

            // Log
            await logActivity({
                action: 'create',
                entity: 'payment',
                entityId: data[0].id,
                details: { ...payload, manager_name: user.name },
                importance: 'high'
            });

            onClose();
            // Trigger Toast via parent or local state if component allows? 
            // Since Modal closes, we can't show toast INSIDE modal.
            // We need a global toast or a callback.
            // For now, I'll assume usage of the global toast I saw in PaymentsTable... Wait, PaymentsTable has local toast.
            // I need to add Toast here or use a context.
            // Given the user request "make modal appear at bottom left", I will render the Toast component HERE but keep it visible after Close?
            // No, if I close the modal component, the toast inside it dies.
            // HACK: I will delay onClose slightly or pass success callback.
            // BETTER: Render toast in THIS component, and delay onClose?
            // Let's rely on a small trick: Close modal visually but keep component mounted? No.
            // The user said "внизу слева сайта".
            // I'll add the Toast component to this file and keep the modal rendered but hidden? No that's messy.
            // I'll add a `onSuccess` prop to the modal and lift state up? Too complex for now.
            // I will modify `App.jsx` to have a global toast? 
            // The prompt says "сделай так же нашу модалку внизу слева".
            // I will import the Toast component into this file. 
            // And I will NOT unmount the component immediately? 
            // Actually, if `isOpen` becomes false, does it unmount? 
            // The parent likely renders `{isOpen && <Modal />}` or `<Modal isOpen={isOpen} />`.
            // If it renders conditionally, toast will die.
            // If it passes isOpen prop, I can keep Toast alive.
            // Let's assume passed as prop. 
            // If not, I will add a temporary Global Toast manager? No.
            // I will try to use the `Toast` component inside the modal portal if possible, or just render it.
            // Let's look at `AddPaymentModal.jsx`. It returns `if (!isOpen) return null;` at start.
            // This means TOAST WILL DIE on close.
            // I MUST change `if (!isOpen) return null;` to return just the Toast if specific state is set?
            // Or change the parent implementation. 
            // Simplest fix: Wait for toast to finish before calling `onClose`? 
            // User might get annoyed.
            // "так же после добавления когда пользователь проверил и нажал чтобы добавлять вместо алерта сделай так же нашу модалку внизу слева сайте Успешно Платеж добавлен если все прошло хорошо"
            // I will remove `if (!isOpen) return null` and handle visibility via CSS/rendering logic.
            // Correct approach: Return `null` only if `!isOpen && !showToast`.

            if (onSuccess) {
                onSuccess();
            } else {
                onClose();
                showToast('Оплата успешно добавлена!', 'success');
            }
        } catch (e) {
            console.error(e);
            showToast('Ошибка при сохранении: ' + e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg">
                {/* Warning Side Panel (Desktop Only) - Positioned Absolutely to the Left */}
                <div className="hidden lg:block absolute right-[105%] top-0 w-[280px]">
                    <div className="bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 text-gray-500 dark:text-gray-400 shadow-2xl">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle size={24} className="text-gray-400 dark:text-gray-500" />
                            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Важно!</h3>
                        </div>
                        <div className="space-y-4 text-sm leading-relaxed font-medium">
                            <p>
                                Все платежи автоматически синхронизируются с банковскими счетами компании и системой Lava.
                            </p>
                            <p>
                                <span className="font-bold text-gray-700 dark:text-gray-300">Категорически запрещено</span> вносить несуществующие или непроверенные оплаты.
                            </p>
                            <p>
                                Любое расхождение нарушает целостность финансовой отчетности и требует значительных ресурсов для аудита и устранения неточностей.
                            </p>
                            <div className="bg-white/30 dark:bg-black/30 rounded-lg p-3 font-bold border border-white/20 shadow-sm text-gray-600 dark:text-gray-300">
                                Будьте внимательны: вносите только подтвержденные поступления.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#151515] flex justify-between items-center shrink-0">
                        <div>
                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Менеджер</div>
                            <div className="font-bold text-lg dark:text-white flex items-center gap-2">
                                {user?.name}
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px]">{user?.role}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Confirm Step */}
                    {step === 'confirm' ? (
                        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check size={24} />
                                </div>
                                <h3 className="text-xl font-bold dark:text-white">Подтверждение</h3>
                                <p className="text-gray-500 text-sm">Проверьте данные перед сохранением</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-xl p-4 space-y-3 border border-gray-100 dark:border-[#333]">
                                <Row label="Продукт" value={formData.product === 'Other' ? formData.customProduct : formData.product} />
                                <Row label="Источник" value={formData.source} icon={formData.source === 'instagram' ? <Instagram size={12} /> : <Phone size={12} />} />
                                <Row label="Никнейм" value={formData.nickname} highlight />
                                <Row label="Ссылка" value={formData.link} className="text-[10px] truncate max-w-[200px]" />
                                <div className="h-px bg-gray-200 dark:bg-[#333] my-2" />
                                <Row label="Сумма (Местная)" value={`${formData.amountLocal} ${formData.currency}`} />
                                <Row label="Сумма (EUR)" value={`€${formData.amountEUR}`} bold />
                                <Row label="Метод" value={formData.paymentMethod === 'Other' ? formData.customMethod : formData.paymentMethod} />
                                <Row label="Дата" value={formData.date.toLocaleString('ru-RU')} />
                                <Row label="Страна" value={formData.country} />
                            </div>

                            <div className="flex gap-3 mt-auto">
                                <button onClick={() => setStep('form')} className="flex-1 py-3 bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Исправить
                                </button>
                                <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isSubmitting ? 'Сохранение...' : 'Отправить'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // FORM STEP
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Source Toggle */}
                            <div className="grid grid-cols-2 bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg">
                                <button
                                    onClick={() => setFormData(p => ({ ...p, source: 'instagram' }))}
                                    className={`py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${formData.source === 'instagram' ? 'bg-white dark:bg-[#333] text-pink-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Instagram size={14} /> Instagram
                                </button>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, source: 'whatsapp' }))}
                                    className={`py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${formData.source === 'whatsapp' ? 'bg-white dark:bg-[#333] text-green-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Phone size={14} /> WhatsApp
                                </button>
                            </div>

                            {/* GEO Selector - shows for SalesTaro or users with multiple geos */}
                            {showGeoSelector && availableCountries.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">🌍 Страна (ГЕО)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableCountries.map(c => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => setFormData(p => ({
                                                    ...p,
                                                    country: c.code,
                                                    currency: CURRENCIES[c.code] || 'EUR'
                                                }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${formData.country === c.code
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                                                    : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-blue-400'
                                                    }`}
                                            >
                                                <span>{c.emoji}</span>
                                                <span>{c.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Link & Nickname */}
                            <div className='bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30'>
                                <label className="text-xs font-bold text-gray-500 block mb-1.5">
                                    {formData.source === 'whatsapp' ? 'ССЫЛКА НА WHATSAPP ПОЛНАЯ (https://wa.me/НомерТелефона)' : 'ССЫЛКА НА ИНСТАГРАМ ПОЛНАЯ'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.link}
                                    onChange={e => setFormData(p => ({ ...p, link: e.target.value }))}
                                    placeholder={formData.source === 'instagram' ? 'https://instagram.com/username' : 'https://wa.me/1234567890'}
                                    className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                {formData.nickname && (
                                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 animate-in slide-in-from-left-2 fade-in">
                                        <Check size={14} /> @{formData.nickname}
                                    </div>
                                )}
                            </div>

                            {/* Product Section with Tabs */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Продукт</label>

                                {/* Tab Toggle */}
                                <div className="grid grid-cols-2 bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg mb-3">
                                    <button
                                        onClick={() => { setProductTab('general'); setFormData(p => ({ ...p, product: '' })); }}
                                        className={`py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${productTab === 'general' ? 'bg-white dark:bg-[#333] text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        🛒 Общие
                                    </button>
                                    <button
                                        onClick={() => { setProductTab('tarot'); setFormData(p => ({ ...p, product: '' })); }}
                                        className={`py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${productTab === 'tarot' ? 'bg-white dark:bg-[#333] text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        🔮 Таро
                                    </button>
                                </div>

                                {/* Product Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    {(productTab === 'tarot' ? TAROT_PRODUCTS : PRODUCTS).map(prod => (
                                        <button
                                            key={prod}
                                            onClick={() => setFormData(p => ({ ...p, product: prod }))}
                                            className={`px-2 py-2 text-[10px] font-bold rounded-lg border transition-all truncate ${formData.product === prod ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}
                                        >
                                            {prod}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setFormData(p => ({ ...p, product: 'Other' }))}
                                        className={`px-2 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.product === 'Other' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300'}`}
                                    >
                                        Другое
                                    </button>
                                </div>
                                {formData.product === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Введите название продукта"
                                        value={formData.customProduct}
                                        onChange={e => setFormData(p => ({ ...p, customProduct: e.target.value }))}
                                        className="mt-2 w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm"
                                    />
                                )}
                            </div>

                            {/* Amounts */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5 uppercase">Сумма ({formData.currency})</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.amountLocal}
                                            onChange={e => handleLocalAmountChange(e.target.value)}
                                            className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg pl-3 pr-8 py-2 text-sm font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5 uppercase">В Евро (€)</label>
                                    <input
                                        type="number"
                                        value={formData.amountEUR}
                                        onChange={e => setFormData(p => ({ ...p, amountEUR: e.target.value }))}
                                        className="w-full bg-gray-100 dark:bg-[#222] border border-transparent rounded-lg px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Date & Method */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5 uppercase">Дата и время</label>
                                    <DatePicker
                                        selected={formData.date}
                                        onChange={date => setFormData(p => ({ ...p, date }))}
                                        showTimeSelect
                                        dateFormat="dd.MM.yyyy HH:mm"
                                        className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5 uppercase">Метод</label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                                        className="w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs cursor-pointer"
                                    >
                                        <option value="">Выберите...</option>
                                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        <option value="Other">Другое</option>
                                    </select>
                                    {formData.paymentMethod === 'Other' && (
                                        <input
                                            type="text"
                                            placeholder="Какой метод?"
                                            value={formData.customMethod}
                                            onChange={e => setFormData(p => ({ ...p, customMethod: e.target.value }))}
                                            className="mt-2 w-full bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-1.5 text-xs"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={onClose} className="flex-1 py-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm">
                                    Отменить
                                </button>
                                <button
                                    onClick={() => {
                                        if (!formData.product || !formData.amountLocal) return showToast('Заполните обязательные поля', 'error');
                                        setStep('confirm');
                                    }}
                                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm"
                                >
                                    Добавить оплату
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Row
const Row = ({ label, value, highlight, bold, icon, className = '' }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 flex items-center gap-1.5">{icon} {label}</span>
        <span className={`${highlight ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded font-mono' : 'text-gray-900 dark:text-white'} ${bold ? 'font-bold' : ''} ${className}`}>
            {value || '-'}
        </span>
    </div>
);

export default AddPaymentModal;
