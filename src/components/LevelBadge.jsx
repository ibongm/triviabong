import { getLevelTierIndex, getLevelStarCount } from '../utils/leveling';

// Every class string below is written out in full (never built with
// template literals/concatenation) - see categoryKeys.js's COLOR map for
// why: Tailwind's build-time scanner only picks up literal class names.
const TIER_STYLES = [
    {
        borderColor: 'border-amber-700',
        bgGradient: 'from-amber-950 via-amber-900 to-amber-950',
        textColor: 'text-amber-300',
        glowClass: 'shadow-none',
        frameShape: 'rounded-full border-2',
    },
    {
        borderColor: 'border-slate-300',
        bgGradient: 'from-slate-800 via-slate-700 to-slate-900',
        textColor: 'text-slate-100',
        glowClass: 'shadow-sm shadow-slate-400/20',
        frameShape: 'rounded-xl border-2',
    },
    {
        borderColor: 'border-yellow-400',
        bgGradient: 'from-red-950 via-amber-900 to-yellow-950',
        textColor: 'text-yellow-300',
        glowClass: 'shadow-md shadow-yellow-500/30',
        frameShape: 'rounded-lg rotate-45 border-2',
    },
    {
        borderColor: 'border-cyan-400',
        bgGradient: 'from-cyan-950 via-slate-900 to-blue-950',
        textColor: 'text-cyan-200',
        glowClass: 'shadow-lg shadow-cyan-400/40',
        frameShape: 'rounded-2xl border-2',
    },
    {
        borderColor: 'border-red-500',
        bgGradient: 'from-neutral-950 via-red-950 to-black',
        textColor: 'text-red-400',
        glowClass: 'shadow-xl shadow-red-600/50',
        frameShape: 'rounded-sm rotate-45 border-[3px]',
    },
    {
        borderColor: 'border-amber-300',
        bgGradient: 'from-amber-500 via-red-600 to-yellow-400',
        textColor: 'text-white',
        glowClass: 'shadow-2xl shadow-amber-400/80 animate-pulse',
        frameShape: 'rounded-full border-[3px]',
    },
];

const SIZE_CONFIG = {
    micro: { box: 'w-6 h-6', text: 'text-[10px] font-extrabold', starSize: 'w-1.5 h-1.5', starOffset: '-bottom-1', hideStars: true },
    sm: { box: 'w-9 h-9', text: 'text-xs font-bold', starSize: 'w-2 h-2', starOffset: '-bottom-1.5', hideStars: true },
    md: { box: 'w-12 h-12', text: 'text-sm font-black', starSize: 'w-2.5 h-2.5', starOffset: '-bottom-2', hideStars: false },
    lg: { box: 'w-20 h-20', text: 'text-xl font-black tracking-tight', starSize: 'w-3.5 h-3.5', starOffset: '-bottom-3', hideStars: false },
};

// level: numeric player level (unbounded - clamped internally to the
// tier/star art range by getLevelTierIndex/getLevelStarCount).
export const LevelBadge = ({ level, size = 'md', showStars = true, className = '', title }) => {
    const sizeCfg = SIZE_CONFIG[size];
    const tier = TIER_STYLES[getLevelTierIndex(level)];
    const starCount = getLevelStarCount(level);
    const shouldRenderStars = showStars && !sizeCfg.hideStars;
    const displayLevel = Math.max(1, Math.round(level) || 1);

    return (
        <div title={title} className={`relative inline-flex items-center justify-center select-none ${className}`}>
            <div className={`${sizeCfg.box} ${tier.frameShape} ${tier.borderColor} ${tier.glowClass} bg-gradient-to-br ${tier.bgGradient} flex items-center justify-center transition-transform duration-200`}>
                <span className={`${sizeCfg.text} ${tier.textColor} ${tier.frameShape.includes('rotate-45') ? '-rotate-45' : ''} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}>
                    {displayLevel}
                </span>
            </div>
            {shouldRenderStars && (
                <div className={`absolute ${sizeCfg.starOffset} flex items-center justify-center gap-0.5 z-10`}>
                    {Array.from({ length: starCount }).map((_, i) => (
                        <svg key={i} className={`${sizeCfg.starSize} text-yellow-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] fill-current`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LevelBadge;
