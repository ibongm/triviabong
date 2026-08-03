import { ChevronRight, Medal } from 'lucide-react';
import RekordiBoards from '../RekordiBoards';
import { getCategoryDetails } from '../../utils/categoryDetails';
import { sound } from '../../utils/sound';

// The category picker plus a compact preview of the Rekordi boards.
export default function LobbyScreen({ categoriesList, rekordiData, onSelectCategory, onOpenRekordi }) {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    Izaberi Kategoriju Kvizova
                </h1>
                <p className="text-slate-400 text-sm">
                    Testirajte svoje znanje, skupljajte bodove i penjite se na ljestvicu!
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {categoriesList.map(catKey => {
                    const details = getCategoryDetails(catKey);
                    const IconComponent = details.icon;
                    return (
                        <button
                            key={catKey}
                            onClick={() => onSelectCategory(catKey)}
                            className="flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition-all group shadow-sm hover:shadow-amber-500/5"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-slate-200 capitalize text-sm">{details.label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                        </button>
                    );
                })}
            </div>

            <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Medal className="w-4 h-4 text-amber-400" /> Rekordi
                    </h2>
                    <button
                        onClick={() => { sound.playClick(); onOpenRekordi(); }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        Vidi sve →
                    </button>
                </div>
                <RekordiBoards data={rekordiData} limitPerBoard={3} compact />
            </div>
        </div>
    );
}
