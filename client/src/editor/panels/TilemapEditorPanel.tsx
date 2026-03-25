import React, { useCallback, useEffect, useState } from 'react';
import { IDockviewPanelProps } from 'dockview';
import { TilemapEditor, type TilemapData } from '../tilemap/TilemapEditor';
import { loadAsset, saveAsset } from '../services/assetApi';

const ASSET_PREFIX = '/api/assets/';

function resolveAssetUrls(data: TilemapData): TilemapData {
    const tileSets: Record<string, any> = {};
    for (const [key, ts] of Object.entries(data.tileSets)) {
        tileSets[key] = {
            ...ts,
            src: ts.src && !ts.src.startsWith('/') && !ts.src.startsWith('data:')
                ? `${ASSET_PREFIX}${ts.src}`
                : ts.src,
        };
    }
    return { ...data, tileSets };
}

function unresolveAssetUrls(data: TilemapData): TilemapData {
    const tileSets: Record<string, any> = {};
    for (const [key, ts] of Object.entries(data.tileSets)) {
        tileSets[key] = {
            ...ts,
            src: ts.src && typeof ts.src === 'string' && ts.src.startsWith(ASSET_PREFIX)
                ? ts.src.slice(ASSET_PREFIX.length)
                : ts.src,
        };
    }
    return { ...data, tileSets };
}

export const TilemapEditorPanel: React.FC<IDockviewPanelProps> = (props) => {
    const filePath = props.params.filePath as string | null;
    const [initialData, setInitialData] = useState<TilemapData | null | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | null>(null);

    const savePath = filePath ?? 'untitled.tilemap.json';

    useEffect(() => {
        if (!filePath) {
            setInitialData(null);
            return;
        }

        (async () => {
            try {
                const blob = await loadAsset(filePath);
                const text = await blob.text();
                const data = JSON.parse(text) as TilemapData;
                setInitialData(resolveAssetUrls(data));
            } catch (e) {
                console.error('Failed to load tilemap:', e);
                setLoadError(`Failed to load ${filePath}`);
            }
        })();
    }, [filePath]);

    const handleSave = useCallback(async (data: TilemapData) => {
        try {
            const toStore = unresolveAssetUrls(data);
            const json = JSON.stringify(toStore, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            await saveAsset(savePath, blob);
            console.log(`Saved tilemap to ${savePath}`);
        } catch (e) {
            console.error('Failed to save tilemap:', e);
            alert('Failed to save tilemap');
        }
    }, [savePath]);

    if (loadError) {
        return <div style={{ padding: 20, color: '#f38ba8' }}>{loadError}</div>;
    }

    if (initialData === undefined) {
        return (
            <div style={{ padding: 20, color: '#6c7086' }}>
                Loading tilemap...
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <TilemapEditor
                initialData={initialData}
                tileSize={16}
                mapWidth={20}
                mapHeight={15}
                onSave={handleSave}
            />
        </div>
    );
};
