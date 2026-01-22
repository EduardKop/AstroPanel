
// Utility to dispatch global toast events
export const showToast = (message, type = 'success') => {
    const event = new CustomEvent('show-toast', { detail: { message, type } });
    window.dispatchEvent(event);
};
