import React, { useMemo, useState } from 'react';
import AstroLoadingStatus from '../components/ui/AstroLoadingStatus';

const previewSteps = [
    'Загружаем справочники',
    'Загружаем оплаты',
    'Считаем трафик',
    'Готовим страницу',
];

const AstroLoadingPreviewPage = () => {
    const [progress, setProgress] = useState(42);

    const activeStep = useMemo(() => {
        if (progress < 25) return 0;
        if (progress < 55) return 1;
        if (progress < 85) return 2;
        return 3;
    }, [progress]);

    return (
        <div className="min-h-screen bg-[#F5F5F5] px-4 py-8 text-gray-900 dark:bg-[#0A0A0A] dark:text-white sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <header className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                        Preview
                    </p>
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Astro loading status</h1>
                    <p className="max-w-2xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                        Витрина компонента загрузки. Страницы и реальные данные здесь не подключены.
                    </p>
                </header>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#222] dark:bg-[#111]">
                    <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-400">
                        Прогресс: {progress}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(event) => setProgress(Number(event.target.value))}
                        className="w-full accent-sky-500"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
                    <div className="flex min-h-[560px] items-center justify-center">
                        <AstroLoadingStatus
                            title="Загружаем обзор"
                            message="Получаем оплаты, трафик и справочники для общего дашборда"
                            steps={previewSteps}
                            activeStep={activeStep}
                            progress={progress}
                            variant="card"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#222] dark:bg-[#111]">
                            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-400">
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

                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#222] dark:bg-[#111]">
                            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-400">
                                Без точного процента
                            </p>
                            <AstroLoadingStatus
                                title="Загружаем матрицу ГЕО"
                                message="Получаем ГЕО, оплаты и менеджеров за выбранный период"
                                steps={previewSteps}
                                activeStep={activeStep}
                                variant="card"
                                showSteps={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AstroLoadingPreviewPage;
