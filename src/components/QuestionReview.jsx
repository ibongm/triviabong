import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

export default function QuestionReview({ history }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!history || history.length === 0) return null;

  const correctCount = history.filter((h) => h.isCorrect).length;

  return (
    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-900/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block">Pregled Odgovora</span>
            <span className="text-xs text-slate-400">
              Točno {correctCount} od {history.length} pitanja
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-semibold">{isOpen ? 'Sakrij' : 'Prikaži'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
          {history.map((item, idx) => {
            const isTimeout = item.selectedOption === 'TIMEOUT' || !item.selectedOption;
            return (
              <div key={idx} className="p-4 space-y-1.5 text-left bg-slate-900/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-xs font-extrabold text-slate-500 shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-200 leading-snug">
                      {item.questionText}
                    </p>
                  </div>
                  {item.isCorrect ? (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Točno
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg shrink-0">
                      <XCircle className="w-3 h-3" /> Netočno
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 pl-5 pt-1">
                  {!item.isCorrect && (
                    <p className="text-rose-300">
                      <span className="text-slate-500">Tvoj odgovor: </span>
                      <span className="font-semibold">{isTimeout ? 'Isteklo vrijeme' : item.selectedOption}</span>
                    </p>
                  )}
                  <p className="text-emerald-400">
                    <span className="text-slate-500">Točan odgovor: </span>
                    <span className="font-semibold">{item.correctOption}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
