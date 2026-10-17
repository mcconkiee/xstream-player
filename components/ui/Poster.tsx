'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Star } from 'lucide-react';
import Badge from './Badge';
import IconButton from './IconButton';
import { useFavorites, type FavoriteItem } from '@/app/context/FavoritesContext';
import { useT } from '@/app/context/I18nContext';
import { formatRating } from '@/app/lib/formatRating';

export type PosterRatio = 'poster' | 'wide' | 'square';

export interface PosterProps {
    href: string;
    title: string;
    image?: string;
    ratio?: PosterRatio;
    subtitle?: string;
    rating?: number | string;
    year?: number | string;
    badge?: { text: string; tone?: 'neutral' | 'live' | 'ok' | 'warn' };
    /** 0..1. Renders the red progress bar at the bottom of the image. */
    progress?: number;
    className?: string;
    onFocus?: React.FocusEventHandler<HTMLAnchorElement>;
    favoriteItem?: FavoriteItem;
}

const RATIO_CLASSNAME: Record<PosterRatio, string> = {
    poster: 'ratio-poster',
    wide: 'ratio-wide',
    square: 'ratio-square',
};

export default function Poster({
    href,
    title,
    image,
    ratio = 'poster',
    subtitle,
    rating,
    year,
    badge,
    progress,
    className = '',
    onFocus,
    favoriteItem,
}: PosterProps) {
    const t = useT();
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    // Tracked locally: `onError` on <img> only fires once per broken URL, so
    // we swap in a fallback block instead of leaving a hole in the layout.
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(image) && !imageFailed;
    const initial = title.trim().charAt(0).toUpperCase() || '?';

    const ratingLabel = formatRating(rating);

    const saved = favoriteItem ? isFavorite(favoriteItem.id, favoriteItem.type) : false;
    const toggleFavorite = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!favoriteItem) return;
        if (saved) removeFavorite(favoriteItem.id, favoriteItem.type);
        else addFavorite(favoriteItem);
    };

    return (
        <div className={['relative', className].join(' ')}>
            <Link
                href={href}
                data-focusable="true"
                tabIndex={0}
                onFocus={onFocus}
                className="spotlight-item focus-card block"
            >
            <div className={['ratio', RATIO_CLASSNAME[ratio], 'focus-card-target rounded-xl overflow-hidden bg-surface-2'].join(' ')}>
                <div className="ratio-fill">
                    {showImage ? (
                        <img
                            src={image}
                            alt={title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-2">
                            <span className="text-3xl md:text-4xl font-semibold text-ink-3">{initial}</span>
                        </div>
                    )}

                    {badge && (
                        <div className="absolute top-2 left-2">
                            <Badge tone={badge.tone} dot={badge.tone === 'live'}>
                                {badge.text}
                            </Badge>
                        </div>
                    )}

                    {progress !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div
                                className="h-full bg-brand"
                                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-2">
                <p className="text-sm md:text-base font-medium text-ink truncate">{title}</p>
                {subtitle && <p className="text-xs md:text-sm text-ink-2 truncate">{subtitle}</p>}
                {(ratingLabel !== null || year !== undefined) && (
                    <p className="text-xs md:text-sm text-ink-2 flex items-center tnum">
                        {ratingLabel !== null && (
                            <span className="flex items-center mr-2">
                                <Star size={12} className="mr-1 text-warn" fill="currentColor" />
                                {ratingLabel}
                            </span>
                        )}
                        {year !== undefined && <span>{year}</span>}
                    </p>
                )}
            </div>
            </Link>
            {favoriteItem && (
                <div className="absolute top-2 right-2 z-10">
                    <IconButton
                        icon={Bookmark}
                        label={saved ? t('favorites.inList') : t('favorites.addToList')}
                        size="sm"
                        variant="secondary"
                        active={saved}
                        onClick={toggleFavorite}
                    />
                </div>
            )}
        </div>
    );
}
