import React, { useCallback, useEffect, useState } from 'react';
import {
    DockviewReact,
    DockviewReadyEvent,
    IDockviewPanelProps,
} from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { FileTreePanel } from './panels/FileTreePanel';
import { SpriteEditorPanel } from './panels/SpriteEditorPanel';
import { TextEditorPanel } from './panels/TextEditorPanel';
import { TilemapEditorPanel } from './panels/TilemapEditorPanel';
import { EditorLoginScreen } from './components/EditorLoginScreen';
import { checkSession, logout, type Session } from './services/authApi';

const components: Record<string, React.FC<IDockviewPanelProps>> = {
    'file-tree': FileTreePanel,
    'sprite-editor': SpriteEditorPanel,
    'text-editor': TextEditorPanel,
    'tilemap-editor': TilemapEditorPanel,
};

export const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkSession().then(s => {
            setSession(s);
            setChecking(false);
        });
    }, []);

    const handleLogout = useCallback(async () => {
        await logout();
        setSession(null);
    }, []);

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

    if (checking) return null;

    if (!session) {
        return <EditorLoginScreen onLogin={setSession} />;
    }

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={toolbarStyle}>
                <span style={{ color: '#8892b0', fontSize: 13 }}>
                    Stone Soup Editor
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#ccd6f6', fontSize: 13 }}>{session.displayName}</span>
                    <button onClick={handleLogout} style={logoutBtnStyle}>
                        Logout
                    </button>
                </span>
            </div>
            <div style={{ flex: 1 }}>
                <DockviewReact
                    className="dockview-theme-dark"
                    onReady={onReady}
                    components={components}
                />
            </div>
        </div>
    );
};

const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    background: '#1e1e2e',
    borderBottom: '1px solid #333',
    flexShrink: 0,
};

const logoutBtnStyle: React.CSSProperties = {
    padding: '3px 10px',
    background: '#0f3460',
    color: '#ccd6f6',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
};
