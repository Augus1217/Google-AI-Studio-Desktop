const { app, BrowserWindow, ipcMain, shell, session, Menu, MenuItem } = require('electron');
const { Notification } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Development Mode Data Isolation
if (!app.isPackaged) {
    const devUserDataPath = app.getPath('userData') + '-dev';
    app.setPath('userData', devUserDataPath);
    console.log('Running in Development mode. UserData path set to:', devUserDataPath);
}

// Config Management
const configPath = path.join(app.getPath('userData'), 'config.json');
const defaultProfileSettings = {
    autoClearCookies: false,
    enableReplyNotification: true,
    customHomePage: 'https://aistudio.google.com/',
    showUrlInTitleBar: false,
    enableDevTools: false,
    devToolsMode: 'detach',
    windowControlsPosition: 'auto',
    language: 'auto'
};

const defaultConfig = {
    // Global Settings
    profiles: ['default'],
    activeProfile: 'default',
    
    // Per-Profile Settings Store
    // Structure: { 'default': { ...settings }, 'work': { ...settings } }
    profileSettings: {
        'default': { ...defaultProfileSettings }
    }
    
    // Deprecated top-level keys remain for migration but will be ignored if profileSettings exists
};

// In-memory cache to reduce I/O and race conditions
let configCache = null;

function loadConfig() {
    if (configCache) {
        return { ...configCache };
    }
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            const loaded = JSON.parse(data);
            
            // Migration 1: Ensure profiles exist
            if (!loaded.profiles) loaded.profiles = ['default'];
            if (!loaded.activeProfile) loaded.activeProfile = 'default';
            
            // Migration 2: Move top-level settings to profileSettings['default'] if missing
            if (!loaded.profileSettings) {
                loaded.profileSettings = {};
                
                // Copy old top-level keys to 'default' profile
                const migratedDefault = {};
                for (const key in defaultProfileSettings) {
                    if (loaded[key] !== undefined) {
                        migratedDefault[key] = loaded[key];
                    } else {
                        migratedDefault[key] = defaultProfileSettings[key];
                    }
                }
                loaded.profileSettings['default'] = migratedDefault;
            }
            
            // Ensure every existing profile has an entry in profileSettings
            loaded.profiles.forEach(p => {
                if (!loaded.profileSettings[p]) {
                    loaded.profileSettings[p] = { ...defaultProfileSettings };
                }
            });

            configCache = { ...defaultConfig, ...loaded };
            return { ...configCache };
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    configCache = { ...defaultConfig };
    return { ...configCache };
}

// Helper to get effective settings for current profile
function getEffectiveConfig() {
    const config = loadConfig();
    const active = config.activeProfile;
    const settings = config.profileSettings[active] || defaultProfileSettings;
    
    // Merge global info (profiles list) with active profile settings
    return {
        ...settings,
        profiles: config.profiles,
        activeProfile: active
    };
}

// Helper to update settings for active profile
function updateActiveProfileSettings(newSettings) {
    const config = loadConfig();
    const active = config.activeProfile;
    
    if (!config.profileSettings[active]) {
        config.profileSettings[active] = { ...defaultProfileSettings };
    }
    
    // Update only the setting keys
    for (const key in defaultProfileSettings) {
        if (newSettings[key] !== undefined) {
            config.profileSettings[active][key] = newSettings[key];
        }
    }
    
    saveConfig(config);
}

function saveConfig(config) {
    try {
        // Update cache
        configCache = { ...defaultConfig, ...config };
        
        // Atomic write
        const tempPath = configPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(configCache, null, 2));
        fs.renameSync(tempPath, configPath);
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

// Translations for Context Menu
const translations = {};
const langDir = path.join(__dirname, 'lang');

try {
    if (fs.existsSync(langDir)) { // Check if directory exists
        const files = fs.readdirSync(langDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const langCode = path.basename(file, '.json');
                try {
                    const content = fs.readFileSync(path.join(langDir, file), 'utf8');
                    translations[langCode] = JSON.parse(content);
                } catch (err) {
                    console.error(`Failed to load translation ${file}:`, err);
                }
            }
        });
    } else {
         console.warn('Lang directory not found:', langDir);
    }
} catch (err) {
    console.error('Failed to load translations:', err);
}

// IPC to serve translations to renderer
ipcMain.handle('get-translations', () => {
    return translations;
});

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

