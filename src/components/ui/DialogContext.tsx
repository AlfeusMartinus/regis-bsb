import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

type DialogType = 'alert' | 'confirm';
type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

interface DialogOptions {
    title?: string;
    message: string;
    severity?: AlertSeverity;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface DialogContextType {
    showAlert: (options: DialogOptions | string) => Promise<void>;
    showConfirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within DialogProvider');
    return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<DialogType>('alert');
    const [options, setOptions] = useState<DialogOptions>({ message: '' });
    const [resolver, setResolver] = useState<{ resolve: (value: any) => void } | null>(null);

    const showAlert = useCallback((opts: DialogOptions | string) => {
        return new Promise<void>((resolve) => {
            const parsedOpts: DialogOptions = typeof opts === 'string' ? { message: opts, severity: 'info' as AlertSeverity } : opts;
            setType('alert');
            setOptions(parsedOpts);
            setResolver({ resolve });
            setIsOpen(true);
        });
    }, []);

    const showConfirm = useCallback((opts: DialogOptions | string) => {
        return new Promise<boolean>((resolve) => {
            const parsedOpts: DialogOptions = typeof opts === 'string' ? { message: opts, severity: 'warning' as AlertSeverity, isDestructive: true } : opts;
            setType('confirm');
            setOptions(parsedOpts);
            setResolver({ resolve });
            setIsOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolver) {
            if (type === 'confirm') resolver.resolve(true);
            else resolver.resolve(undefined);
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolver) {
            if (type === 'confirm') resolver.resolve(false);
            else resolver.resolve(undefined);
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                {type === 'confirm' ? (
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${options.isDestructive !== false ? 'bg-red-100 border-red-200 text-red-600' : 'bg-yellow-100 border-yellow-200 text-yellow-600'}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${options.severity === 'error' ? 'bg-red-100 border-red-200 text-red-600' :
                                        options.severity === 'success' ? 'bg-green-100 border-green-200 text-green-600' :
                                            options.severity === 'warning' ? 'bg-yellow-100 border-yellow-200 text-yellow-600' :
                                                'bg-blue-100 border-blue-200 text-blue-600'
                                        }`}>
                                        {options.severity === 'error' ? <XCircle className="w-5 h-5" /> :
                                            options.severity === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                                options.severity === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                                                    <Info className="w-5 h-5" />}
                                    </div>
                                )}
                                <div className="flex-1 mt-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                        {options.title || (type === 'confirm' ? 'Konfirmasi' : 'Informasi')}
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                                        {options.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-100">
                            {type === 'confirm' && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                >
                                    {options.cancelText || 'Batal'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${type === 'confirm' && options.isDestructive !== false
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-primary hover:bg-primary-dark focus:ring-primary'
                                    }`}
                            >
                                {options.confirmText || (type === 'confirm' ? 'Ya, Lanjutkan' : 'Tutup')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
