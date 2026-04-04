const TIMESTAMP_KEY_RE = /(time|date|sent|created|timestamp|datetime|_at)$/i;
const ISO_WITH_TIME_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toEpochMs = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value > 1e12) return value;
        if (value > 1e9) return value * 1000;
        return null;
    }

    if (typeof value !== 'string') return null;
    if (!ISO_WITH_TIME_RE.test(value)) return null;

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const collectTimestamps = (node, acc, keyHint = '', fromArray = false, depth = 0) => {
    if (node == null || depth > 6) return;

    if (Array.isArray(node)) {
        node.forEach((item) => collectTimestamps(item, acc, keyHint, true, depth + 1));
        return;
    }

    if (typeof node === 'object') {
        Object.entries(node).forEach(([key, value]) => {
            collectTimestamps(value, acc, key, false, depth + 1);
        });
        return;
    }

    const epochMs = toEpochMs(node);
    if (epochMs === null) return;

    if (fromArray || TIMESTAMP_KEY_RE.test(keyHint) || (typeof node === 'string' && ISO_WITH_TIME_RE.test(node))) {
        acc.push(epochMs);
    }
};

export const extractMessageTimestamps = (payload) => {
    const timestamps = [];
    collectTimestamps(payload, timestamps);
    return [...new Set(timestamps)].sort((a, b) => a - b);
};

export const buildTimelineFromPayload = (payload, startIso, endIso, bucketMinutes = 2) => {
    const startMs = Date.parse(startIso);
    const endMs = Date.parse(endIso);
    const bucketMs = bucketMinutes * 60 * 1000;

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
        return {
            timestamps: [],
            segments: [],
            activeDurationMs: 0,
            totalDurationMs: 0,
            coveragePct: 0,
            messageCount: 0,
        };
    }

    const timestamps = extractMessageTimestamps(payload).filter((value) => value >= startMs && value <= endMs);
    const totalDurationMs = endMs - startMs;
    const bucketCount = Math.max(1, Math.ceil(totalDurationMs / bucketMs));

    let index = 0;
    let currentSegment = null;
    let activeDurationMs = 0;
    const segments = [];

    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
        const bucketStartMs = startMs + (bucketIndex * bucketMs);
        const bucketEndMs = Math.min(endMs, bucketStartMs + bucketMs);
        const durationMs = bucketEndMs - bucketStartMs;
        const isLastBucket = bucketIndex === bucketCount - 1;

        let messagesCount = 0;
        while (index < timestamps.length && (isLastBucket ? timestamps[index] <= bucketEndMs : timestamps[index] < bucketEndMs)) {
            if (timestamps[index] >= bucketStartMs) messagesCount += 1;
            index += 1;
        }

        const active = messagesCount > 0;
        if (active) activeDurationMs += durationMs;

        if (!currentSegment || currentSegment.active !== active) {
            if (currentSegment) segments.push(currentSegment);
            currentSegment = {
                active,
                startMs: bucketStartMs,
                endMs: bucketEndMs,
                durationMs,
                messagesCount,
            };
        } else {
            currentSegment.endMs = bucketEndMs;
            currentSegment.durationMs += durationMs;
            currentSegment.messagesCount += messagesCount;
        }
    }

    if (currentSegment) segments.push(currentSegment);

    const normalizedSegments = segments.map((segment) => ({
        ...segment,
        startPct: ((segment.startMs - startMs) / totalDurationMs) * 100,
        widthPct: (segment.durationMs / totalDurationMs) * 100,
        centerPct: (((segment.startMs - startMs) + (segment.durationMs / 2)) / totalDurationMs) * 100,
    }));

    return {
        timestamps,
        segments: normalizedSegments,
        activeDurationMs,
        totalDurationMs,
        coveragePct: totalDurationMs > 0 ? (activeDurationMs / totalDurationMs) * 100 : 0,
        messageCount: timestamps.length,
    };
};

export const formatTimelineDuration = (durationMs) => {
    const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} ч ${String(minutes).padStart(2, '0')} мин`;
};

const _timeFormatter = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
});

const _dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
});

export const formatTimelineRange = (startMs, endMs) => {
    const start = new Date(startMs);
    const end = new Date(endMs);
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
        return `${_dateFormatter.format(start)}, ${_timeFormatter.format(start)} - ${_timeFormatter.format(end)}`;
    }

    return `${_dateFormatter.format(start)}, ${_timeFormatter.format(start)} - ${_dateFormatter.format(end)}, ${_timeFormatter.format(end)}`;
};

export const formatCoverageLabel = (coveragePct) => `${Math.round(clamp(coveragePct, 0, 100))}% активности`;

export const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
};

export const clampTooltipPosition = (value) => clamp(value, 8, 92);

/**
 * Compute smart visible window for timelines.
 * Crops from first SMS to last SMS across all managers, with 30min padding rounded to hour.
 * Returns null if no activity or multi-day range (>36h).
 */
export const computeSmartBounds = (timelinePayloads, rangeStartIso, rangeEndIso) => {
    const rangeStartMs = Date.parse(rangeStartIso);
    const rangeEndMs = Date.parse(rangeEndIso);

    if (rangeEndMs - rangeStartMs > 36 * 3600000) return null;

    const pad2 = (n) => String(n).padStart(2, '0');
    const PADDING_MS = 30 * 60000;

    let minTs = Infinity;
    let maxTs = -Infinity;

    for (const payload of Object.values(timelinePayloads)) {
        const timestamps = extractMessageTimestamps(payload);
        for (const ts of timestamps) {
            if (ts >= rangeStartMs && ts <= rangeEndMs) {
                if (ts < minTs) minTs = ts;
                if (ts > maxTs) maxTs = ts;
            }
        }
    }

    // No activity found — don't crop
    if (minTs === Infinity) return null;

    // Pad and round to hours
    let windowStartMs = minTs - PADDING_MS;
    let windowEndMs = maxTs + PADDING_MS;

    windowStartMs = Math.max(rangeStartMs, windowStartMs);
    windowEndMs = Math.min(rangeEndMs, windowEndMs);

    const startDt = new Date(windowStartMs);
    startDt.setMinutes(0, 0, 0);
    windowStartMs = Math.max(rangeStartMs, startDt.getTime());

    const endDt = new Date(windowEndMs);
    if (endDt.getMinutes() > 0 || endDt.getSeconds() > 0) {
        endDt.setHours(endDt.getHours() + 1, 0, 0, 0);
    }
    windowEndMs = Math.min(rangeEndMs, endDt.getTime());

    const toLocalIso = (ms) => {
        const dt = new Date(ms);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
    };

    const toLabel = (ms) => {
        const dt = new Date(ms);
        return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    };

    return {
        startIso: toLocalIso(windowStartMs),
        endIso: toLocalIso(windowEndMs),
        startLabel: toLabel(windowStartMs),
        endLabel: toLabel(windowEndMs),
    };
};
