import React, { useCallback } from 'react';
import {
    DockviewReact,
    DockviewReadyEvent,
    IDockviewPanelProps,
} from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { FileTreePanel } from './panels/FileTreePanel';
import { SpriteEditorPanel } from './panels/SpriteEditorPanel';

const components: Record<string, React.FC<IDockviewPanelProps>> = {
    'file-tree': FileTreePanel,
    'sprite-editor': SpriteEditorPanel,
};

export const App: React.FC = () => {
    const onReady = useCallback((event: DockviewReadyEvent) => {
        const { api } = event;

        api.addPanel({
            id: 'file-tree',
            component: 'file-tree',
            title: 'Files',
            params: { dockviewApi: api },
        });

        // Trigger Piskel resize whenever dockview layout changes
        api.onDidLayoutChange(() => {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        });
    }, []);

    return (
        <DockviewReact
            className="dockview-theme-dark"
            onReady={onReady}
            components={components}
        />
    );
};
