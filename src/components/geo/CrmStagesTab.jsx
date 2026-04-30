import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings, X,
  GitBranch, RotateCcw, GitMerge, Save,
} from 'lucide-react';
import AstroLoadingStatus from '../ui/AstroLoadingStatus';

const API_BASE = '/novalumen-api/v1';
const SALES_FINAL = 'Оплачено';
const CRM_LOADING_STEPS = [
  'Загружаем каналы',
  'Загружаем этапы CRM',
  'Считаем клиентов',
  'Строим схему',
];

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const layoutKey = (id) => `crm_layout_v3_${id}`;
const loadLayout = (id) => {
  try { return JSON.parse(localStorage.getItem(layoutKey(id))); } catch { return null; }
};
const saveLayout = (id, l) => {
  try { localStorage.setItem(layoutKey(id), JSON.stringify(l)); } catch {}
};

// ─── Layout helpers ───────────────────────────────────────────────────────────
// Layout object: { rows: Row[], customEdges?: {from,to}[] }
// Row: { type:'single', stageIdx:N }
//    | { type:'fork',   branches: number[][] }  ← each branch = [stageIdx, ...]
//
// customEdges — explicit arrows; if present they override auto-computed edges.
// This allows two-level fan-out: Второе касание→4 branches, Оффер→5 sub-stages.

const buildDefault = (stages) => {
  const byName = {};
  stages.forEach((s, i) => { byName[s.name] = i; });

  const placed = new Set();
  const rows   = [];

  const vtoroeIdx  = byName['Второе касание'];
  const offerIdx   = byName['Отправлен Оффер'];
  const oplaIdx    = byName['Оплачено'];

  if (vtoroeIdx != null && offerIdx != null) {
    // ── Level 1: linear up to and including Второе касание ────────────────
    for (let i = 0; i <= vtoroeIdx; i++) {
      rows.push({ type: 'single', stageIdx: i });
      placed.add(i);
    }

    // ── Level 2: fork from Второе касание ─────────────────────────────────
    // Order: Отправлен Оффер | Контакт | Выявление потребности | Не интересно
    const level2Names = ['Отправлен Оффер', 'Контакт', 'Выявление потребности', 'Не интересно'];
    const level2Branch = [];
    level2Names.forEach((name) => {
      const idx = byName[name];
      if (idx != null && !placed.has(idx)) { level2Branch.push(idx); placed.add(idx); }
    });
    if (level2Branch.length) {
      rows.push({ type: 'fork', branches: level2Branch.map((i) => [i]) });
    }

    // ── Level 3: fork from Оффер отправлен ────────────────────────────────
    // Order: Игнор после оффера | Обработка возражений | Выставлен счет | Дожим оплаты | Оплачено
    const level3Names = ['Игнор после оффера', 'Обработка возражений', 'Выставлен счет', 'Дожим оплаты', 'Оплачено'];
    const level3Branch = [];
    level3Names.forEach((name) => {
      const idx = byName[name];
      if (idx != null && !placed.has(idx)) { level3Branch.push(idx); placed.add(idx); }
    });
    if (level3Branch.length) {
      // anchorBranchIdx:0 tells LinearView to center this fork under branch 0 (Оффер) of the previous fork
      rows.push({ type: 'fork', branches: level3Branch.map((i) => [i]), anchorBranchIdx: 0 });
    }

    // ── Level 4+: consultant/post-sale stages linear, centered ────────────
    if (oplaIdx != null) {
      for (let i = oplaIdx + 1; i < stages.length; i++) {
        if (!placed.has(i)) { rows.push({ type: 'single', stageIdx: i }); placed.add(i); }
      }
    }
  }

  // Fallback unplaced
  stages.forEach((_, i) => {
    if (!placed.has(i)) rows.push({ type: 'single', stageIdx: i });
  });

  if (!rows.length) return { rows: stages.map((_, i) => ({ type: 'single', stageIdx: i })), customEdges: null };

  // ── Build explicit edges matching the two-level fan-out ──────────────────
  const customEdges = [];
  // Level 1: linear chain
  for (let i = 1; i <= (vtoroeIdx ?? -1); i++) {
    customEdges.push({ from: i - 1, to: i });
  }
  // Второе касание → level2 nodes
  if (vtoroeIdx != null) {
    const level2Idxs = ['Отправлен Оффер', 'Контакт', 'Выявление потребности', 'Не интересно']
      .map((n) => byName[n]).filter((x) => x != null);
    level2Idxs.forEach((to) => customEdges.push({ from: vtoroeIdx, to }));
  }
  // Оффер → level3 nodes
  if (offerIdx != null) {
    const level3Idxs = ['Игнор после оффера', 'Обработка возражений', 'Выставлен счет', 'Дожим оплаты', 'Оплачено']
      .map((n) => byName[n]).filter((x) => x != null);
    level3Idxs.forEach((to) => customEdges.push({ from: offerIdx, to }));
  }
  // Оплачено → consultants linear
  if (oplaIdx != null) {
    for (let i = oplaIdx + 1; i < stages.length; i++) {
      customEdges.push({ from: i - 1, to: i });
    }
  }

  return { rows, customEdges };
};
const rowFirstIdxs = (row) =>
  row.type === 'single' ? [row.stageIdx] : row.branches.map((b) => b[0]).filter((x) => x != null);
