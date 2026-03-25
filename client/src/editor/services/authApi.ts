export interface Session {
    namespace: string;
    displayName: string;
}

export async function checkSession(): Promise<Session | null> {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function login(displayName: string, password: string): Promise<Session> {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, password }),
        credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
}

export async function register(displayName: string, password: string): Promise<Session> {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, password }),
        credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
}

export async function logout(): Promise<void> {
    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
    });
}
