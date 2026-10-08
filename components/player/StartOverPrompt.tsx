'use client';

import React, { type RefObject } from 'react';
import { RotateCcw } from 'lucide-react';
import { useT } from '@/app/context/I18nContext';
import { formatTime } from './formatTime';

export interface StartOverPromptProps {
    /** Position playback resumed from (s); the prompt is hidden when null. */
    resumedFrom: number | null;
    onStartOver: () => void;
    promptRef: RefObject<HTMLDivElement | null>;
    buttonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Shown for a few seconds after "continue watching" resumes a title mid-way:
 * one OK restarts it from the beginning instead of scrubbing all the way back.
 */
export default function StartOverPrompt({ resumedFrom, onStartOver, promptRef, buttonRef }: StartOverPromptProps) {
    const t = useT();
    if (resumedFrom === null) return null;

    return (
        <div
            ref={promptRef}
            // Opaque instead of blurred: backdrop-filter is inert below Chrome 76.
            className="absolute bottom-24 left-6 z-20 flex items-center rounded-xl border border-line bg-black/90 p-1.5 pl-4 shadow-2xl"
        >
            <span className="tnum mr-3 text-sm text-ink-2">
                {t('player.resumedFrom', { time: formatTime(resumedFrom) })}
            </span>
            <button
                ref={buttonRef}
                type="button"
                onClick={onStartOver}
                data-focusable="true"
                tabIndex={0}
                className="focus-flat flex items-center space-x-2 rounded-md bg-surface-2 px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-3"
            >
                <RotateCcw size={16} aria-hidden="true" />
                <span>{t('player.startOver')}</span>
            </button>
        </div>
    );
}