const rowLastIdxs = (row) =>
  row.type === 'single'
    ? [row.stageIdx]
    : row.branches.map((b) => b[b.length - 1]).filter((x) => x != null);
const sumLeads = (stages, idxs) => idxs.reduce((s, i) => s + (stages[i]?.leads_count || 0), 0);
const toPct = (from, to) => (from > 0 ? ((to / from) * 100).toFixed(1) : null);

function isValidLayout(layout, stageCount) {
  const rows = Array.isArray(layout) ? layout : layout?.rows;
  if (!Array.isArray(rows) || !rows.length) return false;
  const idxs = rows.flatMap((r) =>
    r.type === 'single' ? [r.stageIdx] : r.branches.flat()
  );
  return idxs.length === stageCount && idxs.every((i) => typeof i === 'number' && i >= 0 && i < stageCount);
}

// ─── Linear Stage Card ────────────────────────────────────────────────────────
function LinearCard({ stage, stageNumber, isFinal, isConsultant, compact = false }) {
  const cardCls = isConsultant
    ? 'bg-violet-50 dark:bg-violet-950/25 border-violet-200 dark:border-violet-800/50'
    : isFinal
    ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-700/60'
    : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2e2e2e]';
  const numCls = isConsultant ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500';
  const nameCls = isConsultant
    ? 'text-violet-700 dark:text-violet-300'
    : isFinal
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-gray-900 dark:text-white';
  const countCls =
    stage.leads_count > 0
      ? isConsultant
        ? 'text-violet-600 dark:text-violet-400'
        : 'text-gray-900 dark:text-white'
      : 'text-gray-300 dark:text-[#333]';

  return (
    <div className={`rounded-lg border shadow-sm ${cardCls} ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
      <div className={`text-[9px] font-semibold uppercase tracking-wider ${numCls}`}>
        #{stageNumber}
      </div>
      <div className={`font-bold leading-snug mb-1 ${compact ? 'text-[11px]' : 'text-[12px]'} ${nameCls}`}>
        {stage.name}
        {isFinal && (
          <span className="ml-1 inline-block text-[8px] font-bold px-1 py-0.5 bg-emerald-500 text-white rounded-full align-middle leading-none">
            ✓
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-400 dark:text-gray-500">Leads</span>
        <span className={`font-black leading-none ${compact ? 'text-[13px]' : 'text-[15px]'} ${countCls}`}>
          {stage.leads_count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Tree Card (used in LinearView tree display) ──────────────────────────────
function TreeCard({ stage, stageNumber, isFinal, isConsultant }) {
  const bg = isConsultant
    ? 'bg-[#1a1030] border-violet-700/50'
    : isFinal
    ? 'bg-[#0d1f14] border-emerald-600/60'
    : 'bg-[#161b22] border-[#30363d]';
  const numCls = isConsultant ? 'text-violet-500' : 'text-gray-500';
  const nameCls = isConsultant ? 'text-violet-200' : isFinal ? 'text-emerald-300' : 'text-gray-100';
  const countCls = isConsultant ? 'text-violet-300' : isFinal ? 'text-emerald-300' : 'text-white';
  return (
    <div className={`rounded-xl border shadow-lg px-3 py-2.5 ${bg}`}>
      <div className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${numCls}`}>#{stageNumber}</div>
      <div className={`text-[12px] font-bold leading-snug mb-2 ${nameCls}`}>
        {stage.name}
        {isFinal && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-black align-middle">✓</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-500">Leads</span>
        <span className={`text-[17px] font-black leading-none ${countCls}`}>
          {stage.leads_count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Tree View (SVG arrows + conversion badges) ───────────────────────────────
function LinearView({ stages, layout, consultantSet, salesFinalIdx }) {
  const containerRef = useRef(null);
  const [canvasW, setCanvasW] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCanvasW(e.contentRect.width));
    ro.observe(el);
    setCanvasW(el.getBoundingClientRect().width || 800);
    return () => ro.disconnect();
  }, []);

  const CARD_W = 190;
  const CARD_H = 88;
  const H_GAP  = 24;
  const V_GAP  = 80;

  // Support both old array format and new {rows, customEdges} format
  const rows = Array.isArray(layout) ? layout : (layout?.rows ?? []);
  const customEdges = Array.isArray(layout) ? null : (layout?.customEdges ?? null);

  // ── Compute node positions ─────────────────────────────────────────────────
  const nodePos = {}; // stageIdx → { x, y }
  let curY = 16;
  const cx = canvasW / 2;
  let consultantDividerY = null;

  for (const row of rows) {
    const rowIdxs = row.type === 'single' ? [row.stageIdx] : row.branches.flat();
    if (consultantDividerY === null && rowIdxs.some((i) => consultantSet.has(i))) {
      consultantDividerY = curY - V_GAP / 2;
    }

    if (row.type === 'single') {
      nodePos[row.stageIdx] = { x: cx - CARD_W / 2, y: curY };
      curY += CARD_H + V_GAP;
    } else {
      const N = row.branches.length;
      const totalW = N * CARD_W + (N - 1) * H_GAP;
      // anchorBranchIdx: center this fork under a specific branch of the previous fork row
      let startX;
      if (row.anchorBranchIdx != null) {
        // Find the x-center of the anchor branch node in the previous fork
        const prevForkRow = [...rows].slice(0, rows.indexOf(row)).reverse().find((r) => r.type === 'fork');
        if (prevForkRow && prevForkRow.branches[row.anchorBranchIdx]) {
          const anchorIdx = prevForkRow.branches[row.anchorBranchIdx][0];
          const anchorPos = nodePos[anchorIdx];
          if (anchorPos) {
            // Center the new fork around the anchor node's center
            startX = (anchorPos.x + CARD_W / 2) - totalW / 2;
          }
        }
      }
      if (startX == null) startX = cx - totalW / 2;
      let maxY = curY;
      row.branches.forEach((branch, bi) => {
        const bx = startX + bi * (CARD_W + H_GAP);
        branch.forEach((stageIdx, si) => {
          const ny = curY + si * (CARD_H + V_GAP);
          nodePos[stageIdx] = { x: bx, y: ny };
          maxY = Math.max(maxY, ny + CARD_H);
        });
      });
      curY = maxY + V_GAP;
    }
  }
  const totalH = curY - V_GAP + 24;

  // ── Compute edges ──────────────────────────────────────────────────────────
  // Use customEdges if provided, otherwise auto-compute from rows
  const edges = [];
  if (customEdges) {
    edges.push(...customEdges);
  } else {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      const froms = rowLastIdxs(prev);
      const tos   = rowFirstIdxs(curr);
      if (prev.type === 'single' && curr.type === 'single') {
        edges.push({ from: prev.stageIdx, to: curr.stageIdx });
      } else if (prev.type === 'single') {
        tos.forEach((to) => edges.push({ from: prev.stageIdx, to }));
      } else if (curr.type === 'single') {
        froms.forEach((from) => edges.push({ from, to: curr.stageIdx }));
      } else {
        froms.forEach((from) => tos.forEach((to) => edges.push({ from, to })));
      }
    }
    for (const row of rows) {
      if (row.type === 'fork') {
        row.branches.forEach((branch) => {
          for (let si = 1; si < branch.length; si++) {
            edges.push({ from: branch[si - 1], to: branch[si] });
          }
        });
      }
    }
  }

  const svgW = Math.max(canvasW, 600);

  return (
    <div ref={containerRef} className="w-full pb-8 overflow-x-auto">
      <div style={{ position: 'relative', width: svgW, height: totalH }}>

        {/* Consultant section separator */}
        {consultantDividerY !== null && (
          <div style={{ position: 'absolute', top: consultantDividerY, left: 0, right: 0, zIndex: 1 }}
            className="flex items-center gap-3 px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <span className="px-3 py-1 rounded-full bg-violet-950/50 border border-violet-700/50 text-[9px] font-bold text-violet-400 uppercase tracking-wider whitespace-nowrap">
              Отдел консультантов ↓
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          </div>
        )}

        {/* SVG arrows */}
        <svg width={svgW} height={totalH}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <defs>
            <marker id="tv-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 z" fill="#4b5563" />
            </marker>
            <marker id="tv-arr-v" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 z" fill="#7c3aed" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const fp = nodePos[edge.from];
            const tp = nodePos[edge.to];
            if (!fp || !tp) return null;
            const x1 = fp.x + CARD_W / 2;
            const y1 = fp.y + CARD_H;
            const x2 = tp.x + CARD_W / 2;
            const y2 = tp.y;
            const isV = consultantSet.has(edge.to);
            const stroke = isV ? '#6d28d9' : '#374151';
            const marker = isV ? 'url(#tv-arr-v)' : 'url(#tv-arr)';
            const cp = (y2 - y1) * 0.42;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const pct = toPct(stages[edge.from]?.leads_count, stages[edge.to]?.leads_count);
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${x1},${y1 + cp} ${x2},${y2 - cp} ${x2},${y2}`}
                  fill="none" stroke={stroke} strokeWidth="1.5" markerEnd={marker}
                />
                {pct !== null && (
                  <g transform={`translate(${mx},${my})`}>
                    <rect x="-20" y="-10" width="40" height="20" rx="10"
                      fill="#111827" stroke={stroke} strokeWidth="1.2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="9.5" fontWeight="700"
                      fill={isV ? '#a78bfa' : '#9ca3af'} fontFamily="system-ui,sans-serif">
                      {pct}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Cards */}
        {Object.entries(nodePos).map(([idxStr, pos]) => {
          const idx = Number(idxStr);
          const stage = stages[idx];
          if (!stage) return null;
          return (
            <div key={idx} style={{ position: 'absolute', left: pos.x, top: pos.y, width: CARD_W, zIndex: 2 }}>
              <TreeCard
                stage={stage}
                stageNumber={idx + 1}
                isFinal={idx === salesFinalIdx}
                isConsultant={consultantSet.has(idx)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grid View (drag-to-connect) ──────────────────────────────────────────────
function GridView({ stages, consultantSet, salesFinalIdx }) {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [customConv, setCustomConv] = useState(null);

  const handleDragStart = (idx) => { setDragFrom(idx); setDragTarget(null); setCustomConv(null); };
  const handleDrop = (idx) => {
    if (dragFrom === null || dragFrom === idx) { setDragFrom(null); setDragTarget(null); return; }
    const from = stages[dragFrom];
    const to = stages[idx];
    if (from?.leads_count > 0) setCustomConv({ from: dragFrom, to: idx, value: toPct(from.leads_count, to.leads_count) });
    setDragFrom(null); setDragTarget(null);
  };

  const customFrom = customConv != null ? stages[customConv.from] : null;
  const customTo   = customConv != null ? stages[customConv.to]   : null;

  return (
    <div>
      {customConv && customFrom && customTo && (
        <div className="mb-4 flex items-center gap-3 bg-blue-900/40 border border-blue-600/40 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-xs font-semibold text-blue-200">{customFrom.name}</span>
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none"><path d="M0 6H22M22 6L16 1M22 6L16 11" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-xs font-semibold text-blue-200">{customTo.name}</span>
          <span className="text-[20px] font-black text-white leading-none ml-2">{customConv.value}%</span>
          <span className="text-[10px] text-blue-300 font-bold ml-1">({customFrom.leads_count.toLocaleString()} → {customTo.leads_count.toLocaleString()})</span>
          <button onClick={() => setCustomConv(null)} className="ml-auto text-[10px] font-bold text-blue-300 hover:text-white border border-blue-600/50 rounded px-2 py-1 transition-colors">Сбросить</button>
        </div>
      )}
      {!customConv && (
        <div className="mb-3 flex items-center gap-2 text-[11px] text-gray-400">
          <GitMerge size={13} className="shrink-0" />
          <span>Перетащи карточку на другую, чтобы увидеть конверсию между любыми двумя этапами.</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const isConsultant = consultantSet.has(idx);
          const isFinal = idx === salesFinalIdx;
          const isSel = dragFrom === idx;
          const isTgt = dragTarget === idx;
          const borderCls = isConsultant
            ? 'border-violet-300 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-950/25'
            : isFinal
            ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/25'
            : 'border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1a1a1a]';
          return (
            <div
              key={`${stage.name}-${idx}`}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); handleDragStart(idx); }}
              onDragOver={(e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== idx) setDragTarget(idx); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
              className={[
                'select-none cursor-grab active:cursor-grabbing rounded-xl border transition-all duration-150 p-3 flex flex-col gap-1',
                borderCls,
                isSel ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                isTgt ? 'ring-2 ring-emerald-400 ring-offset-1 scale-[1.03]' : '',
                stage.leads_count === 0 ? 'opacity-40' : '',
              ].join(' ')}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${isConsultant ? 'text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                Stage {idx + 1}
              </div>
              <div className={`text-[12px] font-bold leading-tight min-h-[32px] ${isConsultant ? 'text-violet-700 dark:text-violet-300' : isFinal ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                {stage.name}
                {isFinal && <span className="ml-1 text-[8px] font-bold px-1 py-0.5 bg-emerald-500 text-white rounded-full align-middle leading-none">✓</span>}
                {isConsultant && <span className="ml-1 text-[8px] font-bold px-1 py-0.5 bg-violet-500 text-white rounded-full align-middle leading-none">К</span>}
              </div>
              <div className="mt-auto flex items-end justify-between">
                <span className={`text-[18px] font-black leading-none ${stage.leads_count > 0 ? (isConsultant ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white') : 'text-gray-300 dark:text-[#333]'}`}>
                  {stage.leads_count.toLocaleString()}
                </span>
                {isSel && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-blue-100">от</span>}
                {isTgt && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-emerald-100">до</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Miro Canvas Modal ────────────────────────────────────────────────────────
const CARD_W = 160;
const CARD_H = 52;
const CARD_GAP_Y = 80;
const CANVAS_W = 2400;
const CANVAS_H = 2400;

function buildInitialNodes(stages) {
  const cx = CANVAS_W / 2 - CARD_W / 2;
  return stages.map((stage, i) => ({
    id: i,
    x: cx,
    y: 60 + i * (CARD_H + CARD_GAP_Y),
  }));
}

function buildInitialEdges(stages) {
  return stages.slice(1).map((_, i) => ({ from: i, to: i + 1 }));
}

// Derive layout (single/fork) from edges
function deriveLayout(nodes, edges, stageCount) {
  // Build adjacency: from -> [to, ...]
  const adj = {};
  for (let i = 0; i < stageCount; i++) adj[i] = [];
  for (const e of edges) {
    if (adj[e.from]) adj[e.from].push(e.to);
    else adj[e.from] = [e.to];
  }

  // Simple topological walk: group nodes that share a parent into forks
  const visited = new Set();
  const result = [];

  // Find roots (nodes with no incoming edge)
  const hasIncoming = new Set(edges.map((e) => e.to));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id)).sort((a, b) => a.y - b.y);

  const visit = (ids) => {
    if (!ids.length) return;
    // All same? single
    const unvisited = ids.filter((id) => !visited.has(id));
    if (!unvisited.length) return;
    unvisited.forEach((id) => visited.add(id));

    if (unvisited.length === 1) {
      result.push({ type: 'single', stageIdx: unvisited[0] });
      const nexts = adj[unvisited[0]] || [];
      if (nexts.length === 1) visit(nexts);
      else if (nexts.length > 1) {
        // Fork
        result.push({ type: 'fork', branches: nexts.map((n) => [n]) });
        nexts.forEach((id) => visited.add(id));
        // Gather next of all fork branches
        const afterFork = [...new Set(nexts.flatMap((n) => adj[n] || []))];
        if (afterFork.length) visit(afterFork);
      }
    } else {
      result.push({ type: 'fork', branches: unvisited.map((id) => [id]) });
      const nexts = [...new Set(unvisited.flatMap((id) => adj[id] || []))];
      if (nexts.length) visit(nexts);
    }
  };

  visit(roots.map((r) => r.id));

  // Add any remaining stages as singles
  for (let i = 0; i < stageCount; i++) {
    if (!visited.has(i)) result.push({ type: 'single', stageIdx: i });
  }

  return result;
}

function MiroModal({ stages, layout, onLayoutChange, onClose, consultantSet, salesFinalIdx }) {
  const layoutRows = Array.isArray(layout) ? layout : (layout?.rows ?? []);
  const layoutCustomEdges = Array.isArray(layout) ? null : (layout?.customEdges ?? null);

  // Initialize nodes from existing layout
  const initNodes = useMemo(() => {
    const cx = CANVAS_W / 2 - CARD_W / 2;
    let y = 60;
    const nodes = [];
    for (const row of layoutRows) {
      if (row.type === 'single') {
        nodes.push({ id: row.stageIdx, x: cx, y });
        y += CARD_H + CARD_GAP_Y;
      } else {
        const totalW = row.branches.length * CARD_W + (row.branches.length - 1) * 32;
        let startX = cx - (totalW - CARD_W) / 2;
        for (const branch of row.branches) {
          let by = y;
          for (const stageIdx of branch) {
            nodes.push({ id: stageIdx, x: startX, y: by });
            by += CARD_H + CARD_GAP_Y;
          }
          startX += CARD_W + 32;
        }
        const maxBranchLen = Math.max(...row.branches.map((b) => b.length));
        y += maxBranchLen * (CARD_H + CARD_GAP_Y);
      }
    }
    return nodes;
  }, []); // only on mount

  const initEdges = useMemo(() => {
    // If customEdges provided by buildDefault — use them directly
    if (layoutCustomEdges) return layoutCustomEdges.map((e) => ({ ...e }));
    const edges = [];
    // Within-branch edges for fork rows
    for (const row of layoutRows) {
      if (row.type === 'fork') {
        for (const branch of row.branches) {
          for (let i = 1; i < branch.length; i++) {
            edges.push({ from: branch[i - 1], to: branch[i] });
          }
        }
      }
    }
    // Between-row edges
    for (let i = 1; i < layoutRows.length; i++) {
      const prev = layoutRows[i - 1];
      const curr = layoutRows[i];
      const froms = rowLastIdxs(prev);
      const tos   = rowFirstIdxs(curr);
      if (prev.type === 'single' && curr.type === 'single') {
        edges.push({ from: froms[0], to: tos[0] });
      } else if (prev.type === 'single') {
        tos.forEach((to) => edges.push({ from: froms[0], to }));
      } else if (curr.type === 'single') {
        froms.forEach((from) => edges.push({ from, to: tos[0] }));
      } else {
        froms.forEach((from) => tos.forEach((to) => edges.push({ from, to })));
      }
    }
    return edges;
  }, []);

  const [nodes, setNodes] = useState(initNodes);
  const [edges, setEdges] = useState(initEdges);
  const [dragging, setDragging] = useState(null);     // nodeId being dragged (for cursor)
  const [connecting, setConnecting] = useState(null); // { fromId, mouseX, mouseY }
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDragging, setPanDragging] = useState(null);
  const [inputMode, setInputMode] = useState('trackpad');
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const connectingRef = useRef(null);
  const zoomRef = useRef(zoom);
  const panRef  = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current  = pan;  }, [pan]);

  const getNode = (id) => nodes.find((n) => n.id === id);

  // ── Node drag via setPointerCapture ─────────────────────────────────────────
  // Per-node drag state stored in a ref (keyed by pointerId)
  const nodeDragRef = useRef({}); // { [pointerId]: { nodeId, offsetX, offsetY } }

  const onNodePointerDown = useCallback((e, nodeId) => {
    if (e.button !== 0) return;
    if (connectingRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const n = nodes.find((nd) => nd.id === nodeId);
    if (!n) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
    const cy = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;
    nodeDragRef.current[e.pointerId] = { nodeId, offsetX: cx - n.x, offsetY: cy - n.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(nodeId);
  }, [nodes]);

  const onNodePointerMove = useCallback((e) => {
    const drag = nodeDragRef.current[e.pointerId];
    if (!drag) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
    const cy = (e.clientY - rect.top  - panRef.current.y) / zoomRef.current;
    setNodes((prev) => prev.map((n) =>
      n.id === drag.nodeId
        ? { ...n, x: Math.max(0, cx - drag.offsetX), y: Math.max(0, cy - drag.offsetY) }
        : n
    ));
  }, []);

  const onNodePointerUp = useCallback((e) => {
    delete nodeDragRef.current[e.pointerId];
    if (Object.keys(nodeDragRef.current).length === 0) setDragging(null);
    // Also handle connect-end if we were connecting
    if (connectingRef.current) {
      handleConnectEndById(e.target?.dataset?.nodeid ? Number(e.target.dataset.nodeid) : -1);
    }
  }, []);

  // ── Canvas pan via setPointerCapture ────────────────────────────────────────
  const canvasDragRef = useRef(null); // { pointerId, startX, startY }

  const onCanvasPointerDown = useCallback((e) => {
    if (connectingRef.current) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      canvasDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX - panRef.current.x,
        startY: e.clientY - panRef.current.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setPanDragging(true);
    }
  }, []);

  const onCanvasPointerMove = useCallback((e) => {
    if (canvasDragRef.current && canvasDragRef.current.pointerId === e.pointerId) {
      setPan({ x: e.clientX - canvasDragRef.current.startX, y: e.clientY - canvasDragRef.current.startY });
    }
    if (connectingRef.current) {
      setConnecting((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    }
  }, []);

  const onCanvasPointerUp = useCallback((e) => {
    if (canvasDragRef.current?.pointerId === e.pointerId) {
      canvasDragRef.current = null;
      setPanDragging(null);
    }
  }, []);

  // ── Arrow connections ────────────────────────────────────────────────────────
  const handleConnectStart = useCallback((e, fromId) => {
    e.stopPropagation();
    e.preventDefault();
    connectingRef.current = { fromId };
    setConnecting({ fromId, mouseX: e.clientX, mouseY: e.clientY });
  }, []);

  const handleConnectEndById = useCallback((toId) => {
    const conn = connectingRef.current;
    if (!conn) return;
    connectingRef.current = null;
    setConnecting(null);
    if (toId === -1 || conn.fromId === toId) return;
    setEdges((prev) => {
      if (prev.some((ed) => ed.from === conn.fromId && ed.to === toId)) return prev;
      return [...prev, { from: conn.fromId, to: toId }];
    });
  }, []);

  const handleConnectEnd = useCallback((e, toId) => {
    e.stopPropagation();
    handleConnectEndById(toId);
  }, [handleConnectEndById]);

  const removeEdge = useCallback((fromId, toId) => {
    setEdges((prev) => prev.filter((e) => !(e.from === fromId && e.to === toId)));
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (inputMode === 'trackpad') {
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((z) => Math.max(0.2, Math.min(2, z + delta)));
      } else {
        // Two-finger scroll = pan
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    } else {
      // Mouse wheel = zoom
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(0.2, Math.min(2, z + delta)));
    }
  }, [inputMode]);

  const handleSave = () => {
    const derivedRows = deriveLayout(nodes, edges, stages.length);
    // Save with customEdges=null so auto-compute from rows is used on next load
    onLayoutChange({ rows: derivedRows, customEdges: null });
    onClose();
  };

  const handleReset = () => {
    setNodes(initNodes);
    setEdges(initEdges);
  };

  // SVG arrow for connecting line preview
  const connectingLineSvg = () => {
    if (!connecting || !canvasRef.current) return null;
    const n = getNode(connecting.fromId);
    if (!n) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = n.x * zoom + pan.x + (CARD_W * zoom) / 2;
    const sy = n.y * zoom + pan.y + CARD_H * zoom;
    const ex = connecting.mouseX - rect.left;
    const ey = connecting.mouseY - rect.top;
    return <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrow-preview)" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <GitBranch size={15} className="text-blue-400" />
          <span className="font-bold text-sm text-white">Редактор воронки</span>
        </div>
        {/* Input mode toggle */}
        <div className="flex bg-gray-800 p-0.5 rounded-lg border border-gray-700 text-[11px] shrink-0">
          <button
            onClick={() => setInputMode('trackpad')}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors ${inputMode === 'trackpad' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >✋ Тачпад</button>
          <button
            onClick={() => setInputMode('mouse')}
            className={`px-2.5 py-1 rounded-md font-bold transition-colors ${inputMode === 'mouse' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >🖱 Мышь</button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))} className="px-1.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">−</button>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="px-1.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">+</button>
          <button onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }} className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 ml-1">Сбросить вид</button>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700 hover:border-orange-500 hover:text-orange-400 transition-colors">
          <RotateCcw size={12} />
          Сбросить
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
          <Save size={12} />
          Сохранить
        </button>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors ml-1">
          <X size={18} />
        </button>
      </div>

      {/* Hints */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-900/80 border-b border-gray-800 text-[10px] text-gray-500 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Тяни карточку — перемещение</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Тяни от синей точки снизу — создать стрелку</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Клик по стрелке — удалить</span>
        {inputMode === 'trackpad'
          ? <span className="ml-auto text-gray-600">Тачпад: два пальца — прокрутка · Ctrl+прокрутка — зум · Alt+drag — панорама</span>
          : <span className="ml-auto text-gray-600">Мышь: скролл — зум · Alt+drag — панорама</span>
        }
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: panDragging ? 'grabbing' : connecting ? 'crosshair' : 'default', background: '#0d0d0d' }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onWheel={handleWheel}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
          <defs>
            <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)}>
              <path d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`} fill="none" stroke="#444" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* SVG layer for edges */}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', zIndex: 1 }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#4b5563" />
            </marker>
            <marker id="arrow-preview" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
            </marker>
          </defs>
          {edges.map((edge, i) => {
            const fn = getNode(edge.from);
            const tn = getNode(edge.to);
            if (!fn || !tn) return null;
            const x1 = fn.x * zoom + pan.x + (CARD_W * zoom) / 2;
            const y1 = fn.y * zoom + pan.y + CARD_H * zoom;
            const x2 = tn.x * zoom + pan.x + (CARD_W * zoom) / 2;
            const y2 = tn.y * zoom + pan.y;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return (
              <g key={i} style={{ pointerEvents: 'all', cursor: 'pointer' }} onClick={() => removeEdge(edge.from, edge.to)}>
                {/* Wider invisible hit area */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="12" />
                <path d={`M${x1},${y1} C${x1},${y1 + 30} ${x2},${y2 - 30} ${x2},${y2}`}
                  fill="none" stroke="#4b5563" strokeWidth="1.5" markerEnd="url(#arrow)" />
                {/* Delete indicator dot on hover */}
                <circle cx={mx} cy={my} r="6" fill="#1f2937" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
                <line x1={mx - 3} y1={my} x2={mx + 3} y2={my} stroke="#ef4444" strokeWidth="1.5" />
              </g>
            );
          })}
          {connectingLineSvg()}
        </svg>

        {/* Nodes — pointerEvents:none so transparent area doesn't block SVG arrow clicks */}
        <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
          {nodes.map((node) => {
            const stage = stages[node.id];
            if (!stage) return null;
            const isConsultant = consultantSet.has(node.id);
            const isFinal = node.id === salesFinalIdx;
            const cardBg = isConsultant
              ? 'bg-violet-950/80 border-violet-700/60'
              : isFinal
              ? 'bg-emerald-950/70 border-emerald-700/60'
              : 'bg-gray-800 border-gray-600';
            const nameCls = isConsultant ? 'text-violet-300' : isFinal ? 'text-emerald-400' : 'text-gray-100';
            const countCls = isConsultant ? 'text-violet-400' : isFinal ? 'text-emerald-400' : 'text-white';

            return (
              <div
                key={node.id}
                className={`rounded-lg border shadow-lg ${cardBg}`}
                style={{
                  position: 'absolute',
                  left: node.x * zoom + pan.x,
                  top: node.y * zoom + pan.y,
                  width: CARD_W * zoom,
                  height: CARD_H * zoom,
                  zIndex: dragging === node.id ? 10 : 3,
                  userSelect: 'none',
                  touchAction: 'none',
                  cursor: connecting ? 'crosshair' : dragging === node.id ? 'grabbing' : 'grab',
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: 'auto',
                  overflow: 'visible',
                }}
                onPointerDown={(e) => onNodePointerDown(e, node.id)}
                onPointerMove={onNodePointerMove}
                onPointerUp={(e) => { onNodePointerUp(e); handleConnectEnd(e, node.id); }}
              >
                <div className="px-2 pt-1 pb-1 flex flex-col h-full" style={{ position: 'relative', zIndex: 1, fontSize: Math.max(8, 11 * zoom) }}>
                  <div style={{ fontSize: Math.max(7, 9 * zoom), color: isConsultant ? '#a78bfa' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                    #{node.id + 1}
                  </div>
                  <div style={{ fontSize: Math.max(8, 11 * zoom), fontWeight: 700, lineHeight: 1.2, color: isConsultant ? '#c4b5fd' : isFinal ? '#6ee7b7' : '#f3f4f6', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {stage.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: Math.max(7, 9 * zoom), color: '#6b7280' }}>Leads</span>
                    <span style={{ fontSize: Math.max(10, 14 * zoom), fontWeight: 900, color: isConsultant ? '#a78bfa' : isFinal ? '#34d399' : '#ffffff', lineHeight: 1 }}>
                      {stage.leads_count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Bottom connection dot — start arrow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: -6 * zoom,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12 * zoom,
                    height: 12 * zoom,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    border: '2px solid #1d4ed8',
                    cursor: 'crosshair',
                    zIndex: 20,
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => { e.stopPropagation(); handleConnectStart(e, node.id); }}
                  onPointerUp={(e) => { e.stopPropagation(); handleConnectEnd(e, node.id); }}
                  title="Тяни чтобы создать связь"
                />
                {/* Top connection dot — accept arrow end */}
                <div
                  style={{
                    position: 'absolute',
                    top: -6 * zoom,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12 * zoom,
                    height: 12 * zoom,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid #059669',
                    cursor: 'crosshair',
                    zIndex: 20,
                    touchAction: 'none',
                  }}
                  onPointerUp={(e) => { e.stopPropagation(); handleConnectEnd(e, node.id); }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmStagesTab({ channels }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('linear');
  const [layout, setLayout] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!channels?.length || selectedChannel) return;
    setSelectedChannel(channels.find((c) => c.country_code === 'UA') || channels[0]);
  }, [channels, selectedChannel]);

  useEffect(() => {
    if (!selectedChannel) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLayout(null);

    fetch(`${API_BASE}/funnels/stage-lead-counts?platform_account_id=${selectedChannel.wazzup_id}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setStages(arr);
        const saved = loadLayout(selectedChannel.wazzup_id);
        setLayout(isValidLayout(saved, arr.length) ? saved : buildDefault(arr));
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedChannel]);

  const { consultantSet, salesFinalIdx } = useMemo(() => {
    const fi = stages.findIndex((s) => s.name === SALES_FINAL);
    const set = new Set(fi >= 0 ? stages.slice(fi + 1).map((_, k) => fi + 1 + k) : []);
    return { consultantSet: set, salesFinalIdx: fi };
  }, [stages]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    if (selectedChannel) saveLayout(selectedChannel.wazzup_id, newLayout);
  };

  const nonZero = stages.filter((s) => s.leads_count > 0).length;

  return (
    <div className="mt-4">
      {/* Country selector */}
      <div className="mb-5 flex flex-wrap gap-1.5 items-center">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">Страна:</span>
        {(channels || []).map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
              selectedChannel?.id === ch.id
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] text-gray-500 hover:border-blue-400 dark:hover:border-[#555]'
            }`}
          >
            {ch.name}
          </button>
        ))}
      </div>

      {/* View toggle + settings button */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex bg-white dark:bg-[#111] p-1 rounded-lg border border-gray-200 dark:border-[#333] shadow-sm">
          <button
            onClick={() => setViewMode('linear')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'linear' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'}`}
          >
            Линейный
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'}`}
          >
            Сетка
          </button>
        </div>
        {viewMode === 'linear' && layout && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors shadow-sm"
          >
            <Settings size={13} />
            Настройки
          </button>
        )}
      </div>

      {/* Summary stats */}
      {!loading && stages.length > 0 && (
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Этапов</div>
            <div className="text-[18px] font-black text-gray-900 dark:text-white leading-none">{stages.length}</div>
          </div>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Активных</div>
            <div className="text-[18px] font-black text-emerald-500 leading-none">{nonZero}</div>
          </div>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Клиентов</div>
            <div className="text-[18px] font-black text-blue-500 leading-none">
              {stages.reduce((s, x) => s + x.leads_count, 0).toLocaleString()}
            </div>
          </div>
          {salesFinalIdx >= 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5">
              <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Финал продаж</div>
              <div className="text-[18px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {stages[salesFinalIdx]?.leads_count.toLocaleString() || 0}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <AstroLoadingStatus
          variant="page"
          title="Загружаем этапы CRM"
          message="Получаем этапы и количество клиентов по выбранному каналу"
          steps={CRM_LOADING_STEPS}
          activeStep={1}
          className="min-h-[360px]"
        />
      ) : error ? (
        <div className="text-center py-12 text-red-400 text-sm">Ошибка: {error}</div>
      ) : stages.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Нет данных</div>
      ) : viewMode === 'linear' && layout ? (
        <LinearView stages={stages} layout={layout} consultantSet={consultantSet} salesFinalIdx={salesFinalIdx} />
      ) : (
        <GridView stages={stages} consultantSet={consultantSet} salesFinalIdx={salesFinalIdx} />
      )}

      {settingsOpen && layout && (
        <MiroModal
          stages={stages}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onClose={() => setSettingsOpen(false)}
          consultantSet={consultantSet}
          salesFinalIdx={salesFinalIdx}
        />
      )}
    </div>
  );
}
