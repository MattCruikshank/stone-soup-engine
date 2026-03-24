import React, { useCallback } from 'react';
import { IDockviewPanelProps } from 'dockview';
import { PiskelEditor } from '../piskel/PiskelEditor';
import { saveAsset } from '../services/assetApi';

export const SpriteEditorPanel: React.FC<IDockviewPanelProps> = (props) => {
    const filePath = props.params.filePath as string | null;
    const spriteName = props.params.spriteName as string | undefined;
    const width = (props.params.width as number) || 32;
    const height = (props.params.height as number) || 32;

    const savePath = filePath ?? `sprites/${spriteName}.png`;

    const handleSave = useCallback(async (pngDataUrl: string) => {
        try {
            // Convert data URL to blob
            const res = await fetch(pngDataUrl);
            const blob = await res.blob();
            await saveAsset(savePath, blob);
            console.log(`Saved sprite to ${savePath}`);
        } catch (e) {
            console.error('Failed to save sprite:', e);
            alert('Failed to save sprite');
        }
    }, [savePath]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <PiskelEditor
                width={width}
                height={height}
                initialImageUrl={filePath ? `/api/assets/${filePath}` : null}
                onSave={handleSave}
            />
        </div>
    );
};
