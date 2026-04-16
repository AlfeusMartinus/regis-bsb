import React from 'react';
import { clsx } from 'clsx';
import { Clock, Users, CheckCircle, XCircle } from 'lucide-react';

export type SessionKey = 'session1' | 'session2';

export interface SessionInfo {
    key: SessionKey;
    label: string;
    time: string;
    quota: number;
    available: number;
}

interface SessionSelectorProps {
    sessions: SessionInfo[];
    selectedSession: SessionKey | null;
    onSelect: (session: SessionKey) => void;
    disabled?: boolean;
    ticketPrice?: number;
}

const formatIDR = (amount: number) =>
    `Rp ${amount.toLocaleString('id-ID')}`;

export const SessionSelector: React.FC<SessionSelectorProps> = ({
    sessions,
    selectedSession,
    onSelect,
    disabled = false,
    ticketPrice = 35000,
}) => {
    return (
        <div className="flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 bg-primary rounded-full shrink-0" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Pilih Sesi
                </p>
            </div>

            {sessions.map((session) => {
                const isFull      = session.available <= 0;
                const isSelected  = selectedSession === session.key;
                const isClickable = !isFull && !disabled;
                const remaining   = session.available;

                return (
                    <button
                        key={session.key}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && onSelect(session.key)}
                        className={clsx(
                            'w-full text-left rounded-xl border-2 p-4 transition-all duration-200 relative overflow-hidden',
                            isSelected && !isFull
                                ? 'border-primary bg-primary/10 shadow-md shadow-primary/20 scale-[1.01]'
                                : isClickable
                                ? 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01] cursor-pointer'
                                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        )}
                        id={`session-card-${session.key}`}
                        aria-pressed={isSelected}
                        aria-disabled={isFull}
                        aria-label={`${session.label} — ${isFull ? 'Penuh' : `Sisa ${remaining} kursi`}`}
                    >
                        {/* Selection indicator */}
                        {isSelected && !isFull && (
                            <span className="absolute top-3 right-3 text-primary animate-[fadeIn_0.2s_ease-out]">
                                <CheckCircle size={18} />
                            </span>
                        )}

                        {/* Full label */}
                        {isFull && (
                            <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                <XCircle size={12} />
                                Penuh
                            </span>
                        )}

                        {/* Session name */}
                        <p className={clsx(
                            'font-bold text-sm mb-1.5',
                            isSelected && !isFull ? 'text-primary-dark' : isFull ? 'text-gray-400' : 'text-gray-800'
                        )}>
                            {session.label}
                        </p>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                            <Clock size={12} />
                            <span>{session.time}</span>
                        </div>

                        {/* Quota bar */}
                        {!isFull ? (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <Users size={11} />
                                        <span>Sisa <span className={clsx(
                                            'font-bold',
                                            remaining <= 10 ? 'text-orange-600' : 'text-green-600'
                                        )}>{remaining} kursi</span></span>
                                    </span>
                                    <span className="text-slate-400">{session.quota - remaining}/{session.quota} terisi</span>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            'h-full rounded-full transition-all duration-500',
                                            remaining <= 10 ? 'bg-orange-400' : 'bg-primary'
                                        )}
                                        style={{ width: `${((session.quota - remaining) / session.quota) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Slot untuk sesi ini telah habis.</p>
                        )}
                    </button>
                );
            })}

            {/* Order Summary */}
            {selectedSession && (
                <div className="mt-3 p-4 rounded-xl bg-primary/10 border border-primary/30 animate-[fadeIn_0.3s_ease-out]">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ringkasan Pesanan</p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 font-medium">
                            {sessions.find(s => s.key === selectedSession)?.label}
                        </span>
                        <span className="text-sm font-bold text-primary-dark">
                            {formatIDR(ticketPrice)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-primary/20">
                        <span className="text-xs font-bold text-gray-800">Total Pembayaran</span>
                        <span className="text-base font-black text-primary-dark">{formatIDR(ticketPrice)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
