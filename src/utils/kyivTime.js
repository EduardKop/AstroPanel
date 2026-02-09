/**
 * Kyiv Timezone Utilities
 * 
 * Все операции с датами в приложении должны использовать эти утилиты
 * для консистентного отображения и хранения времени в Europe/Kyiv
 */

const TIMEZONE = 'Europe/Kyiv';

/**
 * Получить текущую дату в Kyiv как строку "YYYY-MM-DD"
 */
export function getKyivDateString(date = new Date()) {
    return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
}

/**
 * Получить текущее время в Kyiv как строку "HH:MM"
 */
export function getKyivTimeString(date = new Date()) {
    return date.toLocaleTimeString('ru-RU', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Получить дату из ISO строки в формате Kyiv timezone
 * @param {string} isoString - ISO дата из базы данных
 * @returns {string} Дата в формате "DD.MM.YYYY"
 */
export function formatKyivDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', { timeZone: TIMEZONE });
}

/**
 * Получить время из ISO строки в формате Kyiv timezone
 * @param {string} isoString - ISO дата из базы данных
 * @returns {string} Время в формате "HH:MM"
 */
export function formatKyivTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Получить ISO строку для даты в Kyiv timezone
 * Используется при сохранении в БД - конвертирует локальную дату в правильный UTC
 * @param {Date} localDate - Объект Date с выбранной датой
 * @returns {string} ISO строка с корректным UTC временем
 */
export function toKyivISOString(localDate = new Date()) {
    // Получаем компоненты даты в Kyiv timezone
    const kyivDateStr = localDate.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
    const kyivTimeStr = localDate.toLocaleTimeString('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Создаем ISO строку с указанием что это Kyiv время
    // Формат: "2026-02-05T14:30:00" (без Z, чтобы показать что это локальное время)
    return `${kyivDateStr}T${kyivTimeStr}`;
}

/**
 * Извлечь дату (YYYY-MM-DD) из ISO строки интерпретируя её в Kyiv timezone
 * Используется для фильтрации по дате
 * @param {string} isoString - ISO дата из базы данных
 * @returns {string} Дата в формате "YYYY-MM-DD"
 */
export function extractKyivDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
}

/**
 * Получить начало дня в Kyiv timezone как Date объект
 */
export function getKyivStartOfDay(date = new Date()) {
    const kyivDateStr = date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
    return new Date(`${kyivDateStr}T00:00:00`);
}

/**
 * Получить конец дня в Kyiv timezone как Date объект
 */
export function getKyivEndOfDay(date = new Date()) {
    const kyivDateStr = date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
    return new Date(`${kyivDateStr}T23:59:59`);
}

// ============================================================
// RAW UTC TIME FUNCTIONS (для отображения времени из БД без конвертации)
// ============================================================

/**
 * Получить дату из ISO строки в UTC (как в БД)
 * @param {string} isoString - ISO дата из базы данных (например "2026-02-09 00:07:00+00")
 * @returns {string} Дата в формате "DD.MM.YYYY"
 */
export function formatUTCDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
}

/**
 * Получить время из ISO строки в UTC (как в БД)
 * @param {string} isoString - ISO дата из базы данных
 * @returns {string} Время в формате "HH:MM"
 */
export function formatUTCTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Извлечь дату (YYYY-MM-DD) из ISO строки в UTC
 * Используется для фильтрации по дате (сравнение с датой из БД)
 * @param {string} isoString - ISO дата из базы данных
 * @returns {string} Дата в формате "YYYY-MM-DD"
 */
export function extractUTCDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('sv-SE', { timeZone: 'UTC' });
}

export { TIMEZONE };
