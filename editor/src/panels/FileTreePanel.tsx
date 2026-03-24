import React, { useCallback, useEffect, useState } from 'react';
import { DockviewApi, IDockviewPanelProps } from 'dockview';
import { fetchFileTree, FileNode } from '../services/assetApi';

interface TreeNodeProps {
    node: FileNode;
    depth: number;
    onFileClick: (node: FileNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, onFileClick }) => {
    const [expanded, setExpanded] = useState(false);
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
    }, [loadTree]);

    const handleFileClick = useCallback((node: FileNode) => {
        if (!dockviewApi) return;

        const isPng = node.name.toLowerCase().endsWith('.png');
        if (isPng) {
            const panelId = `sprite-${node.path}`;
            const existing = dockviewApi.getPanel(panelId);
            if (existing) {
                existing.api.setActive();
                return;
            }
            dockviewApi.addPanel({
                id: panelId,
                component: 'sprite-editor',
                title: node.name,
                params: { filePath: node.path },
            });
        }
    }, [dockviewApi]);

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
        });
    }, [dockviewApi]);

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
                    onClick={loadTree}
                    style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        background: '#313244',
                        color: '#cdd6f4',
                        border: '1px solid #45475a',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                    title="Refresh"
                >
                    &#x21bb;
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