ipcMain.handle('get-profiles', () => {
    const config = loadConfig();
    return {
        profiles: config.profiles || ['default'],
        activeProfile: config.activeProfile || 'default'
    };
});

ipcMain.on('create-profile', (event, profileName) => {
    if (!profileName) return;
    const config = loadConfig();
    // Sanitize profileName (simple alphanumeric)
    const safeName = profileName.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeName) return;
    
    if (!config.profiles.includes(safeName)) {
        config.profiles.push(safeName);
        // Init default settings for new profile
        if (!config.profileSettings) config.profileSettings = {};
        config.profileSettings[safeName] = { ...defaultProfileSettings };
        
        saveConfig(config);
    }
    event.sender.send('profiles-updated', { profiles: config.profiles, activeProfile: config.activeProfile });
});

ipcMain.on('active-profile-settings-updated', (event, { profiles, activeProfile }) => {
    // This handler seems redundant or logic outdated. The update happens in save-settings.
    // However, if we need to broadcast changes:
    const config = getEffectiveConfig();
    event.sender.send('settings-updated', config);
});

ipcMain.on('switch-profile', (event, profileName) => {
    const config = loadConfig();
    if (config.profiles.includes(profileName)) {
        config.activeProfile = profileName;
        saveConfig(config);
        
        console.log(`Switching to profile: ${profileName}. Relaunching...`);
        app.relaunch();
        app.exit(0);
    }
});

ipcMain.on('rename-profile', (event, { oldName, newName }) => {
    if (!oldName || !newName) return;
    
    // With the unified partition architecture, 'default' is no longer special and can be renamed.
    
    const config = loadConfig();
    const safeName = newName.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (!safeName || config.profiles.includes(safeName)) return; // Invalid or Duplicate

    // Update List
    const idx = config.profiles.indexOf(oldName);
    if (idx !== -1) {
        // DATA MIGRATION: Attempt to rename the partition folder to preserve session
        try {
            const partitionsDir = path.join(app.getPath('userData'), 'Partitions');
            const oldPath = path.join(partitionsDir, oldName);
            // ... (Folder migration logic remains same) ...
            
            // NOTE: We do not need to repeat folder migration code here if it's already in the file, 
            // but the prompt is strictly about settings logic.
            // Let's assume the folder migration code exists from previous turn.
            
            const newPath = path.join(partitionsDir, safeName);

            if (fs.existsSync(oldPath)) {
                 console.log(`Migrating partition data from ${oldName} to ${safeName}...`);
                 // If destination somehow exists (leftover?), backup it to be safe
                 if (fs.existsSync(newPath)) {
                     const backupPath = newPath + '.bak.' + Date.now();
                     fs.renameSync(newPath, backupPath);
                 }
                 fs.renameSync(oldPath, newPath);
                 console.log('Migration successful.');
            } else {
                console.log(`No existing data found for profile ${oldName}, skipping migration.`);
            }
        } catch (err) {
            console.error('Partition migration failed:', err);
        }

        config.profiles[idx] = safeName;
        
        // MIGRATION: Migrate Profile Settings
        if (config.profileSettings && config.profileSettings[oldName]) {
            config.profileSettings[safeName] = config.profileSettings[oldName];
            delete config.profileSettings[oldName];
        } else {
            // Fallback if missing
            config.profileSettings[safeName] = { ...defaultProfileSettings };
        }
        
        // Update Active
        if (config.activeProfile === oldName) {
            config.activeProfile = safeName;
            saveConfig(config);
            // Must relaunch because partition changed
            app.relaunch();
            app.exit(0);
        } else {
            saveConfig(config);
            event.sender.send('profiles-updated', { profiles: config.profiles, activeProfile: config.activeProfile });
        }
    }
});

// Not currently used in UI, but good to have
ipcMain.on('delete-profile', (event, profileName) => {
    const config = loadConfig();
    
    // Check if it's the last profile
    if (config.profiles.length <= 1) {
        console.warn('Cannot delete the last remaining profile.');
        return;
    }
    
    config.profiles = config.profiles.filter(p => p !== profileName);
    
    // Delete settings for this profile
    if (config.profileSettings && config.profileSettings[profileName]) {
        delete config.profileSettings[profileName];
    }
    
    // If active profile was deleted, switch to default (or first available)
    if (config.activeProfile === profileName) {
        config.activeProfile = config.profiles[0]; // Switch to first available
        saveConfig(config);
        app.relaunch();
        app.exit(0);
    } else {
        saveConfig(config);
        event.sender.send('profiles-updated', { profiles: config.profiles, activeProfile: config.activeProfile });
    }
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
    const config = getEffectiveConfig();
    event.sender.loadURL(config.customHomePage || defaultProfileSettings.customHomePage);
});

