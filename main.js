const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config Management
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig = {
    autoClearCookies: false,
    customHomePage: 'https://aistudio.google.com/prompts/new_chat',
    showUrlInTitleBar: false,
    language: 'auto',
    windowControlsPosition: 'auto' // 'auto', 'left', 'right'
};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return { ...defaultConfig, ...JSON.parse(data) };
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    return defaultConfig;
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

// Mask the app as a standard browser to allow Google Login
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'CrossSiteDocumentBlockingIfIsolating');
app.commandLine.appendSwitch('disable-site-isolation-trials');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false, // Disable native frame
        titleBarStyle: 'hidden', // Hide title bar but keep traffic lights on Mac (handled by custom CSS on others)
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true, // Enable sandbox to match Chrome's security model
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Set User-Agent to match homielab/ai-studio-desktop strategy (Futuristic Chrome version)
    // This attempts to bypass Google's "browser not supported" or "automation detected" checks
    const getPlatformUA = () => {
        if (process.platform === 'darwin') return 'Macintosh; Intel Mac OS X 10_15_7';
        if (process.platform === 'win32') return 'Windows NT 10.0; Win64; x64';
        return 'X11; Linux x86_64';
    };
    
    // Using Chrome 142.0.0.0 as seen in the reference project
    const newUA = `Mozilla/5.0 (${getPlatformUA()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`;
    
    console.log('Setting User-Agent to:', newUA);
    win.webContents.setUserAgent(newUA);

    // Load Config
    const config = loadConfig();

    // Auto Clear Cookies if enabled
    if (config.autoClearCookies) {
        console.log('Auto-clearing cookies on startup...');
        session.defaultSession.clearStorageData({ storages: ['cookies'] });
    }

    // Load the live URL (Default or Custom)
    const startUrl = config.customHomePage || defaultConfig.customHomePage;
    win.loadURL(startUrl);

    // URL Tracking
    const sendUrlUpdate = () => {
        win.webContents.send('url-changed', win.webContents.getURL());
    };
    win.webContents.on('did-navigate', sendUrlUpdate);
    win.webContents.on('did-navigate-in-page', sendUrlUpdate);

    // Open DevTools for debugging
    //win.webContents.openDevTools({ mode: 'detach' }); // custom title bar
    // IPC Listeners for custom title bar
    ipcMain.on('window-minimize', () => {
        win.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.on('window-close', () => {
        win.close();
    });

    ipcMain.on('reset-app', async () => {
        console.log('Resetting app data...');
        await session.defaultSession.clearStorageData();
        app.relaunch();
        app.exit(0);
    });

    // Navigation IPCs
    ipcMain.on('nav-back', () => {
        if (win.webContents.canGoBack()) win.webContents.goBack();
    });

    ipcMain.on('nav-forward', () => {
        if (win.webContents.canGoForward()) win.webContents.goForward();
    });

    ipcMain.on('nav-reload', () => {
        win.webContents.reload();
    });

    ipcMain.on('nav-home', () => {
        const currentConfig = loadConfig();
        win.loadURL(currentConfig.customHomePage || defaultConfig.customHomePage);
    });

    // Settings IPCs
    ipcMain.handle('get-settings', () => {
        return loadConfig();
    });

    ipcMain.on('save-settings', (event, newConfig) => {
        saveConfig(newConfig);
        // Broadcast settings update to all windows (or at least the sender)
        event.sender.send('settings-updated', newConfig);
    });

    // IPC Listeners for External Login
    ipcMain.on('open-external-login', async () => {
        console.log('Received open-external-login request');
        const url = 'https://aistudio.google.com/prompts/new_chat';
        
        const browsers = [];
        
        if (process.platform === 'linux') {
            browsers.push('google-chrome');
            browsers.push('google-chrome-stable');
            browsers.push('microsoft-edge');
            browsers.push('microsoft-edge-stable');
            browsers.push('chromium');
            browsers.push('chromium-browser');
            browsers.push('brave-browser');
        } else if (process.platform === 'darwin') {
            browsers.push('Google Chrome');
            browsers.push('Microsoft Edge');
            browsers.push('Brave Browser');
            browsers.push('Chromium');
        } else if (process.platform === 'win32') {
            browsers.push('chrome');
            browsers.push('msedge');
            browsers.push('brave');
        }

        let opened = false;

        for (const browser of browsers) {
            try {
                if (process.platform === 'linux') {
                    // Check if binary exists
                    await new Promise((resolve, reject) => {
                        exec(`which ${browser}`, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    // Spawn detached
                    const child = spawn(browser, [url], { detached: true, stdio: 'ignore' });
                    child.unref();
                    opened = true;
                    console.log(`Opened with ${browser}`);
                    break;
                } else if (process.platform === 'darwin') {
                    await new Promise((resolve, reject) => {
                        exec(`open -a "${browser}" "${url}"`, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    opened = true;
                    console.log(`Opened with ${browser}`);
                    break;
                } else if (process.platform === 'win32') {
                    await new Promise((resolve, reject) => {
                        exec(`start ${browser} "${url}"`, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    opened = true;
                    console.log(`Opened with ${browser}`);
                    break;
                }
            } catch (e) {
                // Continue to next browser
            }
        }

        if (!opened) {
            console.log('No preferred browser found, falling back to default.');
            await shell.openExternal(url);
        }
    });

    ipcMain.on('set-session-cookie', async (event, rawCookieValue) => {
        try {
            // 1. Clear existing cookies to avoid conflicts (like NID overwrite errors)
            console.log('Clearing existing cookies...');
            await session.defaultSession.clearStorageData({ storages: ['cookies'] });

            const setCookie = async (name, value) => {
                // Determine if cookie should be httpOnly (hidden from JS) or accessible
                // SAPISID, APISID, and their variants MUST be accessible for client-side auth hashing
                const accessibleCookies = ['SAPISID', 'APISID', '__Secure-1PAPISID', '__Secure-3PAPISID', 'SIDCC', '__Secure-1PSIDCC', '__Secure-3PSIDCC'];
                const isAccessible = accessibleCookies.includes(name.trim()) || name.trim().startsWith('_ga');

                const cookie = {
                    url: 'https://google.com',
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.google.com',
                    path: '/',
                    secure: true,
                    httpOnly: !isAccessible, // Allow JS access for auth token generation
                    sameSite: 'no_restriction'
                };
                
                try {
                    await session.defaultSession.cookies.set(cookie);
                    console.log(`Cookie ${name.trim()} set successfully (httpOnly: ${!isAccessible})`);
                } catch (e) {
                    console.error(`Failed to set cookie ${name.trim()}:`, e);
                }
            };

            // Strip "Cookie:" prefix if user copied the header name too
            let cleanCookieValue = rawCookieValue.trim();
            if (cleanCookieValue.toLowerCase().startsWith('cookie:')) {
                cleanCookieValue = cleanCookieValue.substring(7).trim();
            }

            if (cleanCookieValue.includes('=')) {
                // Handle "key=value; key2=value2" format
                const cookies = cleanCookieValue.split(';');
                for (const c of cookies) {
                    const parts = c.split('=');
                    if (parts.length >= 2) {
                        const name = parts[0];
                        const value = parts.slice(1).join('=');
                        await setCookie(name, value);
                    }
                }
            } else {
                // Backward compatibility
                await setCookie('__Secure-1PSID', rawCookieValue);
            }
            
            console.log('All cookies processed. Reloading window...');
            // Force load the target URL to ensure we don't get stuck on the login page
            win.loadURL('https://aistudio.google.com/prompts/new_chat?model=gemini-3-pro-preview');
        } catch (error) {
            console.error('Failed to process cookies:', error);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
