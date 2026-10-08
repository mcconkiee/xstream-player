'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hold ladder: the longer a seek key stays down, the bigger each step. A single
 * tap is always the first rung; holding climbs it the way TV players do.
 */
export const SCRUB_STEP_LADDER: ReadonlyArray<{ afterMs: number; seconds: number }> = [
    { afterMs: 0, seconds: 5 },
    { afterMs: 1000, seconds: 15 },
    { afterMs: 2500, seconds: 30 },
    { afterMs: 4500, seconds: 60 },
    { afterMs: 7000, seconds: 120 },
];

/**
 * Some remotes never flag `event.repeat` and just resend keydown; a press that
 * arrives within this gap of the previous one counts as the same hold.
 */
const HOLD_GAP_MS = 400;
/** Auto-repeat fires 10–30×/s; one step per this interval keeps the preview readable. */
const STEP_INTERVAL_MS = 150;
/** Fallback commit when no keyup arrives (key still down or remote that drops it). */
const IDLE_COMMIT_MS = 1000;
/** Commit shortly after the key is released, so quick taps still accumulate. */
const RELEASE_COMMIT_MS = 450;

export interface ScrubState {
    /** Target position (s) on the displayed timeline. */
    previewTime: number;
    /** Offset from where the scrub started. */
    delta: number;
    /** Size of the last step — tells the user which rung of the ladder they are on. */
    stepSeconds: number;
    direction: 1 | -1;
}

interface UsePlayerScrubOptions {
    /** Current position on the displayed timeline, read when a scrub starts. */
    getCurrentTime: () => number;
    /** Displayed timeline length; non-finite/0 means unbounded. */
    duration: number;
    /** Applies the final position once the user stops scrubbing. */
    onCommit: (time: number) => void;
}

export function stepSecondsForHold(heldMs: number): number {
    let seconds = SCRUB_STEP_LADDER[0].seconds;
    for (const rung of SCRUB_STEP_LADDER) {
        if (heldMs >= rung.afterMs) seconds = rung.seconds;
    }
    return seconds;
}

/**
 * Scrub do player por controle remoto: cada passo move só uma prévia da posição
 * (barra + balão de tempo) e o seek real acontece uma única vez, ao soltar a
 * tecla. Segurar a tecla acelera o passo (5s → 15s → 30s → 60s → 120s).
 *
 * Seek a cada passo travaria TVs fracas (cada seek reabre o buffer do HLS) e,
 * no Modo TV, reiniciaria o relay ffmpeg a cada salto fora da janela.
 */
export function usePlayerScrub({ getCurrentTime, duration, onCommit }: UsePlayerScrubOptions) {
    const [scrub, setScrub] = useState<ScrubState | null>(null);
    const scrubRef = useRef<ScrubState | null>(null);
    const originRef = useRef(0);
    const holdRef = useRef({ direction: 0, startedAt: 0, lastKeyAt: 0, lastStepAt: 0 });
    const commitTimerRef = useRef<number | null>(null);

    const getCurrentTimeRef = useRef(getCurrentTime);
    const durationRef = useRef(duration);
    const onCommitRef = useRef(onCommit);
    useEffect(() => {
        getCurrentTimeRef.current = getCurrentTime;
        durationRef.current = duration;
        onCommitRef.current = onCommit;
    }, [getCurrentTime, duration, onCommit]);

    const setState = useCallback((next: ScrubState | null) => {
        scrubRef.current = next;
        setScrub(next);
    }, []);

    const clearCommitTimer = useCallback(() => {
        if (commitTimerRef.current !== null) {
            window.clearTimeout(commitTimerRef.current);
            commitTimerRef.current = null;
        }
    }, []);

    const resetHold = useCallback(() => {
        holdRef.current = { direction: 0, startedAt: 0, lastKeyAt: 0, lastStepAt: 0 };
    }, []);

    const commit = useCallback(() => {
        clearCommitTimer();
        resetHold();
        const current = scrubRef.current;
        if (!current) return;
        setState(null);
        onCommitRef.current(current.previewTime);
    }, [clearCommitTimer, resetHold, setState]);

    const cancel = useCallback(() => {
        clearCommitTimer();
        resetHold();
        if (scrubRef.current) setState(null);
    }, [clearCommitTimer, resetHold, setState]);

    const armCommit = useCallback((delayMs: number) => {
        clearCommitTimer();
        commitTimerRef.current = window.setTimeout(commit, delayMs);
    }, [clearCommitTimer, commit]);

    const step = useCallback((direction: 1 | -1) => {
        const now = Date.now();
        const hold = holdRef.current;
        const continuing = hold.direction === direction && now - hold.lastKeyAt < HOLD_GAP_MS;
        hold.lastKeyAt = now;

        if (!continuing) {
            hold.direction = direction;
            hold.startedAt = now;
        } else if (now - hold.lastStepAt < STEP_INTERVAL_MS) {
            armCommit(IDLE_COMMIT_MS);
            return;
        }
        hold.lastStepAt = now;

        const current = scrubRef.current;
        if (!current) originRef.current = getCurrentTimeRef.current();
        const base = current ? current.previewTime : originRef.current;
        const total = durationRef.current;
        const max = Number.isFinite(total) && total > 0 ? total : Infinity;
        const stepSeconds = stepSecondsForHold(now - hold.startedAt);
        const previewTime = Math.min(max, Math.max(0, base + direction * stepSeconds));

        setState({ previewTime, delta: previewTime - originRef.current, stepSeconds, direction });
        armCommit(IDLE_COMMIT_MS);
    }, [armCommit, setState]);

    /** Key released: the hold ends, and the pending preview is applied shortly. */
    const release = useCallback(() => {
        resetHold();
        if (scrubRef.current) armCommit(RELEASE_COMMIT_MS);
    }, [armCommit, resetHold]);

    useEffect(() => clearCommitTimer, [clearCommitTimer]);

    return { scrub, scrubRef, step, release, commit, cancel };
}
