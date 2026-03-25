import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        TilemapEditor: any;
    }
}

export interface TilemapData {
    tileSets: Record<string, any>;
    maps: Record<string, any>;
    activeMap?: string;
}

interface TilemapEditorProps {
    initialData?: TilemapData | null;
    tileSetImages?: string[];
    tileSize?: number;
    mapWidth?: number;
    mapHeight?: number;
    onSave?: (data: TilemapData) => void;
}

let tilemapLoaded = false;
let tilemapLoading = false;
let tilemapLoadCallbacks: (() => void)[] = [];

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

function loadStylesheet(href: string): void {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

async function ensureTilemapLoaded(): Promise<void> {
    if (tilemapLoaded) return;

    if (tilemapLoading) {
        return new Promise((resolve) => {
            tilemapLoadCallbacks.push(resolve);
        });
    }

    tilemapLoading = true;

    loadStylesheet('/tilemap/tilemap-editor.css');
    await loadScript('/tilemap/tilemap-editor.js');

    tilemapLoaded = true;
    tilemapLoading = false;
    for (const cb of tilemapLoadCallbacks) cb();
    tilemapLoadCallbacks = [];
}

let instanceCounter = 0;

export const TilemapEditor: React.FC<TilemapEditorProps> = ({
    initialData,
    tileSetImages,
    tileSize = 16,
    mapWidth = 20,
    mapHeight = 15,
    onSave,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorIdRef = useRef(`tilemap-editor-${++instanceCounter}`);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;

        (async () => {
            try {
                await ensureTilemapLoaded();
                if (cancelled) return;

                if (!window.TilemapEditor?.init) {
                    throw new Error('TilemapEditor.init not found');
                }

                container.id = editorIdRef.current;

                window.TilemapEditor.init(editorIdRef.current, {
                    tileMapData: initialData || undefined,
                    tileSize,
                    mapWidth: initialData?.maps ? undefined : mapWidth,
                    mapHeight: initialData?.maps ? undefined : mapHeight,
                    tileSetImages: (!initialData && tileSetImages) ? tileSetImages : undefined,
                    onApply: onSaveRef.current ? {
                        onClick: (exportData: any) => {
                            const data: TilemapData = {
                                tileSets: exportData.tileSets,
                                maps: exportData.maps,
                                activeMap: exportData.activeMap,
                            };
                            onSaveRef.current?.(data);
                        },
                    } : undefined,
                    applyButtonText: 'Save',
                    onUpdate: () => {},
                    tileMapExporters: {},
                    tileMapImporters: {},
                });

                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);

                setLoading(false);
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message || 'Failed to load tilemap editor');
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (container) container.innerHTML = '';
        };
    }, []);

    if (error) {
        return (
            <div style={{ padding: 20, color: '#f38ba8' }}>
                Failed to load tilemap editor: {error}
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6c7086',
                    fontSize: '14px',
                    zIndex: 10,
                }}>
                    Loading tilemap editor...
                </div>
            )}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.2s',
                    overflow: 'auto',
                }}
            />
        </div>
    );
};
