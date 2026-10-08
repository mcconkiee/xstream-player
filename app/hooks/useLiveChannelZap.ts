'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStreamsByIds } from '@/app/lib/db';
import { useData } from '@/app/context/DataContext';
import { toCatalogItems, type CatalogItem } from '@/app/lib/catalogItem';
import { sortCatalogItems } from '@/app/lib/catalogSort';
import { useSortPreference } from '@/app/hooks/useSortPreference';

/** Quiet time after the last CH press before the stream is actually switched. */
const ZAP_COMMIT_MS = 900;
/** How long the channel banner stays up after a switch (or on entering the page). */
const BANNER_MS = 3000;

export interface ZapTarget {
    channel: CatalogItem;
    /** 0-based position in the category, in the listing's order. */
    index: number;
    total: number;
    /** True while the user is still stepping and nothing has been tuned yet. */
    pending: boolean;
}

/**
 * Troca de canal no player ao vivo (CH+/CH−, ↑/↓ com os controles ocultos).
 *
 * A lista é a categoria do canal atual, na mesma ordem da grade de canais
 * (preferência de ordenação salva), com volta circular nas pontas. Toques
 * rápidos só movem o canal "alvo" exibido no banner; o stream troca uma única
 * vez, após ~1s sem toques — abrir cada canal do caminho estouraria o limite
 * de conexões do provedor.
 */
export function useLiveChannelZap(streamId: string, onSwitch: (channel: CatalogItem) => void) {
    const { getCachedStreams } = useData();
    const [sort, , sortLoaded] = useSortPreference('live', 'added');
    const [channels, setChannels] = useState<CatalogItem[]>([]);
    const [pendingIndex, setPendingIndex] = useState<number | null>(null);
    const [bannerVisible, setBannerVisible] = useState(false);
    const commitTimerRef = useRef<number | null>(null);
    const bannerTimerRef = useRef<number | null>(null);
    const onSwitchRef = useRef(onSwitch);
    useEffect(() => { onSwitchRef.current = onSwitch; }, [onSwitch]);

    // The category is looked up once from the channel the page was opened on;
    // zapping stays inside it, so it never has to be resolved again.
    const [categoryId, setCategoryId] = useState<string | null>(null);
    useEffect(() => {
        if (categoryId || !streamId) return;
        let cancelled = false;
        getStreamsByIds([streamId], 'live')
            .then((found) => {
                if (!cancelled && found[0]?.category_id) setCategoryId(found[0].category_id);
            })
            .catch((e) => console.warn('[ChannelZap] Could not resolve the channel category:', e));
        return () => { cancelled = true; };
    }, [streamId, categoryId]);

    useEffect(() => {
        if (!categoryId || !sortLoaded) return;
        let cancelled = false;
        getCachedStreams(categoryId, 'live')
            .then((streams) => {
                if (!cancelled) setChannels(sortCatalogItems(toCatalogItems(streams), sort));
            })
            .catch((e) => console.warn('[ChannelZap] Could not load the channel list:', e));
        return () => { cancelled = true; };
    }, [categoryId, sortLoaded, sort, getCachedStreams]);

    const currentIndex = useMemo(
        () => channels.findIndex((c) => c.id === String(streamId)),
        [channels, streamId]
    );

    const showBanner = useCallback(() => {
        setBannerVisible(true);
        if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = window.setTimeout(() => setBannerVisible(false), BANNER_MS);
    }, []);

    // Each tuned channel (including the first) gets the banner, like a TV set.
    useEffect(() => {
        if (currentIndex < 0) return;
        const timer = window.setTimeout(showBanner, 0);
        return () => window.clearTimeout(timer);
    }, [currentIndex, showBanner]);

    const pendingIndexRef = useRef<number | null>(null);

    const step = useCallback((direction: 1 | -1) => {
        const total = channels.length;
        if (total < 2 || currentIndex < 0) return;
        const from = pendingIndexRef.current ?? currentIndex;
        const next = (from + direction + total) % total;
        pendingIndexRef.current = next;
        setPendingIndex(next);
        showBanner();

        if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = window.setTimeout(() => {
            commitTimerRef.current = null;
            const target = pendingIndexRef.current;
            pendingIndexRef.current = null;
            setPendingIndex(null);
            if (target !== null && target !== currentIndex) onSwitchRef.current(channels[target]);
        }, ZAP_COMMIT_MS);
    }, [channels, currentIndex, showBanner]);

    useEffect(() => () => {
        if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
        if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    }, []);

    const shownIndex = pendingIndex ?? currentIndex;
    const target: ZapTarget | null = shownIndex >= 0 && channels[shownIndex]
        ? { channel: channels[shownIndex], index: shownIndex, total: channels.length, pending: pendingIndex !== null }
        : null;

    return {
        /** Undefined until the list is known — the player then simply has no zapping. */
        step: channels.length > 1 && currentIndex >= 0 ? step : undefined,
        current: currentIndex >= 0 ? channels[currentIndex] : undefined,
        banner: bannerVisible ? target : null,
    };
}
