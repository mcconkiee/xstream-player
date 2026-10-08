'use client';

import React, { useState, type RefObject } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useT } from '@/app/context/I18nContext';
import type { ScrubState } from '@/app/hooks/usePlayerScrub';
import { formatTime, formatTimeDelta } from './formatTime';

export interface SeekBarProps {
    currentTime: number;
    duration: number;
    bufferedPercent: number;
    /** True when the stream is live and has no broadcast timeline to scrub through. */
    disabled: boolean;
    onSeek: (seconds: number) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    /**
     * Pending remote-control scrub. While set, the bar shows the preview instead
     * of the playhead; the video itself only seeks when the scrub commits.
     */
    scrub: ScrubState | null;
    /** VideoPlayer drives the D-pad on this input itself (scrub, OK, Down). */
    inputRef: RefObject<HTMLInputElement | null>;
}

export default function SeekBar({
    currentTime,
    duration,
    bufferedPercent,
    disabled,
    onSeek,
    onSeekStart,
    onSeekEnd,
    scrub,
    inputRef,
}: SeekBarProps) {
    // The track thickens on focus so it stays legible from a couch without
    // being visually noisy the rest of the time.
    const [focused, setFocused] = useState(false);
    const t = useT();

    const shownTime = scrub ? scrub.previewTime : currentTime;
    const percent = duration > 0 && Number.isFinite(duration) ? Math.min(100, Math.max(0, (shownTime / duration) * 100)) : 0;
    const showBubble = !disabled && (focused || scrub !== null);
    // Keep the bubble on screen at the extremes of the bar.
    const bubbleLeft = Math.min(96, Math.max(4, percent));
    const ScrubIcon = scrub?.direction === -1 ? ChevronsLeft : ChevronsRight;

    return (
        <div className="mb-1">
            <div className={`relative flex items-center transition-all duration-150 ${focused || scrub ? 'h-2' : 'h-1'}`}>
                <div className="absolute inset-0 bg-surface-2 rounded-full" />

                <div
                    className="absolute inset-y-0 left-0 bg-line-strong rounded-full transition-all duration-300"
                    style={{ width: `${Number.isFinite(bufferedPercent) ? bufferedPercent : 0}%` }}
                    aria-hidden
                />

                {!disabled && (
                    <>
                        {/* Third and last legitimate use of the brand red (spec 05 §4). */}
                        <div
                            className="absolute inset-y-0 left-0 bg-brand rounded-full pointer-events-none z-[1]"
                            style={{ width: `${percent}%` }}
                            aria-hidden
                        />

                        {scrub && (
                            // The real playhead stays visible as a tick, so the user
                            // sees how far the preview is from what is playing.
                            <div
                                className="absolute -top-1 -bottom-1 w-0.5 bg-ink opacity-60 pointer-events-none z-[2]"
                                style={{ left: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
                                aria-hidden
                            />
                        )}

                        {showBubble && (
                            <div
                                className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none z-20"
                                style={{ left: `${bubbleLeft}%` }}
                                aria-hidden
                            >
                                <div className="flex flex-col items-center rounded-lg bg-black/90 border border-line px-3 py-1.5 shadow-2xl">
                                    <span className="tnum text-lg font-semibold text-ink leading-tight">{formatTime(shownTime)}</span>
                                    {scrub && (
                                        <span className="tnum flex items-center text-xs text-ink-2 leading-tight">
                                            <span>{formatTimeDelta(scrub.delta)}</span>
                                            <ScrubIcon size={14} className="ml-1.5 mr-0.5" aria-hidden />
                                            <span>{scrub.stepSeconds}s</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <input
                            ref={inputRef}
                            type="range"
                            min={0}
                            max={duration || 0}
                            value={shownTime}
                            onChange={(e) => onSeek(parseFloat(e.target.value))}
                            onMouseDown={onSeekStart}
                            onMouseUp={onSeekEnd}
                            onTouchStart={onSeekStart}
                            onTouchEnd={onSeekEnd}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            data-focusable="true"
                            data-player-seekbar="true"
                            className="focus-flat absolute inset-0 w-full bg-transparent appearance-none cursor-pointer z-10
                            [&::-webkit-slider-runnable-track]:bg-transparent
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
                            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ink
                            [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                            aria-label={t('player.videoProgress')}
                            aria-valuetext={formatTime(shownTime)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
