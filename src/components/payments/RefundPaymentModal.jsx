import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAppStore } from '../../store/appStore';

const RefundPaymentModal = ({ isOpen, onClose, payment, onSuccess }) => {
    const { user } = useAppStore();
    const [refundType, setRefundType] = useState('full'); // 'full' | 'partial'
    const [amountEUR, setAmountEUR] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && payment) {
            setRefundType('full');
            setAmountEUR(payment.amountEUR || 0);
            setReason('');
            setError('');
        }
    }, [isOpen, payment]);

    if (!isOpen || !payment) return null;

    const maxAmount = payment.amountEUR || 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const refundAmount = refundType === 'full' ? maxAmount : parseFloat(amountEUR);

            if (!refundAmount || refundAmount <= 0) {
                throw new Error('Сумма возврата должна быть больше 0');
            }

            if (refundAmount > maxAmount) {
                throw new Error('Сумма возврата не может превышать сумму платежа');
            }

            // Calculate local amount refund based on original rate
            // If original amountEUR is 0 (edge case), just use 0
            const originalRate = maxAmount > 0 ? (payment.amountLocal / maxAmount) : 0;
            const refundLocal = refundAmount * originalRate;

            const payload = {
                transaction_date: new Date().toISOString(), // Refund happens NOW
                amount_eur: -Math.abs(refundAmount), // Negative
                amount_local: -Math.abs(refundLocal), // Negative
                manager_id: payment.managerId || payment.manager_id, // Keep same manager? Or current user? Usually refunds are attributed to original manager to deduct their stats.
                product: payment.product,
                country: payment.country,
                payment_type: payment.type, // Same method
                crm_link: payment.crm_link,
                status: 'refund', // Explicit refund status
                source: payment.source, // Keep source
                manager_role: payment.managerRole, // Keep role for stats
                client_id: payment.client_id, // If exists
                // Add a marker for refund?
                // We rely on negative amount, but maybe useful to add a comment?
                comment: reason ? `Refund: ${reason}` : 'Refund',
                created_at: new Date().toISOString(),
                created_by: user?.id
            };

            const { error: insertError } = await supabase
                .from('payments')
                .insert(payload);

            if (insertError) throw insertError;

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Refund error:', err);
            setError(err.message || 'Ошибка при создании возврата');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-[#222] flex items-center justify-between bg-gray-50 dark:bg-[#161616]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                            <RotateCcw size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Оформление возврата</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Платеж #{payment.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Amount Info */}
                <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/20 flex justify-between items-center text-xs">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Сумма оплаты:</span>
                    <span className="font-bold text-blue-800 dark:text-blue-200 text-sm">
                        {maxAmount.toFixed(2)} € <span className="text-blue-400 opacity-70 ml-1">({payment.amountLocal?.toLocaleString()} local)</span>
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Refund Type */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setRefundType('full')}
                            className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${refundType === 'full'
                                ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            Полный возврат
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRefundType('partial');
                                setAmountEUR(''); // Reset to allow input
                            }}
                            className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${refundType === 'partial'
                                ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            Частичный
                        </button>
                    </div>

                    {/* Amount Input (Only for Partial) */}
                    {refundType === 'partial' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Сумма возврата (€)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    max={maxAmount}
                                    value={amountEUR}
                                    onChange={(e) => setAmountEUR(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                    placeholder="0.00"
                                    required
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">€</div>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                Максимально доступно: {maxAmount.toFixed(2)} €
                            </p>
                        </div>
                    )}

                    {/* Reason / Comment */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Причина (необязательно)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all h-20 resize-none"
                            placeholder="Укажите причину возврата..."
                        />
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 rounded-lg">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            Это действие создаст отрицательную транзакцию на сумму <strong>{refundType === 'full' ? maxAmount.toFixed(2) : (amountEUR || 0)} €</strong>.
                            Она отразится в статистике менеджера и общем обороте.
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-[#222] bg-gray-50 dark:bg-[#161616] flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2A2A2A] transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (refundType === 'partial' && (!amountEUR || amountEUR <= 0))}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Обработка...' : 'Сделать возврат'}
                        {!isSubmitting && <ArrowRight size={12} />}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default RefundPaymentModal;
