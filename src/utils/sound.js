// Web Audio API Synthesizer Helper

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('triviabong_muted') === 'true';
    }

    setMuted(muted) {
        this.muted = !!muted;
        localStorage.setItem('triviabong_muted', this.muted ? 'true' : 'false');
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    // Lazy-initialize context (browsers block sound until user interacts)
    init() {
        if (this.muted) return;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play a short UI click
    playClick() {
        if (this.muted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // Play a 2-tone success chime (Correct Answer)
    playCorrect() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        // F5 to A5 pitch transition
        osc1.frequency.setValueAtTime(698.46, now);
        osc2.frequency.setValueAtTime(880, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.1);

        osc2.start(now + 0.1);
        osc2.stop(now + 0.35);
    }

    // Play a low frequency error buzzer (Wrong Answer)
    playWrong() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Play a brief tick sound (Timer running low)
    playTick() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
    }

    // Rising arpeggio for a secret achievement unlock. Deliberately longer
    // and brighter than playCorrect - it plays under an overlay the player
    // has to dismiss, not under a 1.2s answer transition. Unlike playCorrect
    // (which shares one gain across two notes), each note gets its own gain
    // node so it can have its own attack/decay envelope.
    playFanfare() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        // D5 - F5 - A5 - D6, the last one held.
        const notes = [
            { freq: 587.33, at: 0 },
            { freq: 698.46, at: 0.12 },
            { freq: 880.00, at: 0.24 },
            { freq: 1174.66, at: 0.36 },
        ];

        notes.forEach(({ freq, at }, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + at;
            const duration = i === notes.length - 1 ? 0.9 : 0.3;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            // exponentialRampToValueAtTime can't target or start from exactly
            // 0, hence the near-zero endpoints rather than a clean silence.
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        });
    }
}

export const sound = new SoundEngine();