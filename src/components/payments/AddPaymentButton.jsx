import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import AddPaymentModal from './AddPaymentModal';
import Toast from '../ui/Toast';
import { useAppStore } from '../../store/appStore';

const AddPaymentButton = () => {
    const { user, permissions } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);

    if (!user) return null;

    // Logic: 
    // 1. If user is Owner/Admin -> Always allow
    // 2. Else -> check dynamic permission 'manual_payment'
    const isOwnerOrAdmin = ['Owner', 'Admin'].includes(user.role);
    const hasPermission = permissions?.[user.role]?.manual_payment;

    if (!isOwnerOrAdmin && !hasPermission) return null;

    const handleSuccess = () => {
        setShowToast(true);
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 rounded-full pl-4 pr-5 py-3 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-10 duration-500"
            >
                <Plus size={20} strokeWidth={3} />
                <span className="font-bold text-sm uppercase tracking-wide">Добавить оплату</span>
            </button>

            <AddPaymentModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSuccess={handleSuccess}
            />

            <Toast
                message="Успешно! Платеж добавлен"
                visible={showToast}
                onClose={() => setShowToast(false)}
            />
        </>
    );
};

export default AddPaymentButton;
