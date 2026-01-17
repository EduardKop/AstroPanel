
// --- COMPLIANCE CHECK HELPER ---
const getComplianceStatus = (entry, countries) => {
    if (!entry.clock_in || !entry.geo_code) return { status: 'unknown', label: '—' };

    const country = countries.find(c => c.code === entry.geo_code);
    if (!country || !country.shift_start) return { status: 'unknown', label: '—' };

    // Parse shift start (e.g. "09:00")
    const [startH, startM] = country.shift_start.split(':').map(Number);
    const shiftStartMins = startH * 60 + startM;

    // Parse clock in (local time -> Kyiv time?) 
    // Assuming clock_in is ISO UTC, we need to compare to shift time which is nominally Kyiv time
    // But simplistic check: 
    const clockInDate = new Date(entry.clock_in);

    // Convert clockIn to Kyiv time for comparison
    const kievTimeStr = clockInDate.toLocaleString("en-US", { timeZone: "Europe/Kiev" });
    const kievDate = new Date(kievTimeStr);
    const clockInMins = kievDate.getHours() * 60 + kievDate.getMinutes();

    // Late threshold: 1 min after start? or 5? Let's say 5 mins grace
    const gracePeriod = 5;

    if (clockInMins <= shiftStartMins + gracePeriod) {
        return { status: 'ok', label: '✅ Вовремя', color: 'text-emerald-600' };
    } else {
        const diff = clockInMins - shiftStartMins;
        const hh = Math.floor(diff / 60);
        const mm = diff % 60;
        const diffStr = hh > 0 ? `${hh}ч ${mm}м` : `${mm}м`;
        return { status: 'late', label: `⚠️ Опоздание (${diffStr})`, color: 'text-rose-600' };
    }
};

const ScheduleLogsTab = ({ entries, countries }) => {
    if (!entries || entries.length === 0) {
        return <div className="p-8 text-center text-gray-400">Нет записей за выбранный период</div>;
    }

    return (
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-gray-50 dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-[#333]">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Менеджер</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Дата</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500">GEO</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500">Начало (Киев)</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500">Конец (Киев)</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Статус</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
                    {entries.map(entry => {
                        const compliance = getComplianceStatus(entry, countries);

                        // Time formatting helper
                        const fmtTime = (iso) => {
                            if (!iso) return '—';
                            return new Date(iso).toLocaleTimeString('ru-RU', {
                                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev'
                            });
                        };

                        const fmtDate = (iso) => {
                            return new Date(iso).toLocaleDateString('ru-RU', {
                                day: '2-digit', month: '2-digit'
                            });
                        };

                        return (
                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">
                                    {entry.managers?.name}
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                    {fmtDate(entry.clock_in)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                        {entry.geo_code || '?'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">
                                    {fmtTime(entry.clock_in)}
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">
                                    {fmtTime(entry.clock_out)}
                                </td>
                                <td className={`px-4 py-3 font-medium ${compliance.color}`}>
                                    {compliance.label}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ScheduleLogsTab;
