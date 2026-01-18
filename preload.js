const { ipcRenderer } = require('electron');

// Anti-detection: Aggressively remove the 'webdriver' property
try {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
    });
} catch (e) {
    console.error('Failed to mask webdriver:', e);
}

console.log('Preload script loaded');

// Translations
const translations = {
    'en': {
        'settings': 'Settings',
        'auto_clear_cookies': 'Auto Clear Cookies on Startup',
        'show_url': 'Show URL in Title Bar',
        'custom_home_page': 'Custom Home Page URL',
        'language': 'Language',
        'system_default': 'System Default',
        'save': 'Save',
        'cancel': 'Cancel',
        'external_login': 'External Login',
        'login_step1': '1. Open Google AI Studio in Chrome/Edge (NOT Firefox) and sign in.',
        'login_step2': '2. IMPORTANT: Use Chrome/Edge to get cookies.\nOpen DevTools (F12) -> Network.\nReload page -> Click "new_chat" request.\nHeaders -> Request Headers.\nCopy the ENTIRE "Cookie" value.',
        'paste_placeholder': 'Paste cookies here (key=value; key2=value2)...',
        'login': 'Login',
        'login_rejected_tooltip': 'Login Rejected? Click here to use External Login!',
        'reset_app': 'Reset App',
        'reset_app_confirm': 'Are you sure you want to reset the app? This will clear all data and restart.',
        'copy_link': 'Copy Link',
        'window_controls_position': 'Window Controls Position',
        'position_auto': 'Auto (OS Default)',
        'position_left': 'Left (macOS style)',
        'position_right': 'Right (Windows/Linux style)',
        'star_repo': 'If you found it useful, give our repo a star please! ⭐',
        'enable_devtools': 'Enable Developer Tools',
        'devtools_mode': 'DevTools Mode',
        'mode_detach': 'Detached (Separate Window)',
        'mode_right': 'Embedded (Right)',
        'mode_bottom': 'Embedded (Bottom)',
        'about': 'About',
        'about_desc': 'An electron-based desktop wrapper for Google AI Studio.',
        'repo_link': 'GitHub Repository',
        'version': 'Version'
    },
    'zh-TW': {
        'settings': '設定',
        'auto_clear_cookies': '啟動時自動清除 Cookie',
        'show_url': '在標題列顯示網址',
        'custom_home_page': '自訂首頁網址',
        'language': '語言',
        'system_default': '系統預設',
        'save': '儲存',
        'cancel': '取消',
        'external_login': '外部登入',
        'login_step1': '1. 在 Chrome/Edge (非 Firefox) 中開啟 Google AI Studio 並登入。',
        'login_step2': '2. 重要：請使用 Chrome/Edge 獲取 Cookie。\n開啟開發者工具 (F12) -> Network (網路)。\n重新載入頁面 -> 點擊 "new_chat" 請求。\nHeaders (標頭) -> Request Headers (請求標頭)。\n複製整個 "Cookie" 值。',
        'paste_placeholder': '在此貼上 Cookie (key=value; key2=value2)...',
        'login': '登入',
        'login_rejected_tooltip': '登入被拒？點擊此處使用外部登入！',
        'reset_app': '重置應用程式',
        'reset_app_confirm': '您確定要重置應用程式嗎？這將清除所有資料並重新啟動。',
        'copy_link': '複製連結',
        'window_controls_position': '視窗按鈕位置',
        'position_auto': '自動 (依作業系統)',
        'position_left': '左側 (macOS 風格)',
        'position_right': '右側 (Windows/Linux 風格)',
        'star_repo': '如果您覺得好用，請幫我們的專案按個星星！ ⭐',
        'enable_devtools': '啟用開發者工具',
        'devtools_mode': '開發者工具模式',
        'mode_detach': '獨立視窗',
        'mode_right': '嵌入視窗 (右側)',
        'mode_bottom': '嵌入視窗 (底部)',
        'about': '關於',
        'about_desc': 'Google AI Studio 的 Electron 桌面版封裝。',
        'repo_link': 'GitHub 儲存庫',
        'version': '版本'
    },
    'zh-CN': {
        'settings': '设置',
        'auto_clear_cookies': '启动时自动清除 Cookie',
        'show_url': '在标题栏显示网址',
        'custom_home_page': '自定义首页网址',
        'language': '语言',
        'system_default': '系统默认',
        'save': '保存',
        'cancel': '取消',
        'external_login': '外部登录',
        'login_step1': '1. 在 Chrome/Edge (非 Firefox) 中开启 Google AI Studio 并登录。',
        'login_step2': '2. 重要：请使用 Chrome/Edge 获取 Cookie。\n开启开发者工具 (F12) -> Network (网络)。\n重新加载页面 -> 点击 "new_chat" 请求。\nHeaders (标头) -> Request Headers (请求标头)。\n复制整个 "Cookie" 值。',
        'paste_placeholder': '在此粘贴 Cookie (key=value; key2=value2)...',
        'login': '登录',
        'login_rejected_tooltip': '登录被拒？点击此处使用外部登录！',
        'reset_app': '重置应用程序',
        'reset_app_confirm': '您确定要重置应用程序吗？这将清除所有数据并重新启动。',
        'copy_link': '复制链接',
        'window_controls_position': '窗口按钮位置',
        'position_auto': '自动 (依操作系统)',
        'position_left': '左侧 (macOS 风格)',
        'position_right': '右侧 (Windows/Linux 风格)',
        'star_repo': '如果您觉得好用，请帮我们的专案按个星星！ ⭐',
        'enable_devtools': '启用开发者工具',
        'devtools_mode': '开发者工具模式',
        'mode_detach': '独立窗口',
        'mode_right': '嵌入窗口 (右侧)',
        'mode_bottom': '嵌入窗口 (底部)',
        'about': '关于',
        'about_desc': 'Google AI Studio 的 Electron 桌面版封装。',
        'repo_link': 'GitHub 仓库',
        'version': '版本'
    },
    'ja': {
        'settings': '設定',
        'auto_clear_cookies': '起動時にCookieを自動消去',
        'show_url': 'タイトルバーにURLを表示',
        'custom_home_page': 'カスタムホームページURL',
        'language': '言語',
        'system_default': 'システムデフォルト',
        'save': '保存',
        'cancel': 'キャンセル',
        'external_login': '外部ログイン',
        'login_step1': '1. Chrome/Edge（Firefox以外）でGoogle AI Studioを開き、ログインします。',
        'login_step2': '2. 重要：Cookieを取得するにはChrome/Edgeを使用してください。\n開発者ツール（F12）-> Network（ネットワーク）を開きます。\nページをリロード -> "new_chat"リクエストをクリック。\nHeaders（ヘッダー）-> Request Headers（リクエストヘッダー）。\n"Cookie"の値をすべてコピーします。',
        'paste_placeholder': 'ここにCookieを貼り付けてください (key=value; key2=value2)...',
        'login': 'ログイン',
        'login_rejected_tooltip': 'ログインが拒否されましたか？ここをクリックして外部ログインを使用してください！',
        'reset_app': 'アプリをリセット',
        'reset_app_confirm': 'アプリをリセットしてもよろしいですか？すべてのデータが消去され、再起動します。',
        'copy_link': 'リンクをコピー',
        'window_controls_position': 'ウィンドウボタンの位置',
        'position_auto': '自動 (OSデフォルト)',
        'position_left': '左側 (macOSスタイル)',
        'position_right': '右側 (Windows/Linuxスタイル)',
        'star_repo': '役に立った場合は、リポジトリにスターをつけてください！ ⭐',
        'enable_devtools': '開発者ツールを有効にする',
        'devtools_mode': '開発者ツールモード',
        'mode_detach': '別ウィンドウ',
        'mode_right': '埋め込み (右側)',
        'mode_bottom': '埋め込み (下側)',
        'about': 'アプリについて',
        'about_desc': 'Google AI Studio の Electron デスクトップラッパー。',
        'repo_link': 'GitHub リポジトリ',
        'version': 'バージョン'
    }
};

