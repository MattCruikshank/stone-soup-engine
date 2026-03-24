import React, { useCallback } from 'react';
import {
    DockviewReact,
    DockviewReadyEvent,
    IDockviewPanelProps,
} from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { FileTreePanel } from './panels/FileTreePanel';
import { SpriteEditorPanel } from './panels/SpriteEditorPanel';
import { TextEditorPanel } from './panels/TextEditorPanel';

const components: Record<string, React.FC<IDockviewPanelProps>> = {
    'file-tree': FileTreePanel,
    'sprite-editor': SpriteEditorPanel,
    'text-editor': TextEditorPanel,
};

export const App: React.FC = () => {
    const onReady = useCallback((event: DockviewReadyEvent) => {
        const { api } = event;

        const fileTreePanel = api.addPanel({
            id: 'file-tree',
            component: 'file-tree',
            title: 'Files',
            params: { dockviewApi: api },
        });

        // Lock the file tree group: hide close button via CSS, prevent drops
        const fileTreeGroup = fileTreePanel.group;
        if (fileTreeGroup) {
            fileTreeGroup.locked = 'no-drop-target';
            fileTreeGroup.element.classList.add('file-tree-group');
        }

        // When a new group is added (editor opens), shrink the file tree
        const FILE_TREE_WIDTH = 180;
        api.onDidAddGroup(() => {
            if (fileTreeGroup && api.groups.length > 1) {
                setTimeout(() => {
                    api.getGroup(fileTreeGroup.id)?.api.setSize({ width: FILE_TREE_WIDTH });
                    window.dispatchEvent(new Event('resize'));
                }, 50);
            }
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
