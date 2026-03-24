import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IDockviewPanelProps } from 'dockview';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { loadAsset, saveAsset } from '../services/assetApi';

function getLangExtension(filename: string) {
    if (filename.endsWith('.json')) return json();
    if (filename.endsWith('.lua') || filename.endsWith('.js')) return javascript();
    return [];
}

export const TextEditorPanel: React.FC<IDockviewPanelProps> = (props) => {
    const filePath = props.params.filePath as string | null;
    const fileName = props.params.fileName as string | undefined;
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [saving, setSaving] = useState(false);

    const savePath = filePath ?? `resources/${fileName}`;

    const handleSave = useCallback(async () => {
        if (!viewRef.current) return;
        setSaving(true);
        try {
            const content = viewRef.current.state.doc.toString();
            const blob = new Blob([content], { type: 'text/plain' });
            await saveAsset(savePath, blob);
            console.log(`Saved ${savePath}`);
        } catch (e) {
            console.error('Failed to save:', e);
            alert('Failed to save file');
        }
        setSaving(false);
    }, [savePath]);

    useEffect(() => {
        if (!editorRef.current) return;

        let cancelled = false;

        (async () => {
            // Load existing content if editing an existing file
            let initialContent = '';
            if (filePath) {
                try {
                    const blob = await loadAsset(filePath);
                    initialContent = await blob.text();
                } catch {
                    // New file, start empty
                }
            } else if (fileName?.endsWith('.json')) {
                initialContent = '{\n  \n}\n';
            }

            if (cancelled || !editorRef.current) return;

            const name = filePath ?? fileName ?? '';
            const state = EditorState.create({
                doc: initialContent,
                extensions: [
                    basicSetup,
                    oneDark,
                    getLangExtension(name),
                    EditorView.theme({
                        '&': { height: '100%' },
                        '.cm-scroller': { overflow: 'auto' },
                    }),
                ],
            });

            const view = new EditorView({
                state,
                parent: editorRef.current,
            });
            viewRef.current = view;
        })();

        return () => {
            cancelled = true;
            viewRef.current?.destroy();
            viewRef.current = null;
        };
    }, [filePath, fileName]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                background: '#181825',
                borderBottom: '1px solid #313244',
                fontSize: '12px',
                color: '#a6adc8',
            }}>
                <span>{savePath}</span>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '4px 12px',
                        background: '#a6e3a1',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                    }}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
            <div ref={editorRef} style={{ flex: 1, overflow: 'hidden' }} />
        </div>
    );
};
