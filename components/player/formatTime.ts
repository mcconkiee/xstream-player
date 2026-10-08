/** `m:ss`/`h:mm:ss` clock for the player timeline; NaN renders as `00:00`. */
export function formatTime(time: number): string {
    if (isNaN(time)) return '00:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Signed offset for the scrub preview: `+45s`, `-2:30`, `+1:02:00`. */
export function formatTimeDelta(delta: number): string {
    const sign = delta < 0 ? '-' : '+';
    const abs = Math.abs(Math.round(delta));
    if (abs < 60) return `${sign}${abs}s`;
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${sign}${h}:${m.toString().padStart(2, '0')}:${ss}` : `${sign}${m}:${ss}`;
}
