import React, { useEffect, useState } from 'react';
import AstroLoadingStatus from '../components/ui/AstroLoadingStatus';

const previewSteps = [
    'Загружаем справочники',
    'Загружаем оплаты',
    'Считаем трафик',
    'Готовим страницу',
];

const AstroLoadingPreviewPage = () => {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveStep((step) => (step + 1) % previewSteps.length);
        }, 1800);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F7F7F7] px-4 py-8 text-gray-950 dark:bg-[#0A0A0A] dark:text-white sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <header className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-600">
                        Preview
                    </p>
                    <h1 className="text-2xl font-semibold sm:text-3xl">Astro loading status</h1>
                    <p className="max-w-2xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-500">
                        Витрина компонента загрузки. Страницы и реальные данные здесь не подключены.
                    </p>
                </header>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
                    <div className="flex min-h-[560px] items-center justify-center">
                        <AstroLoadingStatus
                            title="Загружаем обзор"
                            message="Получаем оплаты, трафик и справочники для общего дашборда"
                            steps={previewSteps}
                            activeStep={activeStep}
                            variant="card"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                            <p className="mb-4 text-xs font-semibold uppercase text-gray-400 dark:text-gray-600">
                                Inline
                            </p>
                            <AstroLoadingStatus
                                title="Обновляем матрицу"
                                message="Загружаем данные"
                                steps={previewSteps}
                                activeStep={activeStep}
                                variant="inline"
                            />
                        </div>

                        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                            <p className="mb-4 text-xs font-semibold uppercase text-gray-400 dark:text-gray-600">
                                Без точного процента
                            </p>
                            <AstroLoadingStatus
                                title="Загружаем матрицу ГЕО"
                                message="Получаем ГЕО, оплаты и менеджеров за выбранный период"
                                steps={previewSteps}
                                activeStep={activeStep}
                                variant="card"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AstroLoadingPreviewPage;