ipcMain.handle('get-settings', () => {
    return getEffectiveConfig();
});

ipcMain.on('save-settings', (event, newConfig) => {
    // Extract the settings part from newConfig and save to active profile
    // Note: newConfig coming from UI might contain mixed content (profiles list + settings)
    // We only care about the settings keys defined in defaultProfileSettings
    
    updateActiveProfileSettings(newConfig);
    
    // For logging/response, get the full effective config again
    const updatedConfig = getEffectiveConfig();
    
    console.log('Settings saved for profile:', updatedConfig.activeProfile);
    if (updatedConfig.enableDevTools) {
             event.sender.closeDevTools();
             setTimeout(() => {
                event.sender.openDevTools({ mode: updatedConfig.devToolsMode || 'detach' });
             }, 100);
    } else {
             event.sender.closeDevTools();
    }
    event.sender.send('settings-updated', updatedConfig);
});

ipcMain.on('set-devtools-state', (event, { open, mode }) => {
    updateActiveProfileSettings({ enableDevTools: open, devToolsMode: mode });
    
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

ipcMain.handle('get-available-browsers', async () => {
    const browsersToCheck = [];
    if (process.platform === 'linux') {
        browsersToCheck.push(
            'google-chrome', 
            'microsoft-edge', 'microsoft-edge-dev', 'microsoft-edge-beta',
            'chromium', 'chromium-browser', 
            'brave-browser'
        );
    } else if (process.platform === 'darwin') {
        // macOS typically uses 'open -a "Name"'
        browsersToCheck.push('Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Chromium');
    } else if (process.platform === 'win32') {
        // Windows 'start' command names (not reliable for all, but common ones)
        browsersToCheck.push('chrome', 'msedge', 'brave');
    }

    const available = [];
    
    for (const browser of browsersToCheck) {
        try {
            if (process.platform === 'linux') {
                await new Promise((resolve, reject) => {
                    exec(`${browser} --version`, { timeout: 1000 }, (err) => { if (err) reject(err); else resolve(); });
                });
                available.push(browser);
            } else if (process.platform === 'darwin') {
                // Check if application exists in /Applications or ~/Applications? 
                // Easier: try 'mdfind' or just assume common ones exist? 
                // 'open -Ra' returns exit code 0 if app exists
                await new Promise((resolve, reject) => {
                    exec(`open -Ra "${browser}"`, (err) => { if (err) reject(err); else resolve(); });
                });
                available.push(browser);
            } else if (process.platform === 'win32') {
                // Windows is harder to detect without full path. 
                // For now, let's skip detection-before-launch on Windows or use 'where' for exe?
                // 'start' command works if it's in PATH or registered.
                // Simplified: just return them all on Windows? Or try 'where'.
                // 'where' works for executables (chrome.exe).
                await new Promise((resolve, reject) => {
                    exec(`where ${browser}`, (err) => { if (err) reject(err); else resolve(); });
                });
                available.push(browser);
            }
        } catch (e) {}
    }
    return available;
});

ipcMain.on('launch-browser', async (event, browser) => {
    const url = 'https://aistudio.google.com/prompts/new_chat';
    try {
        if (process.platform === 'linux') {
            const child = spawn(browser, [url], { detached: true, stdio: 'ignore' });
            child.unref();
        } else if (process.platform === 'darwin') {
            exec(`open -a "${browser}" "${url}"`);
        } else if (process.platform === 'win32') {
            exec(`start ${browser} "${url}"`);
        }
    } catch (e) {
        console.error('Failed to launch browser:', e);
        shell.openExternal(url);
    }
});

ipcMain.on('open-external-default', async () => {
    await shell.openExternal('https://aistudio.google.com/prompts/new_chat');
});

// Deprecated: kept for safety if UI not updated immediately, but mapped to new logic? 
// No, let's remove the listener entirely as we are updating UI too.
// ipcMain.on('open-external-login', ... REMOVED)


ipcMain.on('set-session-cookie', async (event, arg) => {
    try {
        // Handle both simple string (old) and object (new with accountIndex)
        let rawCookieValue = '';
        let accountIndex = '0';
        
        if (typeof arg === 'object' && arg !== null) {
            rawCookieValue = arg.cookie || '';
            accountIndex = arg.accountIndex || '0';
        } else {
            rawCookieValue = String(arg);
        }

        // Use the sender's session instead of defaultSession
        const currentSession = event.sender.session;
        
        await currentSession.clearStorageData({ storages: ['cookies'] });
        const setCookie = async (name, value) => {
            // Updated Logic: Make mostly ALL cookies accessible (httpOnly: false)
            // This ensures that SAPISID, APISID, __Secure-1PAPISID etc are definitely visible to client-side JS
            // which is critical for Google's auth token generation.
            // Hiding cookies (httpOnly: true) is a security feature, but for this specific wrapper app,
            // functionality is the priority. Google's scripts ignore extra visible cookies.
            
            // Note: We originally filtered for specific accessible cookies, but the list changes (e.g. __Secure-BUCKET).
            // A permissive approach is safer for functionality.
            
            const expirationDate = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365);
            const cookie = {
                url: 'https://google.com',
                name: name.trim(),
                value: value.trim(),
                domain: '.google.com',
                path: '/',
                secure: true,
                httpOnly: false, // Force accessible to JS
                sameSite: 'no_restriction',
                expirationDate: expirationDate
            };
            try { await currentSession.cookies.set(cookie); } catch (e) { console.error(e); }
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
        
        // Construct URL with account index
        const targetUrl = `https://aistudio.google.com/u/${accountIndex}/prompts/new_chat?model=gemini-3-pro-preview`;
        console.log(`Deep linking to account index ${accountIndex}: ${targetUrl}`);
        event.sender.loadURL(targetUrl);
    } catch (error) {
        console.error('Failed to process cookies:', error);
    }
});

function createWindow() {
    // Load Config
    // Use getEffectiveConfig to resolve per-profile settings
    const config = getEffectiveConfig();
    
    // Determine partition based on active profile
    // ARCHITECTURE CHANGE: Always use a named partition, even for 'default'.
    // This unifies storage logic and allows 'default' to be renamed/migrated just like any other profile.
    // Note: Moving from undefined (root) to 'persist:default' implies a one-time session reset for existing users.
    const partition = `persist:${config.activeProfile}`;

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
            preload: path.join(__dirname, 'preload.js'),
            partition: partition // Use the profile-specific partition
        }
    });

    // Set User-Agent to match real Chrome
    const getPlatformUA = () => {
        if (process.platform === 'darwin') return 'Macintosh; Intel Mac OS X 10_15_7';
        if (process.platform === 'win32') return 'Windows NT 10.0; Win64; x64';
        return 'X11; Linux x86_64';
    };
    
    // Using Chrome 144.0.0.0 as requested (matches 2026 era)
    const newUA = `Mozilla/5.0 (${getPlatformUA()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36`;
    
    console.log('Setting User-Agent to:', newUA);
    win.webContents.setUserAgent(newUA);

    // Auto Clear Cookies if enabled
    if (config.autoClearCookies) {
        console.log('Auto-clearing cookies on startup...');
        // Use win.webContents.session instead of defaultSession
        win.webContents.session.clearStorageData({ storages: ['cookies'] });
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
        const config = getEffectiveConfig();
        if (!config.enableDevTools) {
             // Logic update: We only want to update the setting for the current profile
             updateActiveProfileSettings({ enableDevTools: true });
             win.webContents.send('sync-devtools-state', true);
        }
    });

    win.webContents.on('devtools-closed', () => {
        const config = getEffectiveConfig();
        if (config.enableDevTools) {
             updateActiveProfileSettings({ enableDevTools: false });
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
        const config = getEffectiveConfig();
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

        // Always add Inspect Element for debugging
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            label: 'Inspect Element',
            click: () => {
                win.webContents.inspectElement(params.x, params.y);
            }
        }));
        
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

  // Handle notification request
  ipcMain.on('show-notification', (event, { title, body }) => {
    new Notification({ title, body }).show();
  });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
