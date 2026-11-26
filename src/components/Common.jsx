import React from 'react';
import { CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================
export const StatusBadge = ({ status }) => {
  if (status === 'Lunas') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        Lunas
      </span>
    );
  }
  if (status === 'Sebagian') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
        Sebagian
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
      Belum Lunas
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B24]/50 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`modal-panel w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-pink-100 overflow-hidden transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 bg-gradient-to-r from-[#FDF2F8] to-white border-b border-pink-100">
          <div>
            <h3 className="text-lg font-bold text-[#1E1B24]">{title}</h3>
            {subtitle && <p className="text-xs text-[#2A2438]/70 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#2A2438]/60 hover:text-[#1E1B24] hover:bg-pink-100/60 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

