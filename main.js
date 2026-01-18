const { app, BrowserWindow, ipcMain, shell, session, Menu, MenuItem } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config Management
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultConfig = {
    autoClearCookies: false,
    customHomePage: 'https://aistudio.google.com/',
    showUrlInTitleBar: false,
    enableDevTools: false, // New config for DevTools
    devToolsMode: 'detach', // 'detach', 'right', 'bottom'
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

// Translations for Context Menu
const contextMenuTranslations = {
    'en': {
        'back': 'Back',
        'forward': 'Forward',
        'reload': 'Reload',
        'cut': 'Cut',
        'copy': 'Copy',
        'paste': 'Paste',
        'selectAll': 'Select All',
        'undo': 'Undo',
        'redo': 'Redo',
        'pasteAndMatchStyle': 'Paste and Match Style',
        'delete': 'Delete'
    },
    'zh-TW': {
        'back': '上一頁',
        'forward': '下一頁',
        'reload': '重新整理',
        'cut': '剪下',
        'copy': '複製',
        'paste': '貼上',
        'selectAll': '全選',
        'undo': '復原',
        'redo': '重做',
        'pasteAndMatchStyle': '貼上並符合樣式',
        'delete': '刪除'
    },
    'zh-CN': {
        'back': '上一页',
        'forward': '下一页',
        'reload': '刷新',
        'cut': '剪切',
        'copy': '复制',
        'paste': '粘贴',
        'selectAll': '全选',
        'undo': '撤销',
        'redo': '重做',
        'pasteAndMatchStyle': '粘贴并匹配样式',
        'delete': '删除'
    },
    'ja': {
        'back': '戻る',
        'forward': '進む',
        'reload': '再読み込み',
        'cut': '切り取り',
        'copy': 'コピー',
        'paste': '貼り付け',
        'selectAll': 'すべて選択',
        'undo': '元に戻す',
        'redo': 'やり直す',
        'pasteAndMatchStyle': '貼り付けてスタイルを合わせる',
        'delete': '削除'
    }
};


function getContextMenuLabel(key, configLang) {
    let lang = configLang;
    if (lang === 'auto' || !contextMenuTranslations[lang]) {
        // Simple detection falling back to en
        const sysLocale = app.getLocale();
        if (sysLocale.startsWith('zh-TW') || sysLocale.startsWith('zh-HK')) {
            lang = 'zh-TW';
        } else if (sysLocale.startsWith('zh')) {
            lang = 'zh-CN';
        } else if (sysLocale.startsWith('ja')) {
            lang = 'ja';
        } else {
            lang = 'en';
        }
    }
    
    // Fallback to en if key missing (should not happen)
    return contextMenuTranslations[lang]?.[key] || contextMenuTranslations['en'][key];
}

// Mask the app as a standard browser to allow Google Login
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'CrossSiteDocumentBlockingIfIsolating');
app.commandLine.appendSwitch('disable-site-isolation-trials');


// IPC Handlers (Moved outside to global scope)
ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.on('reset-app', async () => {
    console.log('Resetting app data...');
    if (fs.existsSync(configPath)) {
        try {
            fs.unlinkSync(configPath);
            console.log('Config file deleted.');
        } catch (err) {
            console.error('Failed to delete config file:', err);
        }
    }
    try {
        console.log('Clearing storage data...');
        await session.defaultSession.clearStorageData();
        console.log('Storage data cleared.');
    } catch (err) {
        console.error('Failed to clear storage data:', err);
    }
    console.log('Relaunching app...');
    if (!app.isPackaged) {
        app.relaunch({ args: process.argv.slice(1) });
    } else {
        app.relaunch();
    }
    app.exit(0);
});

ipcMain.on('nav-back', (event) => {
    if (event.sender.canGoBack()) event.sender.goBack();
});

ipcMain.on('nav-forward', (event) => {
    if (event.sender.canGoForward()) event.sender.goForward();
});

ipcMain.on('nav-reload', (event) => {
    event.sender.reload();
});

ipcMain.on('nav-home', (event) => {
    const currentConfig = loadConfig();
    event.sender.loadURL(currentConfig.customHomePage || defaultConfig.customHomePage);
});

ipcMain.handle('get-settings', () => {
    return loadConfig();
});

ipcMain.on('save-settings', (event, newConfig) => {
    saveConfig(newConfig);
    console.log('Settings saved. DevTools:', newConfig.enableDevTools);
    if (newConfig.enableDevTools) {
             event.sender.closeDevTools();
             setTimeout(() => {
                event.sender.openDevTools({ mode: newConfig.devToolsMode || 'detach' });
             }, 100);
    } else {
             event.sender.closeDevTools();
    }
    event.sender.send('settings-updated', newConfig);
});

ipcMain.on('set-devtools-state', (event, { open, mode }) => {
    const config = loadConfig();
    config.enableDevTools = open;
    config.devToolsMode = mode;
    saveConfig(config);
    if (open) {
             event.sender.closeDevTools();
             setTimeout(() => {
                event.sender.openDevTools({ mode: mode || 'detach' });
             }, 100);
    } else {
             event.sender.closeDevTools();
    }
});

ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
});

