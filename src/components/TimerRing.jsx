const SIZE = 56;
const STROKE_WIDTH = 5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerRing({ timeLeft, totalTime }) {
    const progress = Math.min(1, Math.max(0, timeLeft / totalTime));
    const dashoffset = CIRCUMFERENCE * (1 - progress);
    const urgent = timeLeft <= 4;

    return (
        <div className={`relative shrink-0 ${urgent ? 'animate-pulse' : ''}`} style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} className="-rotate-90">
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    className="stroke-slate-800"
                />
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashoffset}
                    className={`transition-all duration-[900ms] ease-linear ${urgent ? 'stroke-rose-500' : 'stroke-amber-400'}`}
                />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-black tracking-tighter ${urgent ? 'text-rose-500' : 'text-amber-400'}`}>
                {timeLeft}
            </span>
        </div>
    );
}
