import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { Globe, AlertTriangle } from 'lucide-react';

// Import Content Components
import ProductsPage from '../knowledge/ProductsPage';
import RulesPage from '../knowledge/RulesPage';
import LearningCenterPage from '../knowledge/LearningCenterPage';
import KPIPage from '../KPIPage';

const PublicSharedPage = () => {
    const { slug } = useParams();
    const { getPublicPage } = useAppStore();
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await getPublicPage(slug);
            if (data) {
                setPageData(data);

                // Fetch Content Data (KPI rates, Products etc.)
                if (data.page_key) {
                    await useAppStore.getState().fetchPublicData(data.page_key);
                }

                // Apply Theme
                const theme = data.settings?.theme || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                // Set Title
                if (data.settings?.title) {
                    document.title = `${data.settings.title} | AstroPanel`;
                }
            } else {
                setError('Страница не найдена или доступ закрыт');
            }
            setIsLoading(false);
        };
        load();
    }, [slug]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !pageData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ошибка доступа</h1>
                <p className="text-gray-500 max-w-sm">{error}</p>
            </div>
        );
    }

    // Render Content based on page_key
    const renderContent = () => {
        const lang = pageData.settings?.lang || 'ru';
        const commonProps = {
            isPublic: true,
            publicSettings: pageData.settings,
            lang: lang
        };

        switch (pageData.page_key) {
            case 'products': return <ProductsPage {...commonProps} />;
            case 'rules': return <RulesPage {...commonProps} />;
            case 'learning': return <LearningCenterPage {...commonProps} />;
            case 'kpi': return <KPIPage {...commonProps} />;
            default: return <div>Unknown Page Type</div>;
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0A0A0A] font-sans text-[13px]">
            {/* Public Header */}
            <header className="h-14 bg-white dark:bg-[#111] border-b border-gray-200 dark:border-[#222] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-[10px]">AP</div>
                    <h1 className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
                        {pageData.settings?.title || 'Knowledge Base'}
                    </h1>
                </div>

                {/* Optional: Branding or Login Link */}
                <a href="/" className="text-xs font-medium text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1.5">
                    <Globe size={14} />
                    <span>AstroPanel</span>
                </a>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {pageData.settings?.description && (
                    <div className="mb-6 p-4 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            {pageData.settings.description}
                        </p>
                    </div>
                )}

                {/* Content Injection */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm min-h-[500px] overflow-hidden">
                    {renderContent()}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-gray-400 text-xs">
                &copy; {new Date().getFullYear()} AstroPanel Knowledge Base
            </footer>
        </div>
    );
};

export default PublicSharedPage;