let currentConfig = null;

function getLanguage() {
    if (!currentConfig) return 'en';
    let lang = currentConfig.language;
    if (lang === 'auto') {
        lang = navigator.language;
    }
    
    if (translations[lang]) return lang;
    if (lang.startsWith('zh')) {
        return lang.toLowerCase().includes('tw') || lang.toLowerCase().includes('hk') ? 'zh-TW' : 'zh-CN';
    }
    if (lang.startsWith('ja')) return 'ja';
    
    return 'en';
}

function t(key) {
    const lang = getLanguage();
    return translations[lang][key] || translations['en'][key] || key;
}

// Initialize config
ipcRenderer.invoke('get-settings').then(config => {
    currentConfig = config;
});

function injectTitleBar() {
    // Check if valid already exists
    if (document.getElementById('custom-title-bar')) return;

    console.log('Injecting title bar...');

    // Add Styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce-x {
            0% { transform: translateX(0); opacity: 0.5; }
            50% { transform: translateX(10px); opacity: 1; }
            100% { transform: translateX(0); opacity: 0.5; }
        }
        @keyframes slide-wave {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
        }
        .loading-dot {
            width: 6px;
            height: 6px;
            background-color: #8ab4f8; /* Google Blue */
            border-radius: 50%;
            margin-left: 8px;
            display: none;
            animation: bounce-x 1s infinite ease-in-out;
        }
        .completion-wave {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(138, 180, 248, 0.3), transparent);
            pointer-events: none;
            z-index: 100;
            opacity: 0;
            transform: translateX(-100%);
        }
    `;
    document.head.appendChild(style);

    const titleBar = document.createElement('div');
    titleBar.id = 'custom-title-bar';
    titleBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 32px;
        background: #202124;
        display: flex;
        justify-content: space-between;
        align-items: center;
        /* -webkit-app-region: drag; REMOVED: Native frame is active, no need for drag region */
        z-index: 999999; /* Higher z-index */
        box-sizing: border-box;
        padding: 0 10px;
        border-bottom: 1px solid #3c4043;
        pointer-events: auto; /* Ensure clickable */
        overflow: hidden; /* Clip the wave animation */
    `;

    const completionWave = document.createElement('div');
    completionWave.className = 'completion-wave';
    titleBar.appendChild(completionWave);

    const leftControls = document.createElement('div');
    leftControls.style.cssText = `
        display: flex;
        align-items: center;
        /* -webkit-app-region: no-drag; */
        z-index: 101; /* Above wave */
    `;

    const rightControls = document.createElement('div');
    rightControls.style.cssText = `
        display: flex;
        align-items: center;
        /* -webkit-app-region: no-drag; */
        z-index: 101; /* Above wave */
    `;

    const buttonStyle = `
        /* -webkit-app-region: no-drag; */
        min-width: 32px; /* Enforce min-width */
        height: 28px;
        border: none;
        background: transparent;
        color: #e8eaed;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 16px;
        margin: 0 2px;
        border-radius: 4px;
        padding: 0 4px;
    `;

    const createBtn = (text, action, hoverColor = 'rgba(255,255,255,0.1)', container = rightControls) => {
        const btn = document.createElement('button');
        btn.textContent = text; // Use textContent to avoid TrustedHTML issues
        btn.style.cssText = buttonStyle;
        btn.onmouseenter = () => btn.style.background = hoverColor;
        btn.onmouseleave = () => btn.style.background = 'transparent';
        
        if (typeof action === 'function') {
            btn.onclick = action;
        } else {
            btn.onclick = () => {
                console.log('Button clicked:', action);
                ipcRenderer.send(action);
            };
        }
        container.appendChild(btn);
        return btn;
    };

    // Helper for SVG icons
    const createSvgIcon = (pathData) => {
       const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
       svg.setAttribute('viewBox', '0 0 24 24');
       svg.setAttribute('width', '18');
       svg.setAttribute('height', '18');
       svg.setAttribute('fill', 'currentColor');
       const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
       path.setAttribute('d', pathData);
       svg.appendChild(path);
       return svg;
    };

    // Update createBtn to handle Element content
    const createBtnWithIcon = (iconOrText, action, hoverColor = 'rgba(255,255,255,0.1)', container = rightControls) => {
        const btn = document.createElement('button');
        btn.style.cssText = buttonStyle;
        
        if (typeof iconOrText === 'string') {
             btn.textContent = iconOrText;
        } else if (iconOrText instanceof Element) {
             btn.appendChild(iconOrText);
        }

        btn.onmouseenter = () => btn.style.background = hoverColor;
        btn.onmouseleave = () => btn.style.background = 'transparent';
        
        if (typeof action === 'function') {
            btn.onclick = action;
        } else {
            btn.onclick = () => {
                console.log('Button clicked:', action);
                ipcRenderer.send(action);
            };
        }
        container.appendChild(btn);
        return btn;
    };

    // Left: Back, Forward, Reload (Material Icons)
    createBtnWithIcon(createSvgIcon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'), 'nav-back', undefined, leftControls); // Arrow Back
    createBtnWithIcon(createSvgIcon('M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z'), 'nav-forward', undefined, leftControls); // Arrow Forward
    createBtnWithIcon(createSvgIcon('M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'), 'nav-reload', undefined, leftControls); // Refresh

    // Loading Indicator
    const loadingDot = document.createElement('div');
    loadingDot.className = 'loading-dot';
    leftControls.appendChild(loadingDot);

    // Right: Home, About, Settings, Key
    createBtnWithIcon(createSvgIcon('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'), 'nav-home', undefined, rightControls); // Home
    createBtnWithIcon(createSvgIcon('M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'), () => showAboutModal(), undefined, rightControls); // About
    createBtnWithIcon(createSvgIcon('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59-.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h-3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'), () => showSettingsModal(), undefined, rightControls); // Settings
    const keyBtn = createBtnWithIcon(createSvgIcon('M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z'), () => showCookieModal(), 'rgba(255,255,0,0.2)', rightControls);
    keyBtn.id = 'login-key-btn';

    // URL Display
    const urlDisplay = document.createElement('div');
    urlDisplay.id = 'url-display';
    urlDisplay.style.cssText = `
        flex-grow: 1;
        text-align: center;
        color: #9aa0a6;
        font-family: sans-serif;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0 20px;
        opacity: 0; /* Hidden by default */
        transition: opacity 0.2s;
        pointer-events: auto;
        -webkit-app-region: no-drag;
        -webkit-user-select: text;
        cursor: text;
        z-index: 101; /* Above wave */
    `;
    
    // Assemble
    titleBar.appendChild(leftControls);
    titleBar.appendChild(urlDisplay);
    titleBar.appendChild(rightControls);

    // Use documentElement to avoid body overwrites if possible, or force body prepend
    if (document.body) {
        document.body.prepend(titleBar);
        document.body.style.paddingTop = '32px';
    } else {
        console.error('Document body not found!');
    }

    // Initialize URL display state
    ipcRenderer.invoke('get-settings').then(config => {
        if (config.showUrlInTitleBar) {
            urlDisplay.style.opacity = '1';
            urlDisplay.textContent = window.location.href;
        }
    });

    // Loading State Listeners
    ipcRenderer.on('loading-start', () => {
        loadingDot.style.display = 'block';
        
        // Reset completion wave
        completionWave.style.opacity = '0';
        completionWave.style.animation = 'none';
        
        const svg = leftControls.querySelector('button:nth-child(3) svg');
        if (svg) svg.style.animation = 'spin 1s linear infinite';
    });

    ipcRenderer.on('loading-stop', () => {
        loadingDot.style.display = 'none';

        // Trigger completion wave
        completionWave.style.opacity = '1';
        completionWave.style.animation = 'slide-wave 0.6s ease-out forwards';

        const svg = leftControls.querySelector('button:nth-child(3) svg');
        if (svg) svg.style.animation = 'none';
    });

    // Add spin animation style for reload button
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `
        @keyframes spin { 
            100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } 
        }
    `;
    document.head.appendChild(spinStyle);
}

