import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
    ShieldAlert, Calendar, Copy, DollarSign, ExternalLink,
    AlertTriangle, User, Package, CreditCard, Clock, Check, Globe
} from 'lucide-react';

// Helper to format date for display
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, count, color, description }) => (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${color}`}>
        <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
            <Icon size={20} />
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/50 dark:bg-black/20">
                    {count}
                </span>
            </div>
            <p className="text-sm opacity-75 mt-1">{description}</p>
        </div>
    </div>
);

// Payment Row Component
const PaymentRow = ({ payment, highlightField, managers, paymentOrder }) => {
    const [copied, setCopied] = useState(false);
    const manager = managers?.find(m => m.id === payment.manager_id);
    const managerName = manager?.name || payment.manager || 'Неизвестно';
    const managerTelegram = manager?.telegram_username || null;
    const nickname = payment.crmLink || payment.crm_link || '-';

    const handleCopy = async () => {
        if (nickname && nickname !== '-') {
            await navigator.clipboard.writeText(nickname);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const getHighlightClass = (field) => {
        if (highlightField === field) {
            return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded';
        }
        return '';
    };

    return (
        <div className="grid grid-cols-7 gap-3 items-center py-3 px-4 border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors text-sm">
            {/* Client Nick */}
            <div className="flex items-center gap-1.5 truncate">
                <User size={14} className="text-gray-400 shrink-0" />
                <span className={`truncate ${getHighlightClass('crmLink')}`}>
                    {nickname}
                </span>
                <button
                    onClick={handleCopy}
                    className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Копировать ник"
                >
                    {copied ? (
                        <Check size={12} className="text-green-500" />
                    ) : (
                        <Copy size={12} className="text-gray-400" />
                    )}
                </button>
                {paymentOrder === 1 && (
                    <span className="shrink-0 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded">
                        1-й платёж
                    </span>
                )}
            </div>

            {/* Date */}
            <div className={`flex items-center gap-2 ${getHighlightClass('date')}`}>
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <span>{formatDate(payment.transactionDate || payment.transaction_date)}</span>
            </div>

            {/* Manager */}
            <div className="flex items-center gap-1.5 truncate">
                <User size={14} className="text-blue-400 shrink-0" />
                <span className="truncate">{managerName}</span>
                {managerTelegram && (
                    <>
                        <span className="text-gray-400 text-xs truncate">@{managerTelegram.replace('@', '')}</span>
                        <button
                            onClick={async () => {
                                await navigator.clipboard.writeText('@' + managerTelegram.replace('@', ''));
                            }}
                            className="shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title="Копировать @username"
                        >
                            <Copy size={10} className="text-gray-400" />
                        </button>
                    </>
                )}
            </div>

            {/* Product */}
            <div className={`flex items-center gap-2 ${getHighlightClass('product')}`}>
                <Package size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{payment.product || '-'}</span>
            </div>

            {/* Amount EUR */}
            <div className={`flex items-center gap-2 font-mono ${getHighlightClass('amount')}`}>
                <DollarSign size={14} className="text-green-500 shrink-0" />
                <span>€{(payment.amountEUR || payment.amount_eur || 0).toFixed(2)}</span>
            </div>

            {/* GEO / Country */}
            <div className="flex items-center gap-2">
                <Globe size={14} className="text-purple-400 shrink-0" />
                <span className="truncate">{payment.country || '-'}</span>
            </div>

            {/* Payment Type */}
            <div className="flex items-center gap-2 text-gray-500">
                <CreditCard size={14} className="shrink-0" />
                <span className="truncate">{payment.type || payment.payment_type || '-'}</span>
            </div>
        </div>
    );
};

// Duplicate Group Component
const DuplicateGroup = ({ payments, managers }) => (
    <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl overflow-hidden mb-3">
        <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase">
                <Copy size={12} />
                Дубликаты ({payments.length} записей)
            </div>
        </div>
        {payments.map((p, idx) => (
            <PaymentRow
                key={p.id || idx}
                payment={p}
                highlightField="product"
                managers={managers}
            />
        ))}
    </div>
);

// Empty State Component
const EmptyState = ({ message }) => (
    <div className="text-center py-8 text-gray-400">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={24} className="text-green-500" />
        </div>
        <p className="font-medium">{message}</p>
    </div>
);

const PaymentAuditPage = () => {
    const { payments, managers } = useAppStore();

    // Current date for future payment check (date only, no time)
    const todayDateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Future Date Payments (compare dates only, not time)
    const futurePayments = useMemo(() => {
        return payments.filter(p => {
            const paymentDateStr = (p.transactionDate || p.transaction_date || '').split('T')[0];
            return paymentDateStr > todayDateString;
        });
    }, [payments, todayDateString]);

    // 2. Duplicate Payments (same crm_link + product + amount)
    const duplicateGroups = useMemo(() => {
        const groups = {};

        payments.forEach(p => {
            const crmLink = (p.crmLink || p.crm_link || '').toLowerCase().trim();
            const product = (p.product || '').toLowerCase().trim();
            const amount = (p.amountEUR || p.amount_eur || 0).toFixed(2);

            // Skip if no crm_link
            if (!crmLink) return;

            const key = `${crmLink}|${product}|${amount}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });

        // Only return groups with more than 1 payment
        return Object.values(groups).filter(g => g.length > 1);
    }, [payments]);

    // Build a map of payment order per client (for Calendar discount logic)
    const paymentOrderMap = useMemo(() => {
        const clientPaymentCounts = {};
        const sortedPayments = [...payments].sort((a, b) => {
            const dateA = new Date(a.transactionDate || a.transaction_date);
            const dateB = new Date(b.transactionDate || b.transaction_date);
            return dateA - dateB; // Sort by date ascending
        });

        const orderMap = new Map();
        sortedPayments.forEach(p => {
            const crmLink = (p.crmLink || p.crm_link || '').toLowerCase().trim();
            if (!crmLink) return;

            if (!clientPaymentCounts[crmLink]) clientPaymentCounts[crmLink] = 0;
            clientPaymentCounts[crmLink]++;
            orderMap.set(p.id, clientPaymentCounts[crmLink]);
        });
        return orderMap;
    }, [payments]);

    // 3. Anomalous Amounts (< 20 or > 190 EUR)
    // Exception: "Календарь" at €14-15 is OK if it's NOT the first payment (50% discount for returning clients)
    const anomalousPayments = useMemo(() => {
        return payments.filter(p => {
            const amount = p.amountEUR || p.amount_eur || 0;
            const product = (p.product || '').toLowerCase().trim();

            // Check if it's a Calendar product with discounted price (€14-16 covers ~50% discount from €30)
            const isCalendar = product.includes('календарь') || product.includes('calendar');
            const isDiscountedCalendar = isCalendar && amount >= 14 && amount <= 16;

            if (isDiscountedCalendar) {
                // Get the payment order for this payment
                const paymentOrder = paymentOrderMap.get(p.id) || 1;
                // Only flag as suspicious if it's the FIRST payment (should not get discount)
                if (paymentOrder === 1) {
                    return true; // First payment with discount = suspicious
                }
                return false; // 2nd+ payment with discount = OK
            }

            // Standard anomaly check: < 20 or > 190 EUR
            return amount < 20 || amount > 190;
        });
    }, [payments, paymentOrderMap]);

    const totalIssues = futurePayments.length + duplicateGroups.reduce((acc, g) => acc + g.length, 0) + anomalousPayments.length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <ShieldAlert size={24} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Проверка платежей</h1>
                        <p className="text-gray-500 text-sm">Выявление подозрительных записей в базе</p>
                    </div>
                </div>

                {/* Summary Badge */}
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${totalIssues > 0
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                    {totalIssues > 0 ? `${totalIssues} подозрительных записей` : 'Проблем не найдено ✓'}
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-7 gap-3 px-4 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50 dark:bg-[#111] rounded-t-xl border border-b-0 border-gray-200 dark:border-[#222]">
                <span>Клиент</span>
                <span>Дата</span>
                <span>Менеджер</span>
                <span>Продукт</span>
                <span>Сумма (EUR)</span>
                <span>ГЕО</span>
                <span>Тип оплаты</span>
            </div>

            <div className="space-y-8 mt-8">
                {/* Section 1: Future Date Payments */}
                <section>
                    <SectionHeader
                        icon={Clock}
                        title="Платежи с будущей датой"
                        count={futurePayments.length}
                        color="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
                        description="Платежи с датой позже текущей. Возможна ошибка при вводе даты."
                    />
                    <div className="mt-3 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
                        {futurePayments.length > 0 ? (
                            futurePayments.map((p, idx) => (
                                <PaymentRow
                                    key={p.id || idx}
                                    payment={p}
                                    highlightField="date"
                                    managers={managers}
                                />
                            ))
                        ) : (
                            <EmptyState message="Платежей с будущей датой не найдено" />
                        )}
                    </div>
                </section>

                {/* Section 2: Duplicate Payments */}
                <section>
                    <SectionHeader
                        icon={Copy}
                        title="Дубликаты"
                        count={duplicateGroups.reduce((acc, g) => acc + g.length, 0)}
                        color="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                        description="Один клиент купил один и тот же продукт за одинаковую сумму несколько раз. Проверьте на повторное внесение."
                    />
                    <div className="mt-3 space-y-3">
                        {duplicateGroups.length > 0 ? (
                            duplicateGroups.map((group, idx) => (
                                <DuplicateGroup
                                    key={idx}
                                    payments={group}
                                    managers={managers}
                                />
                            ))
                        ) : (
                            <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222]">
                                <EmptyState message="Дубликатов не найдено" />
                            </div>
                        )}
                    </div>
                </section>

                {/* Section 3: Anomalous Amounts */}
                <section>
                    <SectionHeader
                        icon={AlertTriangle}
                        title="Аномальные суммы"
                        count={anomalousPayments.length}
                        color="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30 text-orange-700 dark:text-orange-400"
                        description="Суммы ниже €20 или выше €190 выходят за стандартный диапазон продуктов (€25-€140)."
                    />
                    <div className="mt-3 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#222] overflow-hidden">
                        {anomalousPayments.length > 0 ? (
                            anomalousPayments.map((p, idx) => (
                                <PaymentRow
                                    key={p.id || idx}
                                    payment={p}
                                    highlightField="amount"
                                    managers={managers}
                                    paymentOrder={paymentOrderMap.get(p.id)}
                                />
                            ))
                        ) : (
                            <EmptyState message="Аномальных сумм не найдено" />
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PaymentAuditPage;
