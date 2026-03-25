import React, { useState } from 'react';
import { login, register, type Session } from '../services/authApi';

interface Props {
    onLogin: (session: Session) => void;
}

export const EditorLoginScreen: React.FC<Props> = ({ onLogin }) => {
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function doAuth(action: 'login' | 'register') {
        if (!displayName.trim() || !password) {
            setError('Please enter both name and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fn = action === 'login' ? login : register;
            const session = await fn(displayName.trim(), password);
            onLogin(session);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.overlay}>
            <div style={styles.box}>
                <h1 style={styles.title}>Stone Soup Editor</h1>
                <p style={styles.subtitle}>Log in to edit assets</p>
                <input
                    style={styles.input}
                    type="text"
                    placeholder="Display Name"
                    autoComplete="username"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doAuth('login')}
                    autoFocus
                />
                <input
                    style={styles.input}
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doAuth('login')}
                />
                <div style={styles.buttons}>
                    <button
                        style={{ ...styles.btn, ...styles.btnLogin }}
                        onClick={() => doAuth('login')}
                        disabled={loading}
                    >
                        Login
                    </button>
                    <button
                        style={{ ...styles.btn, ...styles.btnRegister }}
                        onClick={() => doAuth('register')}
                        disabled={loading}
                    >
                        Register
                    </button>
                </div>
                {error && <div style={styles.error}>{error}</div>}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
    },
    box: {
        background: '#16213e',
        border: '1px solid #0f3460',
        borderRadius: 12,
        padding: 40,
        width: 360,
        textAlign: 'center',
    },
    title: {
        color: '#e94560',
        fontSize: 28,
        marginBottom: 8,
    },
    subtitle: {
        color: '#8892b0',
        fontSize: 14,
        marginBottom: 24,
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        marginBottom: 12,
        background: '#1a1a2e',
        border: '1px solid #0f3460',
        borderRadius: 6,
        color: '#ccd6f6',
        fontSize: 15,
        outline: 'none',
        boxSizing: 'border-box',
    },
    buttons: {
        display: 'flex',
        gap: 8,
        marginTop: 8,
    },
    btn: {
        flex: 1,
        padding: 10,
        border: 'none',
        borderRadius: 6,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
    },
    btnLogin: {
        background: '#e94560',
        color: '#fff',
    },
    btnRegister: {
        background: '#0f3460',
        color: '#ccd6f6',
    },
    error: {
        color: '#e94560',
        fontSize: 13,
        marginTop: 12,
    },
};
