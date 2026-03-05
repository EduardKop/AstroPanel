import React, { useState } from 'react';
import { DollarSign, Coins, Copy, Check, Filter, ArrowUpDown, Save, X, Square, CheckSquare } from 'lucide-react';
import Toast from './ui/Toast';
import { formatUTCDate, formatUTCTime } from '../utils/kyivTime';

const FLAGS = {
  UA: '🇺🇦', PL: '🇵🇱', IT: '🇮🇹', HR: '🇭🇷',
  BG: '🇧🇬', CZ: '🇨🇿', RO: '🇷🇴', LT: '🇱🇹',
  TR: '🇹🇷', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪',
  US: '🇺🇸', ES: '🇪🇸', SK: '🇸🇰', HU: '🇭🇺',
  KZ: '🇰🇿', UZ: '🇺🇿', MD: '🇲🇩'
};
const getFlag = (code) => FLAGS[code] || '🏳️';

const getPaymentBadgeStyle = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('lava')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
  if (t.includes('jet') || t.includes('fex')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (t.includes('iban')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
  if (t.includes('req') || t.includes('рек') || t.includes('прям')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
};

const PaymentsTable = ({
  payments,
  loading,
  statusFilter,
  onStatusFilterChange,
  paymentRanks,
  sortField,
  sortOrder,
  onSort,
  isEditMode = false,
  managers = [],
  onPaymentUpdate,
  // Bulk selection props
  selectedIds = new Set(),
  onSelectionChange,
  onSelectAll
}) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [editingRow, setEditingRow] = useState(null); // ID of row being edited
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToastVisible(true);
  };

  const toggleStatusFilter = () => {
    if (!onStatusFilterChange) return;
    if (statusFilter === 'all') onStatusFilterChange('unknown');
    else if (statusFilter === 'unknown') onStatusFilterChange('completed');
    else onStatusFilterChange('all');
  };

  const getStatusLabel = () => {
    if (statusFilter === 'unknown') return 'Статус ⚠️';
    if (statusFilter === 'completed') return 'Статус ✓';
    return <><span>Статус</span><Filter size={10} className="ml-1 inline opacity-50" /></>;
  };

  // Start editing a row
  const startEdit = (payment) => {
    setEditingRow(payment.id);
    setEditData({
      transactionDate: payment.transactionDate?.split('T')[0] || '',
      manager_id: payment.managerId || '',
      country: payment.country || '',
      product: payment.product || '',
      type: payment.type || '',
      crm_link: payment.crm_link || '',
      amountLocal: payment.amountLocal || 0,
      amountEUR: payment.amountEUR || 0
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  // Save changes
  const saveEdit = async (paymentId) => {
    if (!onPaymentUpdate) return;
    setSaving(true);
    const success = await onPaymentUpdate(paymentId, editData);
    setSaving(false);
    if (success) {
      setEditingRow(null);
      setEditData({});
    }
  };

  // Update edit field
  const updateField = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Input styles
  const inputClass = "w-full px-1.5 py-1 text-xs bg-white dark:bg-[#1A1A1A] border border-amber-400 dark:border-amber-500 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 dark:text-white";

  return (
    <>
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg overflow-hidden shadow-sm w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs text-gray-600 dark:text-[#888] whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#161616] font-medium border-b border-gray-200 dark:border-[#333] text-gray-500 dark:text-[#666]">
              <tr>
                {/* Checkbox Column for Bulk Selection */}
                {isEditMode && onSelectionChange && (
                  <th className="px-3 py-3 w-10">
                    <button
                      onClick={() => onSelectAll && onSelectAll(payments)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-[#333] rounded transition-colors"
                      title={selectedIds.size === payments.length ? 'Снять выделение' : 'Выделить все'}
                    >
                      {selectedIds.size > 0 && selectedIds.size === payments.length ? (
                        <CheckSquare size={16} className="text-blue-500" />
                      ) : selectedIds.size > 0 ? (
                        <CheckSquare size={16} className="text-blue-300" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => onSort?.('date')}
                    className={`flex items-center gap-1.5 hover:text-blue-500 transition-colors cursor-pointer group ${sortField === 'date' ? 'text-blue-500' : ''}`}
                    title={sortField === 'date' ? (sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые') : 'Сортировать по дате'}
                  >
                    Дата
                    <ArrowUpDown size={12} className={`opacity-50 group-hover:opacity-100 transition-all ${sortField === 'date' ? 'opacity-100' : ''} ${sortField === 'date' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3">Менеджер</th>
                <th className="px-4 py-3">ГЕО</th>
                <th className="px-4 py-3">Продукт</th>
                <th className="px-4 py-3">Метод</th>
                <th className="px-4 py-3">Контакт</th>
                <th className="px-4 py-3 text-center" title="Какая по счету оплата от клиента">№ Оплаты</th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSort?.('amountLocal')}
                    className={`flex items-center gap-1.5 justify-end hover:text-blue-500 transition-colors cursor-pointer group w-full ${sortField === 'amountLocal' ? 'text-blue-500' : ''}`}
                    title="Сортировать по сумме (Local)"
                  >
                    Сумма (Local)
                    <ArrowUpDown size={12} className={`opacity-50 group-hover:opacity-100 transition-all ${sortField === 'amountLocal' ? 'opacity-100' : ''} ${sortField === 'amountLocal' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSort?.('amountEUR')}
                    className={`flex items-center gap-1.5 justify-end hover:text-blue-500 transition-colors cursor-pointer group w-full ${sortField === 'amountEUR' ? 'text-blue-500' : ''}`}
                    title="Сортировать по сумме (EUR)"
                  >
                    Сумма (EUR)
                    <ArrowUpDown size={12} className={`opacity-50 group-hover:opacity-100 transition-all ${sortField === 'amountEUR' ? 'opacity-100' : ''} ${sortField === 'amountEUR' && sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={toggleStatusFilter}
                    className={`hover:text-blue-500 transition-colors cursor-pointer ${statusFilter !== 'all' ? 'text-blue-500 font-bold' : ''}`}
                    title="Клик для фильтрации по статусу"
                  >
                    {getStatusLabel()}
                  </button>
                </th>
                {isEditMode && <th className="px-4 py-3 text-center">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {loading ? (
                <tr><td colSpan={isEditMode ? "12" : "11"} className="px-4 py-8 text-center">Загрузка...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={isEditMode ? "12" : "11"} className="px-4 py-8 text-center">Нет данных</td></tr>
              ) : (
                payments.map((p) => {
                  const isEditing = editingRow === p.id;
                  const isSelected = selectedIds.has(p.id);

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors group ${isEditing ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                      {/* Checkbox for Bulk Selection */}
                      {isEditMode && onSelectionChange && (
                        <td className="px-3 py-2">
                          <button
                            onClick={() => onSelectionChange(p.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-[#333] rounded transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-blue-500" />
                            ) : (
                              <Square size={16} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-2 font-mono text-[10px] text-gray-400 max-w-[80px] truncate" title={p.id}>
                        #{p.id.slice(0, 8)}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editData.transactionDate}
                            onChange={(e) => updateField('transactionDate', e.target.value)}
                            className={inputClass}
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {formatUTCDate(p.transactionDate)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatUTCTime(p.transactionDate)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select
                            value={editData.manager_id}
                            onChange={(e) => updateField('manager_id', e.target.value)}
                            className={inputClass}
                          >
                            <option value="">-- Выберите --</option>
                            {managers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800 dark:text-gray-200">{p.manager}</span>
                            {(() => {
                              const mgr = managers.find(m => m.name === p.manager || m.id === p.managerId);
                              if (mgr?.telegram_username) {
                                return (
                                  <button
                                    onClick={() => handleCopy('@' + mgr.telegram_username.replace('@', ''))}
                                    className="text-gray-400 hover:text-blue-500 text-[10px] flex items-center gap-0.5 transition-colors"
                                    title="Копировать @username"
                                  >
                                    @{mgr.telegram_username.replace('@', '')}
                                    <Copy size={9} />
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.country}
                            onChange={(e) => updateField('country', e.target.value.toUpperCase())}
                            className={`${inputClass} w-16`}
                            maxLength={2}
                            placeholder="UA"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#333] text-[10px] font-bold text-gray-600 dark:text-gray-300">
                            {getFlag(p.country)} {p.country}
                          </span>
                        )}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.product}
                            onChange={(e) => updateField('product', e.target.value)}
                            className={`${inputClass} w-24`}
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-white font-medium">{p.product}</span>
                        )}
                      </td>

                      {/* Payment Type */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.type}
                            onChange={(e) => updateField('type', e.target.value)}
                            className={`${inputClass} w-20`}
                          />
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPaymentBadgeStyle(p.type)}`}>
                            {p.type || 'Other'}
                          </span>
                        )}
                      </td>

                      {/* Contact / CRM Link */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.crm_link}
                            onChange={(e) => updateField('crm_link', e.target.value)}
                            className={`${inputClass} w-32`}
                            placeholder="@username"
                          />
                        ) : p.crm_link ? (
                          <button
                            onClick={() => handleCopy(p.crm_link)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all font-medium text-[11px] group-hover:shadow-sm ${p.source === 'whatsapp'
                              ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20'
                              : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                              }`}
                          >
                            <span>{p.crm_link.replace('https://', '').replace('instagram.com/', '@').replace('t.me/', '@')}</span>
                            <Copy size={10} strokeWidth={2.5} className="opacity-70" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Rank */}
                      <td className="px-4 py-2 text-center">
                        {(() => {
                          const rank = paymentRanks ? paymentRanks.get(p.id) : null;
                          if (!rank) return <span className="text-gray-300 dark:text-gray-600 text-[10px]">-</span>;
                          return (
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${rank === 1
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500/20'
                              : rank === 2
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 ring-1 ring-purple-500/20'
                                : rank === 3
                                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500/20'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              }`} title={`${rank}-я оплата`}>
                              {rank}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Amount Local */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.amountLocal}
                            onChange={(e) => updateField('amountLocal', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} w-24 text-right`}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1 font-bold text-gray-900 dark:text-white">
                            <Coins size={10} className="text-gray-400" />
                            {(p.amountLocal || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                          </div>
                        )}
                      </td>

                      {/* Amount EUR */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData.amountEUR}
                            onChange={(e) => updateField('amountEUR', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} w-24 text-right`}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1 font-bold text-gray-900 dark:text-white">
                            <DollarSign size={10} className="text-gray-400" />
                            {Number(p.amountEUR).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2 text-right">
                        {p.source === 'unknown' ? (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Контакт не найден в базе лидов">
                            Lead not found
                          </span>
                        ) : (
                          <span className="text-emerald-500 text-[10px] font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {p.status}
                          </span>
                        )}
                      </td>

                      {/* Actions (Edit Mode) */}
                      {isEditMode && (
                        <td className="px-4 py-2 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                                className="p-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                title="Сохранить"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded bg-gray-400 text-white hover:bg-gray-500 transition-colors"
                                title="Отмена"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(p)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
                            >
                              Изменить
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Toast message="Текст скопирован" visible={toastVisible} onClose={() => setToastVisible(false)} />
    </>
  );
};

export default PaymentsTable;