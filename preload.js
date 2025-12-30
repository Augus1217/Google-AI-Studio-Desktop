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
        'copy_link': 'Copy Link'
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
        'copy_link': '複製連結'
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
        'copy_link': '复制链接'
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
        'copy_link': 'リンクをコピー'
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
        -webkit-app-region: drag;
        z-index: 999999; /* Higher z-index */
        box-sizing: border-box;
        padding: 0 10px;
        border-bottom: 1px solid #3c4043;
        pointer-events: auto; /* Ensure clickable */
    `;

    const leftControls = document.createElement('div');
    leftControls.style.cssText = `
        display: flex;
        align-items: center;
        -webkit-app-region: no-drag;
    `;

    const rightControls = document.createElement('div');
    rightControls.style.cssText = `
        display: flex;
        align-items: center;
        -webkit-app-region: no-drag;
    `;

    const buttonStyle = `
        -webkit-app-region: no-drag;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #e8eaed;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-family: sans-serif;
        font-size: 14px;
        margin: 0 2px;
        border-radius: 4px;
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

    // Left Controls: Back, Forward, Reload, Home, Settings
    createBtn('←', 'nav-back', undefined, leftControls);
    createBtn('→', 'nav-forward', undefined, leftControls);
    createBtn('↻', 'nav-reload', undefined, leftControls);
    createBtn('🏠', 'nav-home', undefined, leftControls);
    createBtn('⚙️', () => showSettingsModal(), undefined, leftControls);

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
    `;
    titleBar.appendChild(urlDisplay);

    // Right Controls: Key, Min, Max, Close
    const keyBtn = createBtn('🔑', () => showCookieModal(), 'rgba(255,255,0,0.2)', rightControls);
    keyBtn.id = 'login-key-btn';
    
    createBtn('−', 'window-minimize', undefined, rightControls);
    createBtn('□', 'window-maximize', undefined, rightControls);
    createBtn('✕', 'window-close', '#e81123', rightControls);

    titleBar.appendChild(leftControls);
    titleBar.appendChild(urlDisplay); // Insert between controls
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
    content.appendChild(homeContainer);
    content.appendChild(resetContainer);
    content.appendChild(btnContainer);
    modal.appendChild(content);

    document.body.appendChild(modal);
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