ipcMain.on('open-external-login', async () => {
    console.log('Received open-external-login request');
    const url = 'https://aistudio.google.com/prompts/new_chat';
    const browsers = [];
    if (process.platform === 'linux') {
        browsers.push('google-chrome', 'google-chrome-stable', 'microsoft-edge', 'microsoft-edge-stable', 'chromium', 'chromium-browser', 'brave-browser');
    } else if (process.platform === 'darwin') {
        browsers.push('Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Chromium');
    } else if (process.platform === 'win32') {
        browsers.push('chrome', 'msedge', 'brave');
    }
    let opened = false;
    for (const browser of browsers) {
        try {
            if (process.platform === 'linux') {
                await new Promise((resolve, reject) => {
                    exec(`which ${browser}`, (err) => { if (err) reject(err); else resolve(); });
                });
                const child = spawn(browser, [url], { detached: true, stdio: 'ignore' });
                child.unref();
                opened = true;
                break;
            } else if (process.platform === 'darwin') {
                await new Promise((resolve, reject) => {
                    exec(`open -a "${browser}" "${url}"`, (err) => { if (err) reject(err); else resolve(); });
                });
                opened = true;
                break;
            } else if (process.platform === 'win32') {
                await new Promise((resolve, reject) => {
                    exec(`start ${browser} "${url}"`, (err) => { if (err) reject(err); else resolve(); });
                });
                opened = true;
                break;
            }
        } catch (e) { }
    }
    if (!opened) {
        await shell.openExternal(url);
    }
});

ipcMain.on('set-session-cookie', async (event, rawCookieValue) => {
    try {
        await session.defaultSession.clearStorageData({ storages: ['cookies'] });
        const setCookie = async (name, value) => {
            const accessibleCookies = ['SAPISID', 'APISID', '__Secure-1PAPISID', '__Secure-3PAPISID', 'SIDCC', '__Secure-1PSIDCC', '__Secure-3PSIDCC'];
            const isAccessible = accessibleCookies.includes(name.trim()) || name.trim().startsWith('_ga');
            const expirationDate = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365);
            const cookie = {
                url: 'https://google.com',
                name: name.trim(),
                value: value.trim(),
                domain: '.google.com',
                path: '/',
                secure: true,
                httpOnly: !isAccessible,
                sameSite: 'no_restriction',
                expirationDate: expirationDate
            };
            try { await session.defaultSession.cookies.set(cookie); } catch (e) { console.error(e); }
        };
        let cleanCookieValue = rawCookieValue.trim();
        if (cleanCookieValue.toLowerCase().startsWith('cookie:')) cleanCookieValue = cleanCookieValue.substring(7).trim();
        if (cleanCookieValue.includes('=')) {
            const cookies = cleanCookieValue.split(';');
            for (const c of cookies) {
                const parts = c.split('=');
                if (parts.length >= 2) await setCookie(parts[0], parts.slice(1).join('='));
            }
        } else {
            await setCookie('__Secure-1PSID', rawCookieValue);
        }
        event.sender.loadURL('https://aistudio.google.com/prompts/new_chat?model=gemini-3-pro-preview');
    } catch (error) {
        console.error('Failed to process cookies:', error);
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: true, // Enable native frame
        // titleBarStyle: 'hidden', // Comment out to show native title bar
        autoHideMenuBar: true, // Hide the File/Edit menu bar
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

    // Loading State Tracking
    win.webContents.on('did-start-loading', () => {
        win.webContents.send('loading-start');
    });
    win.webContents.on('did-stop-loading', () => {
        win.webContents.send('loading-stop');
    });

    // DevTools State Synchronization (Handle manual open/close)
    win.webContents.on('devtools-opened', () => {
        const config = loadConfig();
        if (!config.enableDevTools) {
             config.enableDevTools = true;
             saveConfig(config);
             win.webContents.send('sync-devtools-state', true);
        }
    });

    win.webContents.on('devtools-closed', () => {
        const config = loadConfig();
        if (config.enableDevTools) {
             config.enableDevTools = false;
             saveConfig(config);
             win.webContents.send('sync-devtools-state', false);
        }
    });

    // Check DevTools config
    if (config.enableDevTools) {
        win.webContents.openDevTools({ mode: config.devToolsMode || 'detach' });
    }

    // Context Menu
    win.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();
        const config = loadConfig();
        const t = (key) => getContextMenuLabel(key, config.language);

        // Basic Editing
        if (params.isEditable) {
            menu.append(new MenuItem({ role: 'undo', label: t('undo') }));
            menu.append(new MenuItem({ role: 'redo', label: t('redo') }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'cut', label: t('cut') }));
            menu.append(new MenuItem({ role: 'copy', label: t('copy') }));
            menu.append(new MenuItem({ role: 'paste', label: t('paste') }));
            menu.append(new MenuItem({ role: 'pasteAndMatchStyle', label: t('pasteAndMatchStyle') }));
            menu.append(new MenuItem({ role: 'delete', label: t('delete') }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'selectAll', label: t('selectAll') }));
        } else if (params.selectionText.length > 0) {
            // Text is selected but not editable (e.g. reading text)
            menu.append(new MenuItem({ role: 'copy', label: t('copy') }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'selectAll', label: t('selectAll') }));
        } else {
             // General context
            menu.append(new MenuItem({ 
                label: t('back'), 
                accelerator: 'Alt+Left', 
                enabled: win.webContents.canGoBack(), 
                click: () => win.webContents.goBack() 
            }));
            menu.append(new MenuItem({ 
                label: t('forward'), 
                accelerator: 'Alt+Right', 
                enabled: win.webContents.canGoForward(), 
                click: () => win.webContents.goForward() 
            }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ 
                label: t('reload'), 
                accelerator: 'CmdOrCtrl+R', 
                click: () => win.webContents.reload() 
            }));
        }
        
        menu.popup();
    });

    // Intercept new window requests (e.g. target="_blank") and open in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
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
