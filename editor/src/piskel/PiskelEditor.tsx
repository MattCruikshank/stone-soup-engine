import React, { useCallback, useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        $: any;
        jQuery: any;
        pskl: any;
        Events: any;
        Constants: any;
        tinycolor: any;
    }
}

interface PiskelEditorProps {
    width?: number;
    height?: number;
    initialImageUrl?: string | null;
    onSave?: (pngDataUrl: string) => void;
}

let piskelLoaded = false;
let piskelLoading = false;
let piskelLoadCallbacks: (() => void)[] = [];

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

async function ensurePiskelLoaded(): Promise<void> {
    if (piskelLoaded) return;

    if (piskelLoading) {
        return new Promise((resolve) => {
            piskelLoadCallbacks.push(resolve);
        });
    }

    piskelLoading = true;

    // jQuery 1.8 + jQuery UI + namespace utility are all inside piskel.js bundle
    // (from Piskel's own lib/ folder). No npm jQuery needed.

    // Load CSS
    loadStylesheet('/piskel/piskel.css');
    loadStylesheet('/piskel/icons.css');

    // Load the bundled Piskel JS
    await loadScript('/piskel/piskel.js');

    piskelLoaded = true;
    piskelLoading = false;
    for (const cb of piskelLoadCallbacks) cb();
    piskelLoadCallbacks = [];
}

export const PiskelEditor: React.FC<PiskelEditorProps> = ({
    width = 32,
    height = 32,
    initialImageUrl,
    onSave,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const piskelInitialized = useRef(false);

    const handleSave = useCallback(() => {
        if (!window.pskl?.app?.piskelController) return;
        try {
            const piskelController = window.pskl.app.piskelController;
            const piskel = piskelController.getPiskel();
            const frame = piskel.getLayerAt(0).getFrameAt(piskelController.getCurrentFrameIndex());
            const canvas = window.pskl.utils.FrameUtils.toImage(frame);
            const dataUrl = canvas.toDataURL('image/png');
            onSave?.(dataUrl);
        } catch (e) {
            console.error('Failed to export sprite:', e);
        }
    }, [onSave]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;

        (async () => {
            try {
                console.log('[PiskelEditor] Loading Piskel scripts...');
                await ensurePiskelLoaded();
                console.log('[PiskelEditor] Scripts loaded. window.pskl:', !!window.pskl);
                if (cancelled) { console.log('[PiskelEditor] Cancelled after script load'); return; }

                // Load the HTML body template
                console.log('[PiskelEditor] Fetching template...');
                const res = await fetch('/piskel/piskel-body.html');
                const html = await res.text();
                console.log('[PiskelEditor] Template loaded, length:', html.length);
                if (cancelled) { console.log('[PiskelEditor] Cancelled after template fetch'); return; }

                container.innerHTML = html;

                // Initialize Piskel's app on the container
                if (window.pskl?.app?.init) {
                    console.log('[PiskelEditor] Calling pskl.app.init()...');
                    window.pskl.app.init();
                    console.log('[PiskelEditor] pskl.app.init() complete');

                    // Trigger resize so Piskel recalculates layout for the panel size
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'));
                    }, 100);
                } else {
                    console.warn('[PiskelEditor] pskl.app.init not found!');
                }

                setLoading(false);
            } catch (e: any) {
                console.error('[PiskelEditor] Error:', e);
                if (!cancelled) {
                    setError(e.message || 'Failed to load Piskel');
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    if (error) {
        return (
            <div style={{ padding: 20, color: '#f38ba8' }}>
                Failed to load Piskel editor: {error}
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
                    Loading Piskel editor...
                </div>
            )}
            <div
                ref={containerRef}
                className="piskel-editor-container"
                style={{
                    width: '100%',
                    height: '100%',
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.2s',
                }}
            />
            {!loading && onSave && (
                <button
                    onClick={handleSave}
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        padding: '6px 16px',
                        background: '#a6e3a1',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        zIndex: 100,
                    }}
                >
                    Save
                </button>
            )}
        </div>
    );
};
