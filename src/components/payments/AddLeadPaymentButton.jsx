import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AddLeadPaymentModal from './AddLeadPaymentModal';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../utils/toastEvents';

const AddLeadPaymentButton = () => {
    const { user } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!user || user.role !== 'SeniorSales') return null;

    const handleSuccess = () => {
        showToast('Лид успешно добавлен!', 'success');
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 z-40 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 rounded-full pl-3 pr-4 py-2 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-10 duration-500"
            >
                <Sparkles size={14} strokeWidth={2.5} />
                <span className="font-bold text-xs uppercase tracking-wide">Лид TaroNew</span>
            </button>

            <AddLeadPaymentModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSuccess={handleSuccess}
            />
        </>
    );
};

export default AddLeadPaymentButton;
