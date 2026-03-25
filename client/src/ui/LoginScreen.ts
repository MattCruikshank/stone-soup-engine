export interface LoginResult {
    namespace: string;
    displayName: string;
}

const API_BASE = '/api/auth';

export function showLoginScreen(): Promise<LoginResult> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.innerHTML = `
            <style>
                #login-overlay {
                    position: fixed;
                    inset: 0;
                    background: #1a1a2e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    font-family: system-ui, sans-serif;
                }
                .login-box {
                    background: #16213e;
                    border: 1px solid #0f3460;
                    border-radius: 12px;
                    padding: 40px;
                    width: 360px;
                    text-align: center;
                }
                .login-box h1 {
                    color: #e94560;
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                .login-box p {
                    color: #8892b0;
                    font-size: 14px;
                    margin-bottom: 24px;
                }
                .login-box input {
                    width: 100%;
                    padding: 10px 14px;
                    margin-bottom: 12px;
                    background: #1a1a2e;
                    border: 1px solid #0f3460;
                    border-radius: 6px;
                    color: #ccd6f6;
                    font-size: 15px;
                    outline: none;
                }
                .login-box input:focus {
                    border-color: #e94560;
                }
                .login-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
                .login-buttons button {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 6px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .btn-login {
                    background: #e94560;
                    color: #fff;
                }
                .btn-register {
                    background: #0f3460;
                    color: #ccd6f6;
                }
                .btn-login:hover { background: #d63851; }
                .btn-register:hover { background: #1a4a8a; }
                .login-error {
                    color: #e94560;
                    font-size: 13px;
                    margin-top: 12px;
                    min-height: 20px;
                }
                .login-buttons button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            </style>
            <div class="login-box">
                <h1>Stone Soup</h1>
                <p>Enter your name and password to play</p>
                <input type="text" id="login-name" placeholder="Display Name" autocomplete="username" />
                <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" />
                <div class="login-buttons">
                    <button class="btn-login" id="btn-login">Login</button>
                    <button class="btn-register" id="btn-register">Register</button>
                </div>
                <div class="login-error" id="login-error"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        const nameInput = document.getElementById('login-name') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;
        const loginBtn = document.getElementById('btn-login') as HTMLButtonElement;
        const registerBtn = document.getElementById('btn-register') as HTMLButtonElement;
        const errorDiv = document.getElementById('login-error')!;

        nameInput.focus();

        async function doAuth(endpoint: string) {
            const displayName = nameInput.value.trim();
            const password = passwordInput.value;

            if (!displayName || !password) {
                errorDiv.textContent = 'Please enter both name and password';
                return;
            }

            loginBtn.disabled = true;
            registerBtn.disabled = true;
            errorDiv.textContent = '';

            try {
                const res = await fetch(`${API_BASE}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    errorDiv.textContent = data.error || 'Authentication failed';
                    loginBtn.disabled = false;
                    registerBtn.disabled = false;
                    return;
                }

                // Success — remove overlay and resolve
                overlay.remove();
                resolve({
                    namespace: data.namespace,
                    displayName,
                });
            } catch (e) {
                errorDiv.textContent = 'Could not connect to server';
                loginBtn.disabled = false;
                registerBtn.disabled = false;
            }
        }

        loginBtn.addEventListener('click', () => doAuth('login'));
        registerBtn.addEventListener('click', () => doAuth('register'));

        // Enter key submits login
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doAuth('login');
        });
    });
}
