import React from 'react';
import { IDockviewPanelProps } from 'dockview';

export const WelcomePanel: React.FC<IDockviewPanelProps> = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px',
            padding: '32px',
            color: '#cdd6f4',
        }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600 }}>Stone Soup Editor</h1>
            <p style={{ fontSize: '16px', color: '#a6adc8' }}>
                Create a new sprite to get started, or open an existing asset from the file tree.
            </p>
        </div>
    );
};
