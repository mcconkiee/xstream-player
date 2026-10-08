'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Tv } from 'lucide-react';
import type { ZapTarget } from '@/app/hooks/useLiveChannelZap';

export interface ChannelBannerProps {
    target: ZapTarget | null;
}

/**
 * On-screen channel banner: shown on tuning and while stepping through
 * channels, so the user sees where CH+/CH− will land before it is opened.
 */
export default function ChannelBanner({ target }: ChannelBannerProps) {
    if (!target) return null;
    const { channel, index, total, pending } = target;

    return (
        <div
            className="absolute top-24 left-6 z-30 flex items-center rounded-xl border border-line bg-black/90 p-3 pr-5 shadow-2xl pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <div className="flex flex-col items-center mr-3 text-ink-2" aria-hidden>
                <ChevronUp size={16} />
                <ChevronDown size={16} />
            </div>
            <div className="w-14 h-14 mr-4 flex-shrink-0 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center">
                {channel.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={channel.image} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                    <Tv size={24} className="text-ink-2" aria-hidden />
                )}
            </div>
            <div className={`min-w-0 transition-opacity ${pending ? 'opacity-80' : 'opacity-100'}`}>
                <p className="tnum text-sm text-ink-2">{index + 1} / {total}</p>
                <p className="text-xl font-semibold text-ink truncate max-w-[50vw]">{channel.name}</p>
            </div>
        </div>
    );
}
