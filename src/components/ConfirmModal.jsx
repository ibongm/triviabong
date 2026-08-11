import { AlertTriangle, X } from 'lucide-react';

// Generic player-facing confirm dialog - the first one in the codebase.
// Destructive/admin actions use window.confirm (see AdminPlayers.jsx etc.),
// which is fine for an admin-only surface but would be a jarring native-
// browser-dialog style outlier here, so this mirrors the app's own modal
// chrome (ReportQuestionModal.jsx's card shell) instead.
export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Nastavi', cancelLabel = 'Odustani' }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-sm text-slate-300 mb-5">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
