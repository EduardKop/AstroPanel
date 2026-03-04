import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, ClipboardList } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const TABS = [
    { key: 'report', label: 'P&L', icon: TrendingUp, resource: 'pnl_report' },
    { key: 'data', label: 'Заполнение данных', icon: ClipboardList, resource: 'pnl_data' },
];

const Placeholder = ({ icon: Icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-200 dark:border-[#222] rounded-2xl bg-gray-50 dark:bg-[#0d0d0d] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <Icon size={32} className="text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="text-center">
            <p className="text-gray-900 dark:text-white font-bold text-lg">{title}</p>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
    </div>
);

const PnLPage = () => {
    const navigate = useNavigate();
    const { user, permissions } = useAppStore();
    const [activeTab, setActiveTab] = useState(() => {
        // Default to first tab the user has access to
        const hasAccess = (resource) => {
            if (user?.role === 'C-level') return true;
            return permissions?.[user?.role]?.[resource] === true;
        };
        return TABS.find(t => hasAccess(t.resource))?.key || 'report';
    });

    const hasAccess = (resource) => {
        if (user?.role === 'C-level') return true;
        return permissions?.[user?.role]?.[resource] === true;
    };

    const visibleTabs = TABS.filter(t => hasAccess(t.resource));

    if (visibleTabs.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-gray-400 text-sm">
                ⛔ Нет доступа
            </div>
        );
    }

    const currentTab = TABS.find(t => t.key === activeTab) || visibleTabs[0];

    return (
        <div className="animate-in fade-in zoom-in duration-300 pb-10 font-sans">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">P&amp;L</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Profit &amp; Loss — финансовый отчёт</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-[#1A1A1A] p-0.5 rounded-lg mb-6 w-fit">
                {visibleTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
                                    ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Icon size={13} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-200">
                {currentTab.key === 'report' && (
                    <Placeholder
                        icon={TrendingUp}
                        title="P&L — в разработке"
                        subtitle="Финансовый отчёт появится здесь"
                    />
                )}
                {currentTab.key === 'data' && (
                    <Placeholder
                        icon={ClipboardList}
                        title="Заполнение данных — в разработке"
                        subtitle="Форма ввода данных появится здесь"
                    />
                )}
            </div>
        </div>
    );
};

export default PnLPage;
