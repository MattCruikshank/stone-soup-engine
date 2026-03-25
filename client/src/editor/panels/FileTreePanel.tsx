import React, { useCallback, useEffect, useState } from 'react';
import { DockviewApi, IDockviewPanelProps } from 'dockview';
import { fetchFileTree, FileNode } from '../services/assetApi';

interface TreeNodeProps {
    node: FileNode;
    depth: number;
    onFileClick: (node: FileNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, onFileClick }) => {
    const [expanded, setExpanded] = useState(true);
    const isDir = node.type === 'directory';

    const handleClick = () => {
        if (isDir) {
            setExpanded(!expanded);
        } else {
            onFileClick(node);
        }
    };

    return (
        <li style={{ listStyle: 'none' }}>
            <div
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    paddingLeft: `${12 + depth * 16}px`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '13px',
                    lineHeight: '22px',
                    color: '#cdd6f4',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#313244';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                {isDir && (
                    <span style={{
                        display: 'inline-block',
                        width: '16px',
                        fontSize: '10px',
                        textAlign: 'center',
                        transition: 'transform 0.15s',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        color: '#6c7086',
                        marginRight: '4px',
                    }}>
                        &#9654;
                    </span>
                )}
                {!isDir && <span style={{ width: '20px' }} />}
                <span style={{ color: isDir ? '#89b4fa' : '#cdd6f4' }}>
                    {node.name}
                </span>
            </div>
            {isDir && expanded && node.children && (
                <ul style={{ margin: 0, padding: 0 }}>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            onFileClick={onFileClick}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const FileTreePanel: React.FC<IDockviewPanelProps> = (props) => {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [error, setError] = useState<string | null>(null);
    const dockviewApi = props.params.dockviewApi as DockviewApi | undefined;

    const loadTree = useCallback(async () => {
        try {
            setError(null);
            const nodes = await fetchFileTree();
            setTree(nodes);
        } catch {
            setError('Could not load file tree');
            setTree([]);
        }
    }, []);

    useEffect(() => {
        loadTree();
        const interval = setInterval(loadTree, 3000);
        return () => clearInterval(interval);
    }, [loadTree]);

    const getEditorPosition = useCallback(() => {
        if (!dockviewApi) return undefined;
        const existingEditor = dockviewApi.panels.find(p => p.id !== 'file-tree');
        return existingEditor
            ? { referencePanel: existingEditor }
            : { referencePanel: 'file-tree', direction: 'right' as const };
    }, [dockviewApi]);

    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif'];
    const TEXT_EXTS = ['.json', '.lua', '.js', '.txt', '.md', '.csv', '.xml', '.yaml', '.yml'];

    const handleFileClick = useCallback((node: FileNode) => {
        if (!dockviewApi) return;

        const lower = node.name.toLowerCase();
        const panelId = `file-${node.path}`;
        const existing = dockviewApi.getPanel(panelId);
        if (existing) {
            existing.api.setActive();
            return;
        }

        const isTilemap = lower.endsWith('.tilemap.json');
        const isImage = IMAGE_EXTS.some(ext => lower.endsWith(ext));
        const isText = !isTilemap && TEXT_EXTS.some(ext => lower.endsWith(ext));

        if (isTilemap) {
            dockviewApi.addPanel({
                id: panelId,
                component: 'tilemap-editor',
                title: node.name,
                params: { filePath: node.path },
                position: getEditorPosition(),
            });
        } else if (isImage) {
            dockviewApi.addPanel({
                id: panelId,
                component: 'sprite-editor',
                title: node.name,
                params: { filePath: node.path },
                position: getEditorPosition(),
            });
        } else if (isText) {
            dockviewApi.addPanel({
                id: panelId,
                component: 'text-editor',
                title: node.name,
                params: { filePath: node.path },
                position: getEditorPosition(),
            });
        }
    }, [dockviewApi, getEditorPosition]);

    const handleNewSprite = useCallback(() => {
        const name = prompt('Sprite name (e.g. goblin):');
        if (!name) return;
        const widthStr = prompt('Width in pixels:', '32');
        if (!widthStr) return;
        const heightStr = prompt('Height in pixels:', '32');
        if (!heightStr) return;

        const width = parseInt(widthStr, 10);
        const height = parseInt(heightStr, 10);
        if (isNaN(width) || isNaN(height) || width < 1 || height < 1) {
            alert('Invalid dimensions');
            return;
        }

        if (!dockviewApi) return;

        const panelId = `sprite-new-${name}-${Date.now()}`;
        dockviewApi.addPanel({
            id: panelId,
            component: 'sprite-editor',
            title: `${name}.png`,
            params: {
                filePath: null,
                spriteName: name,
                width,
                height,
            },
            position: getEditorPosition(),
        });
    }, [dockviewApi, getEditorPosition]);

    const handleNewTilemap = useCallback(() => {
        const name = prompt('Tilemap name (e.g. forest-chunk):');
        if (!name) return;
        const fileName = name.endsWith('.tilemap.json') ? name : `${name}.tilemap.json`;

        if (!dockviewApi) return;

        const panelId = `tilemap-new-${fileName}-${Date.now()}`;
        dockviewApi.addPanel({
            id: panelId,
            component: 'tilemap-editor',
            title: fileName,
            params: { filePath: null, fileName },
            position: getEditorPosition(),
        });
    }, [dockviewApi, getEditorPosition]);

    const handleNewJson = useCallback(() => {
        const name = prompt('File name (e.g. monsters.json):');
        if (!name) return;
        const fileName = name.endsWith('.json') ? name : `${name}.json`;

        if (!dockviewApi) return;

        const panelId = `text-new-${fileName}-${Date.now()}`;
        dockviewApi.addPanel({
            id: panelId,
            component: 'text-editor',
            title: fileName,
            params: { filePath: null, fileName },
            position: getEditorPosition(),
        });
    }, [dockviewApi, getEditorPosition]);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#1e1e2e',
        }}>
            <div style={{
                display: 'flex',
                gap: '4px',
                padding: '6px 8px',
                borderBottom: '1px solid #313244',
            }}>
                <button
                    onClick={handleNewSprite}
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: '#89b4fa',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    New Sprite
                </button>
                <button
                    onClick={handleNewTilemap}
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: '#f9e2af',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    New Tilemap
                </button>
                <button
                    onClick={handleNewJson}
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: '#a6e3a1',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    New JSON
                </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                {error && (
                    <div style={{ padding: '12px', color: '#f38ba8', fontSize: '13px' }}>
                        {error}
                    </div>
                )}
                {tree.length === 0 && !error && (
                    <div style={{ padding: '12px', color: '#6c7086', fontSize: '13px' }}>
                        No assets found. Create a new sprite to get started.
                    </div>
                )}
                <ul style={{ margin: 0, padding: 0 }}>
                    {tree.map((node) => (
                        <TreeNode
                            key={node.path}
                            node={node}
                            depth={0}
                            onFileClick={handleFileClick}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};