// Listen for URL updates
ipcRenderer.on('url-changed', (event, url) => {
    const urlDisplay = document.getElementById('url-display');
    if (urlDisplay) {
        urlDisplay.textContent = url;
    }

    // Check for rejected login
    if (url.includes('accounts.google.com/v3/signin/rejected')) {
        showLoginGuidance();
    } else {
        hideLoginGuidance();
    }
});

function showLoginGuidance() {
    const keyBtn = document.getElementById('login-key-btn');
    if (!keyBtn) return;

    // 1. Highlight Button
    keyBtn.style.boxShadow = '0 0 10px #fbbc04';
    keyBtn.style.border = '1px solid #fbbc04';
    keyBtn.style.animation = 'pulse 1.5s infinite';

    // Add keyframes if not exists
    if (!document.getElementById('key-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'key-pulse-style';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 188, 4, 0.7); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(251, 188, 4, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 188, 4, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Show Tooltip
    if (document.getElementById('login-guidance-tooltip')) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'login-guidance-tooltip';
    tooltip.textContent = t('login_rejected_tooltip');
    tooltip.style.cssText = `
        position: fixed;
        top: 40px;
        right: 100px;
        background: #fbbc04;
        color: #202124;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: sans-serif;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        pointer-events: none;
    `;
    
    // Arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: absolute;
        top: -6px;
        right: 14px;
        width: 0; 
        height: 0; 
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid #fbbc04;
    `;
    tooltip.appendChild(arrow);
    
    document.body.appendChild(tooltip);
    
    // Position correctly relative to button
    const rect = keyBtn.getBoundingClientRect();
    // Align tooltip right edge near button right edge
    tooltip.style.right = (window.innerWidth - rect.right - 10) + 'px';
}

function hideLoginGuidance() {
    const keyBtn = document.getElementById('login-key-btn');
    if (keyBtn) {
        keyBtn.style.boxShadow = 'none';
        keyBtn.style.border = 'none';
        keyBtn.style.animation = 'none';
    }
    const tooltip = document.getElementById('login-guidance-tooltip');
    if (tooltip) tooltip.remove();
}

// Listen for settings updates
ipcRenderer.on('settings-updated', (event, config) => {
    currentConfig = config; // Update local config
    const urlDisplay = document.getElementById('url-display');
    if (urlDisplay) {
        urlDisplay.style.opacity = config.showUrlInTitleBar ? '1' : '0';
        if (config.showUrlInTitleBar) {
            urlDisplay.textContent = window.location.href;
        }
    }
    // Reload to apply language changes if needed
    // For now, we just update the config. A full reload is better for language.
    if (document.getElementById('settings-modal')) {
        document.getElementById('settings-modal').remove();
        showSettingsModal();
    }
});

// Sync DevTools state (e.g., when closed via 'X')
ipcRenderer.on('sync-devtools-state', (event, isOpen) => {
    const toggle = document.getElementById('settings-devtools-toggle');
    const modeContainer = document.getElementById('settings-devtools-mode-container');
    
    if (toggle) {
        toggle.checked = isOpen;
    }
    
    if (modeContainer) {
        modeContainer.style.display = isOpen ? 'block' : 'none';
    }
});

async function showSettingsModal() {
    if (document.getElementById('settings-modal')) return;

    // Load current settings
    const config = await ipcRenderer.invoke('get-settings');

    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 1000000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #202124;
        padding: 30px;
        border-radius: 8px;
        border: 1px solid #5f6368;
        width: 400px;
        max-width: 90%;
    `;

    const title = document.createElement('h2');
    title.textContent = t('settings');
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';

    // Language Selector
    const langContainer = document.createElement('div');
    langContainer.style.marginBottom = '20px';
    
    const langLabel = document.createElement('label');
    langLabel.textContent = t('language');
    langLabel.style.display = 'block';
    langLabel.style.marginBottom = '8px';

    const langSelect = document.createElement('select');
    langSelect.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #303134;
        border: 1px solid #5f6368;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
    `;
    
    const languages = [
        { code: 'auto', label: t('system_default') },
        { code: 'en', label: 'English' },
        { code: 'zh-TW', label: '繁體中文' },
        { code: 'zh-CN', label: '简体中文' },
        { code: 'ja', label: '日本語' }
    ];

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.label;
        if (config.language === lang.code) option.selected = true;
        langSelect.appendChild(option);
    });

    langContainer.appendChild(langLabel);
    langContainer.appendChild(langSelect);

    // Auto Clear Cookies Toggle
    const toggleContainer = document.createElement('div');
    toggleContainer.style.marginBottom = '20px';
    toggleContainer.style.display = 'flex';
    toggleContainer.style.alignItems = 'center';

    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = t('auto_clear_cookies');
    toggleLabel.style.flexGrow = '1';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = config.autoClearCookies;
    
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleInput);

    // Show URL in Title Bar Toggle
    const urlToggleContainer = document.createElement('div');
    urlToggleContainer.style.marginBottom = '20px';
    urlToggleContainer.style.display = 'flex';
    urlToggleContainer.style.alignItems = 'center';

    const urlToggleLabel = document.createElement('label');
    urlToggleLabel.textContent = t('show_url');
    urlToggleLabel.style.flexGrow = '1';

    const urlToggleInput = document.createElement('input');
    urlToggleInput.type = 'checkbox';
    urlToggleInput.checked = config.showUrlInTitleBar;
    
    urlToggleContainer.appendChild(urlToggleLabel);
    urlToggleContainer.appendChild(urlToggleInput);

    // Enable DevTools Toggle
    const devToolsToggleContainer = document.createElement('div');
    devToolsToggleContainer.style.marginBottom = '20px';
    devToolsToggleContainer.style.display = 'flex';
    devToolsToggleContainer.style.alignItems = 'center';

    const devToolsToggleLabel = document.createElement('label');
    devToolsToggleLabel.textContent = t('enable_devtools');
    devToolsToggleLabel.style.flexGrow = '1';

    const devToolsToggleInput = document.createElement('input');
    devToolsToggleInput.type = 'checkbox';
    devToolsToggleInput.id = 'settings-devtools-toggle'; // ID for sync
    devToolsToggleInput.checked = config.enableDevTools;
    
    devToolsToggleContainer.appendChild(devToolsToggleLabel);
    devToolsToggleContainer.appendChild(devToolsToggleInput);

    // DevTools Mode Selector (Hidden if disabled)
    const modeContainer = document.createElement('div');
    modeContainer.id = 'settings-devtools-mode-container'; // ID for sync
    modeContainer.style.marginBottom = '20px';
    modeContainer.style.display = config.enableDevTools ? 'block' : 'none'; // Initial state

    const modeLabel = document.createElement('label');
    modeLabel.textContent = t('devtools_mode');
    modeLabel.style.display = 'block';
    modeLabel.style.marginBottom = '8px';

    const modeSelect = document.createElement('select');
    modeSelect.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #303134;
        border: 1px solid #5f6368;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
    `;

    const modes = [
        { code: 'detach', label: t('mode_detach') },
        { code: 'right', label: t('mode_right') },
        { code: 'bottom', label: t('mode_bottom') }
    ];

    modes.forEach(m => {
        const option = document.createElement('option');
        option.value = m.code;
        option.textContent = m.label;
        if ((config.devToolsMode || 'detach') === m.code) option.selected = true;
        modeSelect.appendChild(option);
    });

    modeContainer.appendChild(modeLabel);
    modeContainer.appendChild(modeSelect);

    // Immediate Toggle Logic
    const updateDevToolsState = () => {
        const isOpen = devToolsToggleInput.checked;
        const mode = modeSelect.value;
        modeContainer.style.display = isOpen ? 'block' : 'none';
        ipcRenderer.send('set-devtools-state', { open: isOpen, mode: mode });
    };
    
    devToolsToggleInput.onchange = updateDevToolsState;
    modeSelect.onchange = updateDevToolsState;

    // Custom Home Page Input
    const homeContainer = document.createElement('div');
    homeContainer.style.marginBottom = '20px';

    const homeLabel = document.createElement('label');
    homeLabel.textContent = t('custom_home_page');
    homeLabel.style.display = 'block';
    homeLabel.style.marginBottom = '8px';

    const homeInput = document.createElement('input');
    homeInput.type = 'text';
    homeInput.value = config.customHomePage || '';
    homeInput.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #303134;
        border: 1px solid #5f6368;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
    `;

    homeContainer.appendChild(homeLabel);
    homeContainer.appendChild(homeInput);

    // Reset App Button
    const resetContainer = document.createElement('div');
    resetContainer.style.marginBottom = '20px';
    resetContainer.style.borderTop = '1px solid #3c4043';
    resetContainer.style.paddingTop = '20px';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = t('reset_app');
    resetBtn.style.cssText = `
        width: 100%;
        padding: 10px;
        background: #5c1818; /* Dark red background */
        border: 1px solid #e81123;
        color: #ffcccc;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
    `;
    resetBtn.onmouseenter = () => resetBtn.style.background = '#7a1e1e';
    resetBtn.onmouseleave = () => resetBtn.style.background = '#5c1818';
    
    resetBtn.onclick = () => {
        if (confirm(t('reset_app_confirm'))) {
            ipcRenderer.send('reset-app');
        }
    };

    resetContainer.appendChild(resetBtn);

    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('cancel');
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #5f6368;
        color: #e8eaed;
        border-radius: 4px;
        cursor: pointer;
    `;
    cancelBtn.onclick = () => modal.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('save');
    saveBtn.style.cssText = `
        padding: 8px 16px;
        background: #8ab4f8;
        border: none;
        color: #202124;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    saveBtn.onclick = () => {
        const newConfig = {
            language: langSelect.value,
            autoClearCookies: toggleInput.checked,
            showUrlInTitleBar: urlToggleInput.checked,
            enableDevTools: devToolsToggleInput.checked, 
            devToolsMode: modeSelect.value, // Save DevTools mode
            customHomePage: homeInput.value.trim()
        };
        ipcRenderer.send('save-settings', newConfig);
        modal.remove();
        // Reload to apply language changes
        if (newConfig.language !== config.language) {
             ipcRenderer.send('nav-reload');
        }
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(saveBtn);

    content.appendChild(title);
    content.appendChild(langContainer);
    content.appendChild(toggleContainer);
    content.appendChild(urlToggleContainer);
    content.appendChild(devToolsToggleContainer); 
    content.appendChild(modeContainer); // Add Mode Selector
    content.appendChild(homeContainer);
    content.appendChild(resetContainer);
    content.appendChild(btnContainer);
    modal.appendChild(content);

    document.body.appendChild(modal);
}

async function showAboutModal() {
    if (document.getElementById('about-modal')) return;

    const config = await ipcRenderer.invoke('get-settings');
    
    // Translation Helper (Scoped)
    const t = (key) => {
        let lang = config.language;
        if (lang === 'auto') {
            const sysLocale = navigator.language;
            if (sysLocale.startsWith('zh-TW') || sysLocale.startsWith('zh-HK')) lang = 'zh-TW';
            else if (sysLocale.startsWith('zh')) lang = 'zh-CN';
            else if (sysLocale.startsWith('ja')) lang = 'ja';
            else lang = 'en';
        }
        return (translations[lang] && translations[lang][key]) || translations['en'][key] || key;
    };

    const modal = document.createElement('div');
    modal.id = 'about-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #202124;
        padding: 30px;
        border-radius: 8px;
        width: 400px;
        color: #e8eaed;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        font-family: 'Google Sans', sans-serif;
        text-align: center;
        border: 1px solid #5f6368;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = t('about');
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.color = '#e8eaed';

    // Description
    const desc = document.createElement('p');
    desc.textContent = t('about_desc');
    desc.style.color = '#bdc1c6';
    desc.style.lineHeight = '1.6';
    desc.style.marginBottom = '20px';

    // Version
    const version = document.createElement('p');
    version.textContent = `${t('version')}: 1.0.0`;
    version.style.color = '#9aa0a6';
    version.style.fontSize = '0.9em';
    version.style.marginBottom = '30px';

    // Repo Link
    const repoLink = document.createElement('a');
    repoLink.href = '#';
    repoLink.textContent = t('repo_link');
    repoLink.style.cssText = `
        display: block;
        color: #8ab4f8;
        text-decoration: none;
        margin-bottom: 20px;
        font-weight: 500;
    `;
    repoLink.onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('open-external-link', 'https://github.com/Augus1217/Google-AI-Studio-Desktop');
    };

    // Star Repo (Ad)
    const starContainer = document.createElement('div');
    starContainer.style.marginBottom = '20px';
    starContainer.style.padding = '15px';
    starContainer.style.background = 'rgba(251, 188, 4, 0.1)';
    starContainer.style.borderRadius = '8px';
    starContainer.style.border = '1px solid rgba(251, 188, 4, 0.3)';

    const starLink = document.createElement('a');
    starLink.href = '#';
    starLink.textContent = t('star_repo');
    starLink.style.cssText = `
        color: #fbbc04; /* Google Yellow */
        text-decoration: none;
        font-size: 14px;
        font-weight: bold;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    `;
    starLink.onmouseenter = () => starLink.style.opacity = '0.8';
    starLink.onmouseleave = () => starLink.style.opacity = '1';
    starLink.onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('open-external-link', 'https://github.com/Augus1217/Google-AI-Studio-Desktop');
    };
    
    starContainer.appendChild(starLink);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
        padding: 8px 24px;
        background: #8ab4f8;
        border: none;
        color: #202124;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = '#aecbfa';
    closeBtn.onmouseleave = () => closeBtn.style.background = '#8ab4f8';
    closeBtn.onclick = () => modal.remove();

    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(repoLink);
    content.appendChild(version);
    content.appendChild(starContainer);
    content.appendChild(closeBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function showCookieModal() {
    if (document.getElementById('cookie-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'cookie-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 1000000;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #202124;
        padding: 30px;
        border-radius: 8px;
        border: 1px solid #5f6368;
        width: 400px;
        max-width: 90%;
        text-align: center;
    `;

    const title = document.createElement('h2');
    title.textContent = t('external_login');
    title.style.marginBottom = '20px';

    const step1 = document.createElement('p');
    step1.textContent = t('login_step1');
    // Note: The link logic is embedded in the text for simplicity in translation, 
    // but ideally we should split it. For now, let's just append the link handler if needed
    // or simplify the translation to include the instruction.
    // The previous code had a link element. Let's recreate it properly.
    
    // Re-implementing step 1 with link logic is tricky with simple key-value translation.
    // Let's simplify: The translation contains the full text. We will just make the whole text clickable or add a button.
    // Actually, let's keep the link separate if possible.
    // For now, I will use the translated text as is.
    
    // To keep the "Open Google AI Studio" link working, we might need to parse the translation or just add a button below.
    // Let's add a button for opening the browser instead of a text link to make it cleaner.
    
    const linkContainer = document.createElement('div');
    linkContainer.style.display = 'flex';
    linkContainer.style.justifyContent = 'center';
    linkContainer.style.gap = '10px';
    linkContainer.style.margin = '10px auto';

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open Google AI Studio';
    openBtn.style.cssText = `
        padding: 8px 12px;
        background: #303134;
        border: 1px solid #5f6368;
        color: #8ab4f8;
        border-radius: 4px;
        cursor: pointer;
    `;
    openBtn.onclick = () => ipcRenderer.send('open-external-login');

    const copyBtn = document.createElement('button');
    copyBtn.textContent = t('copy_link');
    copyBtn.style.cssText = `
        padding: 8px 12px;
        background: #303134;
        border: 1px solid #5f6368;
        color: #e8eaed;
        border-radius: 4px;
        cursor: pointer;
    `;
    copyBtn.onclick = () => {
        const url = 'https://aistudio.google.com/prompts/new_chat';
        navigator.clipboard.writeText(url).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    };

    linkContainer.appendChild(openBtn);
    linkContainer.appendChild(copyBtn);

    const step2 = document.createElement('p');
    step2.innerText = t('login_step2'); // Use innerText to handle \n
    step2.style.margin = '15px 0';
    step2.style.lineHeight = '1.5';
    step2.style.fontSize = '0.9em';
    step2.style.color = '#bdc1c6';
    step2.style.textAlign = 'left';

    const input = document.createElement('input');
    input.placeholder = t('paste_placeholder');
    input.style.cssText = `
        width: 100%;
        padding: 10px;
        margin: 20px 0;
        background: #303134;
        border: 1px solid #5f6368;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
    `;

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('cancel');
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #5f6368;
        color: #e8eaed;
        border-radius: 4px;
        cursor: pointer;
    `;
    cancelBtn.onclick = () => modal.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('login');
    saveBtn.style.cssText = `
        padding: 8px 16px;
        background: #8ab4f8;
        border: none;
        color: #202124;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    saveBtn.onclick = () => {
        const cookieVal = input.value.trim();
        if (cookieVal) {
            ipcRenderer.send('set-session-cookie', cookieVal);
            modal.remove();
        }
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(saveBtn);

    content.appendChild(title);
    content.appendChild(step1);
    content.appendChild(linkContainer);
    content.appendChild(step2);
    content.appendChild(input);
    content.appendChild(btnContainer);
    modal.appendChild(content);

    document.body.appendChild(modal);
}

window.addEventListener('DOMContentLoaded', () => {
    injectTitleBar();

    // Watch for DOM changes (SPA navigation/hydration might remove our bar)
    const observer = new MutationObserver((mutations) => {
        if (!document.getElementById('custom-title-bar')) {
            console.log('Title bar lost, reinjecting...');
            injectTitleBar();
        }
    });

    observer.observe(document.body, { childList: true, subtree: false });
});
