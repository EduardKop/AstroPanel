import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import {
    ShieldAlert, Calendar, Copy, DollarSign, ExternalLink,
    AlertTriangle, User, Package, CreditCard, Clock, Check, Globe, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';

// Helper to get role badge styles
const getRoleBadge = (role) => {
    const map = {
        'Sales': { label: 'Sales', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        'SeniorSales': { label: 'Sr.Sales', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        'SalesTaro': { label: 'Taro', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
        'Consultant': { label: 'Consultant', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
        'SeniorSMM': { label: 'Sr.SMM', cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
        'SMM': { label: 'SMM', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
        'Admin': { label: 'Admin', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
        'C-level': { label: 'C-level', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    };
    return map[role] || { label: role, cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' };
};

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
const PaymentRow = ({ payment, highlightField, managers, paymentOrder, onHide, onRestore }) => {
    const [copied, setCopied] = useState(false);
    const manager = managers?.find(m => m.id === payment.manager_id);
    const managerName = manager?.name || payment.manager || 'Неизвестно';
    const managerTelegram = manager?.telegram_username || null;
    const managerRole = manager?.role || null;
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
        <div className={`grid grid-cols-[1.5fr_1fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-3 items-center py-3 px-4 border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors text-sm ${onRestore ? 'opacity-75' : ''}`}>
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
                {managerRole && (() => {
                    const badge = getRoleBadge(managerRole);
                    return (
                        <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${badge.cls}`}>
                            {badge.label}
                        </span>
                    );
                })()}
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

            {/* Actions (Hide/Restore) */}
            {(onHide || onRestore) && (
                <div className="flex justify-end">
                    {onHide && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onHide(); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] rounded-md transition-colors"
                            title="Скрыть из списка (добавить в исключения)"
                        >
                            <EyeOff size={14} />
                        </button>
                    )}
                    {onRestore && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Вернуть в список"
                        >
                            <Eye size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Duplicate Group Component
const DuplicateGroup = ({ payments, managers, onHide }) => (
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
                onHide={onHide ? () => onHide(p.id) : undefined}
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
    const { payments, managers, countries, schedules, auditExceptions, addAuditException, removeAuditException } = useAppStore();
    const [showExceptions, setShowExceptions] = useState(false);

    // 0. Filter out excluded payments
    const excludedPaymentIds = useMemo(() => new Set((auditExceptions || []).map(e => e.payment_id)), [auditExceptions]);

    const visiblePayments = useMemo(() => {
        return payments.filter(p => !excludedPaymentIds.has(p.id));
    }, [payments, excludedPaymentIds]);

    const excludedPaymentsList = useMemo(() => {
        if (!auditExceptions || auditExceptions.length === 0) return [];
        return auditExceptions.map(ex => {
            const p = payments.find(pay => pay.id === ex.payment_id);
            if (!p) return null;
            return { ...p, exceptionId: ex.id, exceptionReason: ex.reason };
        }).filter(Boolean);
    }, [auditExceptions, payments]);

    // Current date for future payment check (date only, no time)
    const todayDateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Future Date Payments (compare dates only, not time)
    const futurePayments = useMemo(() => {
        return visiblePayments.filter(p => {
            const paymentDateStr = (p.transactionDate || p.transaction_date || '').split('T')[0];
            return paymentDateStr > todayDateString;
        });
    }, [payments, todayDateString]);

    // 2. Duplicate Payments (same crm_link + product + amount)
    const duplicateGroups = useMemo(() => {
        const groups = {};

        visiblePayments.forEach(p => {
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
    }, [visiblePayments]);

    // Build a map of payment order per client (for Calendar discount logic)
    const paymentOrderMap = useMemo(() => {
        const clientPaymentCounts = {};
        const sortedPayments = [...visiblePayments].sort((a, b) => {
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
    }, [visiblePayments]);

    // 3. Anomalous Amounts (< 20 or > 190 EUR)
    // Exception: "Календарь" at €14-15 is OK if it's NOT the first payment (50% discount for returning clients)
    const anomalousPayments = useMemo(() => {
        return visiblePayments.filter(p => {
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

            // Standard anomaly check: < 20 or > 200 EUR
            return amount < 20 || amount > 200;
        });
    }, [visiblePayments, paymentOrderMap]);

    // 4. Links in Nickname (Check for http, .com, .ru, etc)
    const linksInNickname = useMemo(() => {
        return visiblePayments.filter(p => {
            const link = (p.crmLink || p.crm_link || '').toLowerCase().trim();
            if (!link) return false;

            // Check for common link indicators
            return link.includes('http') ||
                link.includes('https') ||
                link.includes('.com') ||
                link.includes('.ru') ||
                link.includes('.net') ||
                link.includes('.org') ||
                link.includes('//') ||
                link.includes('t.me/');
        });
    }, [visiblePayments]);

    // --- Traffic: Channels Logic ---
    const { missingChannels, connectedChannels } = useMemo(() => {
        const { countries, channels } = useAppStore.getState();
        if (!countries || !channels) return { missingChannels: [], connectedChannels: [] };

        const channelCountryCodes = new Set(channels.map(ch => (ch.country_code || '').toUpperCase()));

        const missing = [];
        const connected = [];

        countries.forEach(c => {
            if (c.code) {
                if (channelCountryCodes.has(c.code.toUpperCase())) {
                    connected.push({ code: c.code, name: c.name || c.code, flag: c.flag_emoji || '' });
                } else {
                    missing.push({ code: c.code, name: c.name || c.code, flag: c.flag_emoji || '' });
                }
            }
        });

        return { missingChannels: missing, connectedChannels: connected };
    }, [payments]);

    // --- Schedule: Audit Logic ---
    const { duplicateSchedules, missingCoverage, geosWithoutSchedule } = useMemo(() => {
        if (!schedules || !countries || !managers) return { duplicateSchedules: [], missingCoverage: [], geosWithoutSchedule: [] };

        const duplicatesMap = {}; // date|geo -> array of managerIds
        const dateGeoManagers = {}; // date -> Set(geos covered)

        // 1. First Pass: Map all assignments
        schedules.forEach(s => {
            // Filter by Role: Only Sales, SalesTaro, SeniorSales
            const manager = managers.find(m => m.id === s.manager_id);
            if (!manager) return;

            const allowedRoles = ['Sales', 'SalesTaro', 'SeniorSales'];
            if (!allowedRoles.includes(manager.role)) return;

            const date = s.date;
            // Parse multi-geos properly (e.g. "UA,PL")
            const geos = (s.geo_code || '').split(',').map(g => g.trim()).filter(Boolean);

            if (!dateGeoManagers[date]) dateGeoManagers[date] = new Set();

            geos.forEach(geo => {
                const key = `${date}|${geo}`;
                if (!duplicatesMap[key]) duplicatesMap[key] = [];
                duplicatesMap[key].push(s.manager_id);

                dateGeoManagers[date].add(geo);
            });
        });

        // 2. Find Duplicates (Same Day, Same GEO, >1 Manager)
        const duplicates = [];
        Object.entries(duplicatesMap).forEach(([key, managerIds]) => {
            if (managerIds.length > 1) {
                const [date, geo] = key.split('|');
                // Filter out if manager no longer exists or logic requires it? No, raw schedule data is truth.
                const managersInvolved = managerIds.map(id => managers.find(m => m.id === id)?.name || 'Unknown');

                const country = countries?.find(c => c.code === geo);
                const geoName = country?.name || geo;

                duplicates.push({ date, geo, geoName, managers: managersInvolved });
            }
        });

        // 3. Find Missing Coverage
        // We need a range of dates to check. Let's check from Today to +30 days (or end of current month)
        // User implied "in general", but let's stick to future/relevant dates to avoid noise from past.
        // Actually, audit usually implies checking past too, but for schedule it's about future planning mostly.
        // Let's check Current Month.
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const missing = [];
        const requiredGeos = countries.filter(c => c.code && c.is_active).map(c => c.code);
        // Add 'Таро' if it's considered a required role/geo for coverage
        // The user said: "случаи когда на каком либо Гео / таро нет никого"
        // So 'Таро' is treated as a GEO here.
        const allTargets = ['Таро', ...requiredGeos];

        const activeGeosInMonth = new Set();
        // Identify all GEOs that have at least one shift in the current month
        Object.entries(dateGeoManagers).forEach(([dateStr, geosSet]) => {
            // Only consider current month dates for "Active GEOs" determination
            // (Though dateGeoManagers comes from all schedules, we should stick to the same range ideally, 
            // but user request implies "if geo is not in table/graph AT ALL". 
            // Let's assume if it appears ANYWHERE in the loaded schedules it's "Active"?)
            // Actually, let's stick to the current month range we iterate below.

            const d = new Date(dateStr);
            if (d >= startOfMonth && d <= endOfMonth) {
                geosSet.forEach(g => activeGeosInMonth.add(g));
            }
        });

        for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
            // Exclude 1st Month (January) per request
            if (d.getMonth() === 0) continue;

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const coveredGeos = dateGeoManagers[dateStr] || new Set();

            allTargets.forEach(target => {
                // Exclude specific target "1-й месяц" if present in data
                if (target === '1-й месяц') return;

                // SKIP if this GEO has NO schedule at all in this month (it will go to separate table)
                if (!activeGeosInMonth.has(target)) return;

                if (!coveredGeos.has(target)) {
                    const country = countries?.find(c => c.code === target);
                    const geoName = country?.name || target;
                    missing.push({ date: dateStr, geo: target, geoName });
                }
            });
        }

        // 4. Find GEOs without ANY schedule in the current month
        const noSchedule = [];
        allTargets.forEach(target => {
            if (target === '1-й месяц') return;
            if (!activeGeosInMonth.has(target)) {
                const country = countries?.find(c => c.code === target);
                const geoName = country?.name || target;
                noSchedule.push({ geo: target, geoName });
            }
        });

        return {
            duplicateSchedules: duplicates.sort((a, b) => a.date.localeCompare(b.date)),
            missingCoverage: missing.sort((a, b) => a.date.localeCompare(b.date)),
            geosWithoutSchedule: noSchedule.sort((a, b) => a.geo.localeCompare(b.geo))
        };
    }, [schedules, countries, managers]);

    const totalScheduleIssues = duplicateSchedules.length + missingCoverage.length + geosWithoutSchedule.length;

    // Recalculate Total Issues including schedule
    const totalIssues = futurePayments.length + duplicateGroups.reduce((acc, g) => acc + g.length, 0) + anomalousPayments.length + linksInNickname.length + totalScheduleIssues;

    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'sales';

    return (
        <div className="p-4 max-w-[1600px] mx-auto font-sans text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-[#333] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                        <ShieldAlert size={16} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">Проверка ошибок</h1>
                        <p className="text-xs text-gray-500">Административный контроль данных</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-[#1A1A1A] p-0.5 rounded-lg mb-4 w-fit">
                <button
                    onClick={() => navigate('/error-check/sales')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'sales'
                        ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Отдел продаж
                    {totalIssues > 0 && (
                        <span className="px-1.5 py-0.5 rounded rounded-[4px] text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {totalIssues}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => navigate('/error-check/traffic')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'traffic'
                        ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Трафик
                    {missingChannels.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded rounded-[4px] text-[9px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            {missingChannels.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => navigate('/error-check/schedule')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'schedule'
                        ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    График
                    {totalScheduleIssues > 0 && (
                        <span className="px-1.5 py-0.5 rounded rounded-[4px] text-[9px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            {totalScheduleIssues}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab: Отдел продаж */}
            {activeTab === 'sales' && (
                <div className="space-y-6 animate-in fade-in duration-300">

                    {/* Section 1: Future Date Payments */}
                    <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#161616] px-4 py-2 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Платежи с будущей датой</h3>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${futurePayments.length > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>{futurePayments.length}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111]">
                            {futurePayments.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    {futurePayments.map((p, idx) => (
                                        <PaymentRow
                                            key={p.id || idx}
                                            payment={p}
                                            highlightField="date"
                                            managers={managers}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Проблем не обнаружено</div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Links in Nickname (NEW) */}
                    <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#161616] px-4 py-2 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ExternalLink size={14} className="text-gray-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Ссылки в никнейме</h3>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${linksInNickname.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}>{linksInNickname.length}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111]">
                            {linksInNickname.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    {linksInNickname.map((p, idx) => (
                                        <PaymentRow
                                            key={p.id || idx}
                                            payment={p}
                                            highlightField="crmLink"
                                            managers={managers}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Проблем не обнаружено</div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Duplicate Payments */}
                    <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#161616] px-4 py-2 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Copy size={14} className="text-gray-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Дубликаты</h3>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${duplicateGroups.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>{duplicateGroups.reduce((acc, g) => acc + g.length, 0)}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111] p-3 space-y-3">
                            {duplicateGroups.length > 0 ? (
                                duplicateGroups.map((group, idx) => (
                                    <DuplicateGroup
                                        key={idx}
                                        payments={group}
                                        managers={managers}
                                        onHide={(id) => addAuditException(id, 'duplicate')}
                                    />
                                ))
                            ) : (
                                <div className="p-1 text-center text-xs text-gray-400">Дубликатов не найдено</div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Anomalous Amounts */}
                    <div className="border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#161616] px-4 py-2 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-gray-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Аномальные суммы</h3>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${anomalousPayments.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>{anomalousPayments.length}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111]">
                            {anomalousPayments.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    {anomalousPayments.map((p, idx) => (
                                        <PaymentRow
                                            key={p.id || idx}
                                            payment={p}
                                            highlightField="amount"
                                            managers={managers}
                                            paymentOrder={paymentOrderMap.get(p.id)}
                                            onHide={() => addAuditException(p.id, 'anomalous_amount')}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Аномальных сумм не найдено</div>
                            )}
                        </div>
                    </div>

                    {/* EXCEPTIONS SECTION (Bottom of Sales Tab) */}
                    <div className="mt-8 border-t border-gray-200 dark:border-[#333] pt-6">
                        <button
                            onClick={() => setShowExceptions(!showExceptions)}
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors w-full"
                        >
                            {showExceptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            Исключения ({excludedPaymentsList.length})
                        </button>

                        {showExceptions && (
                            <div className="mt-4 border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="bg-gray-100 dark:bg-[#161616] px-4 py-2 border-b border-gray-200 dark:border-[#333]">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Скрытые из проверки</h3>
                                </div>
                                <div className="bg-white dark:bg-[#111]">
                                    {excludedPaymentsList.length > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                            {excludedPaymentsList.map((p, idx) => (
                                                <PaymentRow
                                                    key={p.id || idx}
                                                    payment={p}
                                                    managers={managers}
                                                    highlightField={p.exceptionReason === 'duplicate' ? 'product' : p.exceptionReason === 'future_date' ? 'date' : p.exceptionReason === 'anomalous_amount' ? 'amount' : 'crmLink'}
                                                    onRestore={() => removeAuditException(p.exceptionId)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-gray-400">Нет исключений</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Трафик */}
            {activeTab === 'traffic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">

                    {/* Column 1: Missing Channels */}
                    <div className="border border-orange-200 dark:border-orange-900/30 rounded-lg overflow-hidden h-fit">
                        <div className="bg-orange-50 dark:bg-orange-900/10 px-3 py-2 border-b border-orange-100 dark:border-orange-900/20 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-400 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                Отсутствующие каналы
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-orange-600 px-1.5 rounded">{missingChannels.length}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111]">
                            {missingChannels.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-[#161616]">
                                        <span>Код</span>
                                        <span>Название</span>
                                        <span>Статус</span>
                                    </div>
                                    {missingChannels.map(c => (
                                        <div key={c.code} className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                            <div className="flex items-center gap-2 font-mono text-gray-900 dark:text-white font-bold">
                                                {c.flag} {c.code}
                                            </div>
                                            <div className="text-gray-600 dark:text-gray-400 truncate">{c.name}</div>
                                            <div className="text-orange-600 dark:text-orange-400 text-[10px] font-bold">Не подключено</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Все каналы настроены верно</div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Connected Channels */}
                    <div className="border border-green-200 dark:border-green-900/30 rounded-lg overflow-hidden h-fit">
                        <div className="bg-green-50 dark:bg-green-900/10 px-3 py-2 border-b border-green-100 dark:border-green-900/20 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-green-800 dark:text-green-400 flex items-center gap-2">
                                <Check size={12} />
                                Подключенные каналы
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-green-600 px-1.5 rounded">{connectedChannels.length}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111]">
                            {connectedChannels.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    <div className="grid grid-cols-2 gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-[#161616]">
                                        <span>Код</span>
                                        <span>Название</span>
                                    </div>
                                    {connectedChannels.map(c => (
                                        <div key={c.code} className="grid grid-cols-2 gap-2 px-3 py-1.5 text-xs hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                                            <div className="flex items-center gap-2 font-mono text-gray-900 dark:text-white font-bold">
                                                {c.flag} {c.code}
                                            </div>
                                            <div className="text-gray-600 dark:text-gray-400 truncate">{c.name}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Нет подключенных каналов</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: График (Schedule) */}
            {activeTab === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {/* Column 1: Duplicate Assignments */}
                    <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg overflow-hidden h-fit">
                        <div className="bg-amber-50 dark:bg-amber-900/10 px-3 py-2 border-b border-amber-100 dark:border-amber-900/20 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                <Copy size={12} />
                                Дубликаты (Одно ГЕО на 2+ людях)
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-amber-600 px-1.5 rounded">{duplicateSchedules.length}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111] custom-scrollbar max-h-[600px] overflow-y-auto">
                            {duplicateSchedules.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-[#161616] sticky top-0">
                                        <span>Дата</span>
                                        <span>ГЕО</span>
                                        <span>Менеджеры</span>
                                    </div>
                                    {duplicateSchedules.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-3 gap-2 px-3 py-2 text-xs hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                                            <div className="flex items-center gap-2 font-mono text-gray-900 dark:text-white">
                                                {formatDate(item.date).split(',')[0]}
                                            </div>
                                            <div className="font-bold text-gray-700 dark:text-gray-300">
                                                {item.geo}
                                                <span className="opacity-50 text-[10px] uppercase font-normal ml-1">{item.geoName}</span>
                                            </div>
                                            <div className="text-gray-600 dark:text-gray-400 flex flex-col gap-0.5">
                                                {item.managers.map((m, i) => (
                                                    <span key={i} className="truncate">• {m}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Дубликатов не найдено</div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Missing Coverage */}
                    <div className="border border-red-200 dark:border-red-900/30 rounded-lg overflow-hidden h-fit">
                        <div className="bg-red-50 dark:bg-red-900/10 px-3 py-2 border-b border-red-100 dark:border-red-900/20 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                Пропущенные смены (В активных ГЕО)
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-red-600 px-1.5 rounded">{missingCoverage.length}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111] custom-scrollbar max-h-[600px] overflow-y-auto">
                            {missingCoverage.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    <div className="grid grid-cols-2 gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-[#161616] sticky top-0">
                                        <span>Дата</span>
                                        <span>Отсутствует</span>
                                    </div>
                                    {missingCoverage.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-2 gap-2 px-3 py-2 text-xs hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                            <div className="flex items-center gap-2 font-mono text-gray-900 dark:text-white">
                                                {formatDate(item.date).split(',')[0]}
                                            </div>
                                            <div className="font-bold text-red-600 dark:text-red-400">
                                                {item.geo}
                                                <span className="opacity-70 text-[10px] uppercase font-normal ml-1">{item.geoName}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Смены в активных ГЕО закрыты</div>
                            )}
                        </div>
                    </div>

                    {/* Column 3: GEO Without Schedule */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden h-fit md:col-span-2 lg:col-span-1">
                        <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Globe size={12} />
                                ГЕО без графика (Весь месяц)
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-gray-600 dark:text-gray-400 px-1.5 rounded">{geosWithoutSchedule.length}</span>
                        </div>
                        <div className="bg-white dark:bg-[#111] custom-scrollbar max-h-[600px] overflow-y-auto">
                            {geosWithoutSchedule.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-[#222]">
                                    <div className="grid grid-cols-2 gap-2 px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-[#161616] sticky top-0">
                                        <span>ГЕО</span>
                                        <span>Статус</span>
                                    </div>
                                    {geosWithoutSchedule.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-2 gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-colors">
                                            <div className="font-bold text-gray-700 dark:text-gray-300">
                                                {item.geo}
                                                <span className="opacity-50 text-[10px] uppercase font-normal ml-1">{item.geoName}</span>
                                            </div>
                                            <div className="text-gray-400 italic">Нет данных</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-400">Все ГЕО имеют график</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentAuditPage;
