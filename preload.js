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
let translations = {};

// Async load translations
ipcRenderer.invoke('get-translations').then(data => {
    translations = data;
    console.log('Translations loaded:', Object.keys(translations));
}).catch(err => {
    console.error('Failed to load translations from main:', err);
});


function getLanguage() {
    if (!currentConfig) return 'en';
    let lang = currentConfig.language;
    if (lang === 'auto') {
        lang = navigator.language;
    }
    
    // Exact match
    if (translations[lang]) return lang;
    
    // Prefix match (e.g. es-ES -> es)
    const code = lang.split('-')[0];
    if (translations[code]) return code;
    
    // Special cases
    if (lang.toLowerCase().includes('zh')) {
        return (lang.toLowerCase().includes('tw') || lang.toLowerCase().includes('hk')) ? 'zh-TW' : 'zh-CN';
    }
    
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

    // Inject Google Fonts
    const fontPreconnect = document.createElement('link');
    fontPreconnect.rel = 'preconnect';
    fontPreconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontPreconnect);

    const fontPreconnectCdn = document.createElement('link');
    fontPreconnectCdn.rel = 'preconnect';
    fontPreconnectCdn.href = 'https://fonts.gstatic.com';
    fontPreconnectCdn.crossOrigin = 'anonymous';
    document.head.appendChild(fontPreconnectCdn);

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600;700&display=swap';
    document.head.appendChild(fontLink);

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
        /* Custom Scrollbar for Modals */
        .custom-dialog-scroll::-webkit-scrollbar {
            width: 8px;
        }
        .custom-dialog-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-dialog-scroll::-webkit-scrollbar-thumb {
            background-color: #5f6368;
            border-radius: 4px;
        }
        .custom-dialog-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #8ab4f8;
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
        background: #1f1f1f;
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
        font-family: 'Inter', sans-serif;
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
        font-family: 'Inter', sans-serif;
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
        font-family: 'Inter', sans-serif;
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
        background: rgba(0,0,0,0.6); 
        z-index: 1000000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: 'Inter', sans-serif;
    `;
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'mat-mdc-dialog-container mdc-dialog cdk-dialog-container mdc-dialog--open';
    dialogContainer.style.cssText = `
        background: #1f1f1f;
        border-radius: 8px;
        box-shadow: 0 11px 15px -7px #0003, 0 24px 38px 3px #00000024, 0 9px 46px 8px #0000001f;
        width: 500px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 24px 0 24px;
        margin-bottom: 20px;
    `;
    
    const title = document.createElement('div');
    title.className = 'title';
    title.style.cssText = `
        font-family: 'Inter Tight', sans-serif;
        font-size: 24px;
        font-weight: 500;
        line-height: 32px;
        color: #e8eaed;
    `;
    title.textContent = t('settings');
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-button ms-button-borderless ms-button-icon';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #e8eaed;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        font-size: 16px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.08)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => modal.remove();
    
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content (Scrollable)
    const content = document.createElement('div');
    content.className = 'mat-mdc-dialog-content mdc-dialog__content details-container custom-dialog-scroll';
    content.style.cssText = `
        padding: 0 24px 24px 24px;
        overflow-y: auto;
        flex-grow: 1;
    `;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.style.cssText = `
        padding: 16px 24px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid #3c4043;
    `;

    // Helper: Create Toggle Switch
    const createToggle = (isChecked, id) => {
        const wrapper = document.createElement('label');
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
            width: 36px;
            height: 14px;
            margin-left: 10px;
        `;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isChecked;
        if (id) input.id = id;
        input.style.cssText = `
            opacity: 0;
            width: 0;
            height: 0;
        `;
        
        const slider = document.createElement('span');
        slider.style.cssText = `
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #5f6368; /* Track Off */
            transition: .4s;
            border-radius: 14px;
            opacity: 0.5;
        `;
        
        const knob = document.createElement('span');
        knob.style.cssText = `
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 0px; 
            bottom: -3px; 
            background-color: #bdc1c6; /* Thumb Off */
            transition: .2s;
            border-radius: 50%;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.4);
        `;

        const updateState = () => {
            if (input.checked) {
                slider.style.backgroundColor = 'rgba(138, 180, 248, 0.5)'; // Track On
                knob.style.backgroundColor = '#8ab4f8'; // Thumb On
                knob.style.transform = 'translateX(20px)';
            } else {
                slider.style.backgroundColor = '#5f6368'; // Track Off
                knob.style.backgroundColor = '#bdc1c6'; // Thumb Off
                knob.style.transform = 'translateX(0)';
            }
        };

        input.addEventListener('change', updateState);
        // Initial state
        setTimeout(updateState, 0);

        wrapper.appendChild(input);
        wrapper.appendChild(slider);
        slider.appendChild(knob);
        
        return { wrapper, input };
    };

    // --- Section Helper ---
    const createSection = () => {
        const div = document.createElement('div');
        div.style.cssText = `
            margin-bottom: 24px;
        `;
        return div;
    };
    
    // --- Styles for Field Labels ---
    const labelStyle = `
        display: block;
        color: #e8eaed;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.1px;
        margin-bottom: 8px;
    `;
    
    // --- Styles for Inputs ---
    const inputStyle = `
        width: 100%;
        padding: 8px 12px;
        background: transparent;
        border: 1px solid #5f6368;
        color: #e8eaed;
        border-radius: 4px;
        box-sizing: border-box;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        outline: none;
    `;

    // Language Selector
    const langContainer = createSection();
    const langLabel = document.createElement('label');
    langLabel.textContent = t('language');
    langLabel.style.cssText = labelStyle;

    const langSelect = document.createElement('select');
    langSelect.style.cssText = inputStyle + ' cursor: pointer;';
    
    const languages = [
        { code: 'auto', label: t('system_default') },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
        { code: 'it', label: 'Italiano' },
        { code: 'pt', label: 'Português' },
        { code: 'nl', label: 'Nederlands' },
        { code: 'pl', label: 'Polski' },
        { code: 'tr', label: 'Türkçe' },
        { code: 'ru', label: 'Русский' },
        { code: 'vi', label: 'Tiếng Việt' },
        { code: 'ko', label: '한국어' },
        { code: 'ja', label: '日本語' },
        { code: 'zh-CN', label: '简体中文' },
        { code: 'zh-TW', label: '繁體中文' }
    ];

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.label;
        // Dark theme for dropdown options
        option.style.backgroundColor = '#1f1f1f';
        option.style.color = '#e8eaed';
        if (config.language === lang.code) option.selected = true;
        langSelect.appendChild(option);
    });
    // Add hover effect for select
    langSelect.onfocus = () => langSelect.style.borderColor = '#8ab4f8';
    langSelect.onblur = () => langSelect.style.borderColor = '#5f6368';

    langContainer.appendChild(langLabel);
    langContainer.appendChild(langSelect);


    // Toggles Section (Flex list)
    const toggleList = createSection();
    toggleList.style.display = 'flex';
    toggleList.style.flexDirection = 'column';
    toggleList.style.gap = '16px';

    const createToggleRow = (labelText, checkedState, id) => {
        const container = document.createElement('div');
        container.style.cssText = `display: flex; align-items: center; justify-content: space-between;`;
        
        const label = document.createElement('label');
        label.textContent = labelText;
        label.style.cssText = 'color: #e8eaed; font-size: 14px; flex-grow: 1;';
        
        const { wrapper, input } = createToggle(checkedState, id);
        container.appendChild(label);
        container.appendChild(wrapper);
        return { container, input };
    };

    const { container: autoClearRow, input: toggleInput } = createToggleRow(t('auto_clear_cookies'), config.autoClearCookies);
    const { container: notifRow, input: notifInput } = createToggleRow(t('enable_reply_notification'), config.enableReplyNotification !== false, 'notif-toggle');
    const { container: urlRow, input: urlToggleInput } = createToggleRow(t('show_url'), config.showUrlInTitleBar);
    const { container: devToolsRow, input: devToolsToggleInput } = createToggleRow(t('enable_devtools'), config.enableDevTools, 'settings-devtools-toggle');
    
    toggleList.appendChild(autoClearRow);
    toggleList.appendChild(notifRow);
    toggleList.appendChild(urlRow);
    toggleList.appendChild(devToolsRow);


    // DevTools Mode Selector (Hidden if disabled)
    const modeContainer = createSection();
    modeContainer.id = 'settings-devtools-mode-container'; 
    modeContainer.style.display = config.enableDevTools ? 'block' : 'none'; 

    const modeLabel = document.createElement('label');
    modeLabel.textContent = t('devtools_mode');
    modeLabel.style.cssText = labelStyle;

    const modeSelect = document.createElement('select');
    modeSelect.style.cssText = inputStyle + ' cursor: pointer;';

    const modes = [
        { code: 'detach', label: t('mode_detach') },
        { code: 'right', label: t('mode_right') },
        { code: 'bottom', label: t('mode_bottom') }
    ];

    modes.forEach(m => {
        const option = document.createElement('option');
        option.value = m.code;
        option.textContent = m.label;
        option.style.backgroundColor = '#1f1f1f';
        option.style.color = '#e8eaed';
        if ((config.devToolsMode || 'right') === m.code) option.selected = true;
        modeSelect.appendChild(option);
    });
    modeSelect.onfocus = () => modeSelect.style.borderColor = '#8ab4f8';
    modeSelect.onblur = () => modeSelect.style.borderColor = '#5f6368';

    modeContainer.appendChild(modeLabel);
    modeContainer.appendChild(modeSelect);

    // Immediate Toggle Logic for DevTools display
    const updateDevToolsState = () => {
        const isOpen = devToolsToggleInput.checked;
        const mode = modeSelect.value;
        modeContainer.style.display = isOpen ? 'block' : 'none';
        ipcRenderer.send('set-devtools-state', { open: isOpen, mode: mode });
    };
    
    devToolsToggleInput.onchange = updateDevToolsState;
    modeSelect.onchange = updateDevToolsState;


    // Startup Page Settings
    const homeContainer = createSection();
    const startupLabel = document.createElement('label');
    startupLabel.textContent = t('startup_page') || 'Startup Page';
    startupLabel.style.cssText = labelStyle;
    homeContainer.appendChild(startupLabel);

    const startupOptions = [
        { id: 'startup-home', value: 'home', label: t('startup_home') || 'Use Home Page' },
        { id: 'startup-custom', value: 'custom', label: t('startup_custom') || 'Custom URL' },
        { id: 'startup-last', value: 'last', label: t('startup_last') || 'Continue where I left off' }
    ];

    const currentStartupMode = config.startUpMode || 'home';
    let selectedMode = currentStartupMode;

    // Custom URL Input Wrapper
    const homeInputWrapper = document.createElement('div');
    homeInputWrapper.style.cssText = 'display: none; flex-direction: column; gap: 8px; margin-left: 24px; margin-top: 4px; margin-bottom: 12px;';

    const homeInput = document.createElement('input');
    homeInput.type = 'text';
    homeInput.value = config.customHomePage || '';
    homeInput.placeholder = 'https://...';
    homeInput.style.cssText = inputStyle + ' flex-grow: 1;';
    homeInput.onfocus = () => homeInput.style.borderColor = '#8ab4f8';
    homeInput.onblur = () => homeInput.style.borderColor = '#5f6368';
    
    // "Set Current" Button
    const setHomeBtn = document.createElement('button');
    setHomeBtn.textContent = '⌂ ' + (t('set_current_url') || 'Set Current'); 
    setHomeBtn.style.cssText = `
        padding: 0 16px;
        height: 36px;
        background: transparent;
        color: #8ab4f8;
        border: 1px solid #5f6368;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        display: flex;
        align-items: center;
        width: fit-content;
    `;
    setHomeBtn.onmouseenter = () => setHomeBtn.style.background = 'rgba(138, 180, 248, 0.08)';
    setHomeBtn.onmouseleave = () => setHomeBtn.style.background = 'transparent';
    
    setHomeBtn.onclick = () => {
        homeInput.value = window.location.href;
        const originalText = setHomeBtn.textContent;
        setHomeBtn.textContent = '✓ ' + (t('set_url_done') || 'Set');
        setTimeout(() => { setHomeBtn.textContent = originalText; }, 1000);
    };
    
    homeInputWrapper.appendChild(homeInput);
    homeInputWrapper.appendChild(setHomeBtn);

    // Create Radios
    startupOptions.forEach(opt => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'startup_mode';
        radio.value = opt.value;
        radio.id = opt.id;
        if (currentStartupMode === opt.value) radio.checked = true;
        radio.style.marginRight = '8px';
        radio.style.cursor = 'pointer';
        
        const label = document.createElement('label');
        label.textContent = opt.label;
        label.htmlFor = opt.id;
        label.style.cursor = 'pointer';
        label.style.fontSize = '14px';
        label.style.color = '#e8eaed';

        row.appendChild(radio);
        row.appendChild(label);
        homeContainer.appendChild(row);
        
        // Append input wrapper after 'custom' option
        if (opt.value === 'custom') {
            homeContainer.appendChild(homeInputWrapper);
        }

        radio.onchange = () => {
            selectedMode = radio.value;
            homeInputWrapper.style.display = (selectedMode === 'custom') ? 'flex' : 'none';
        };
    });
    
    // Init state
    if (currentStartupMode === 'custom') homeInputWrapper.style.display = 'flex';

    // Profile Management Section
    const profileContainer = createSection();
    profileContainer.style.borderTop = '1px solid #3c4043';
    profileContainer.style.paddingTop = '16px';

    const profileTitle = document.createElement('div');
    profileTitle.textContent = t('profiles');
    profileTitle.style.cssText = labelStyle;
    profileContainer.appendChild(profileTitle);

    // Profile List
    const profileListDiv = document.createElement('div');
    profileListDiv.style.marginBottom = '12px';
    
    // Create new profile UI
    const createProfileDiv = document.createElement('div');
    createProfileDiv.style.cssText = `display: flex; gap: 8px; margin-bottom: 16px;`;
    
    const newProfileInput = document.createElement('input');
    newProfileInput.type = 'text';
    newProfileInput.placeholder = t('profile_name');
    newProfileInput.style.cssText = inputStyle + ' flex-grow: 1;';
    newProfileInput.onfocus = () => newProfileInput.style.borderColor = '#8ab4f8';
    newProfileInput.onblur = () => newProfileInput.style.borderColor = '#5f6368';
    
    const createProfileBtn = document.createElement('button');
    createProfileBtn.textContent = t('create');
    createProfileBtn.style.cssText = `
        height: 36px; /* Match input height roughly */
        padding: 0 16px;
        background: #8ab4f8;
        color: #202124;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        white-space: nowrap;
    `;
    createProfileBtn.onmouseenter = () => createProfileBtn.style.background = '#aecbfa';
    createProfileBtn.onmouseleave = () => createProfileBtn.style.background = '#8ab4f8';
    
    createProfileBtn.onclick = () => {
        const name = newProfileInput.value.trim();
        if (name) {
            ipcRenderer.send('create-profile', name);
            newProfileInput.value = '';
        }
    };
    
    createProfileDiv.appendChild(newProfileInput);
    createProfileDiv.appendChild(createProfileBtn);
    profileContainer.appendChild(createProfileDiv);
    profileContainer.appendChild(profileListDiv);

    // Render Profiles (Updated Style)
    const renderProfiles = (profiles, active) => {
        profileListDiv.textContent = ''; 
        profiles.forEach(p => {
            const isActive = (p === active);

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #3c4043;
                padding: 12px 0;
            `;
            
            // Profile Image
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = 'width: 32px; height: 32px; margin-right: 12px; cursor: pointer; flex-shrink: 0; position: relative;';
            imgContainer.title = t('change_icon') || 'Change Icon';

            const img = document.createElement('img');
            img.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #5f6368; display: block;';
            const defaultAvatar = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8eaed'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E`;
            img.src = defaultAvatar;

            ipcRenderer.invoke('get-profile-image', p).then(dataUrl => {
                if (dataUrl) img.src = dataUrl;
            });
            
            imgContainer.onclick = async (e) => {
                e.stopPropagation(); 
                const newUrl = await ipcRenderer.invoke('select-profile-image', p);
                if (newUrl) img.src = newUrl;
            };

            const editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;';
            
            const editIcon = document.createElement('span');
            editIcon.textContent = '✎';
            editIcon.style.cssText = 'color:white; font-size:12px;';
            editOverlay.appendChild(editIcon);
            
            imgContainer.onmouseenter = () => editOverlay.style.opacity = '1';
            imgContainer.onmouseleave = () => editOverlay.style.opacity = '0';
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(editOverlay);
            row.appendChild(imgContainer);
            
            // Name Container
            const nameContainer = document.createElement('div');
            nameContainer.style.cssText = 'flex-grow: 1; margin-right: 12px; min-width: 0;';

            const nameSpan = document.createElement('div');
            nameSpan.textContent = p;
            nameSpan.style.cssText = `
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
                color: ${isActive ? '#8ab4f8' : '#e8eaed'};
                font-weight: ${isActive ? '500' : '400'};
                font-size: 14px;
            `;

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = p;
            nameInput.style.cssText = inputStyle + ' display: none;';
            nameInput.onfocus = () => nameInput.style.borderColor = '#8ab4f8';
            nameInput.onblur = () => nameInput.style.borderColor = '#5f6368';

            nameContainer.appendChild(nameSpan);
            nameContainer.appendChild(nameInput);
            
            // Actions
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';

            const actionBtnStyle = `
                background: transparent;
                border: 1px solid #5f6368;
                color: #e8eaed;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                padding: 4px 12px;
                height: 28px;
            `;

            const renameBtn = document.createElement('button');
            renameBtn.textContent = t('rename');
            renameBtn.style.cssText = actionBtnStyle;
            renameBtn.onmouseenter = () => renameBtn.style.background = 'rgba(255,255,255,0.05)';
            renameBtn.onmouseleave = () => renameBtn.style.background = 'transparent';

            const switchBtn = document.createElement('button');
            const deleteBtn = document.createElement('button');
            
            if (isActive) {
                switchBtn.textContent = 'Active'; 
                try { switchBtn.textContent = t('active'); } catch(e) {}
                switchBtn.style.cssText = actionBtnStyle + ' background: rgba(138, 180, 248, 0.1); color: #8ab4f8; border-color: transparent; cursor: default;';
                switchBtn.onmouseenter = null; 
                
                deleteBtn.style.display = 'none';
            } else {
                switchBtn.textContent = t('switch');
                switchBtn.style.cssText = actionBtnStyle;
                switchBtn.onmouseenter = () => switchBtn.style.background = 'rgba(255,255,255,0.05)';
                switchBtn.onmouseleave = () => switchBtn.style.background = 'transparent';
                switchBtn.onclick = () => {
                    if (confirm(`${t('switch_profile')} -> ${p}?`)) {
                        ipcRenderer.send('switch-profile', p);
                    }
                };

                deleteBtn.textContent = t('delete');
                deleteBtn.style.cssText = actionBtnStyle + ' color: #ff8a80; border-color: #ff8a80;';
                deleteBtn.onmouseenter = () => deleteBtn.style.background = 'rgba(255, 138, 128, 0.1)';
                deleteBtn.onmouseleave = () => deleteBtn.style.background = 'transparent';
                deleteBtn.onclick = () => {
                     const msg = t('delete_profile_confirm').replace('{0}', p);
                     if (confirm(msg)) {
                         ipcRenderer.send('delete-profile', p);
                     }
                };
            }

            // Edit Logic
            let isEditing = false;
            
            const cancelEdit = () => {
                isEditing = false;
                nameSpan.style.display = 'block';
                nameInput.style.display = 'none';
                nameInput.value = p;
                renameBtn.textContent = t('rename');
                switchBtn.style.display = 'block';
                if (!isActive) deleteBtn.style.display = 'block';
            };

            const confirmEdit = () => {
                const newName = nameInput.value.trim();
                // If Active, warn about restart
                if (isActive && newName && newName !== p) {
                     if (!confirm(`${t('rename')} "${p}" -> "${newName}" ?\n(App will restart)`)) {
                         cancelEdit();
                         return;
                     }
                }

                if (newName && newName !== p) {
                    ipcRenderer.send('rename-profile', { oldName: p, newName });
                }
                cancelEdit();
            };

            renameBtn.onclick = () => {
                if (isEditing) {
                    confirmEdit();
                } else {
                    isEditing = true;
                    nameSpan.style.display = 'none';
                    nameInput.style.display = 'block';
                    renameBtn.textContent = '✓'; // Confirm Icon
                    switchBtn.style.display = 'none';
                    deleteBtn.style.display = 'none';
                    nameInput.focus();
                    nameInput.select();
                }
            };
            
            nameInput.onkeydown = (e) => {
                if (e.key === 'Enter') confirmEdit();
                if (e.key === 'Escape') cancelEdit();
            };
            
            actionsDiv.appendChild(renameBtn);
            if (!isEditing) { 
                 actionsDiv.appendChild(switchBtn);
                 if (!isActive) actionsDiv.appendChild(deleteBtn);
            } else {
                switchBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                actionsDiv.appendChild(switchBtn);
                actionsDiv.appendChild(deleteBtn);
            }
            
            row.appendChild(nameContainer);
            row.appendChild(actionsDiv);
            profileListDiv.appendChild(row);
        });
    };
    
    // Initial Render
    renderProfiles(config.profiles || ['default'], config.activeProfile || 'default');
    
    // Listen for updates
    ipcRenderer.on('profiles-updated', (event, { profiles, activeProfile }) => {
        config.profiles = profiles;
        config.activeProfile = activeProfile;
        renderProfiles(profiles, activeProfile);
    });

    // Reset App Button (Dangerous Zone)
    const resetContainer = createSection();
    resetContainer.style.marginTop = '24px';
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '⚠ ' + t('reset_app');
    resetBtn.style.cssText = `
        width: 100%;
        padding: 12px;
        background: transparent;
        border: 1px solid #ff8a80;
        color: #ff8a80;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.2s;
    `;
    resetBtn.onmouseenter = () => resetBtn.style.background = 'rgba(255, 138, 128, 0.1)';
    resetBtn.onmouseleave = () => resetBtn.style.background = 'transparent';
    resetBtn.onclick = () => {
        ipcRenderer.send('reset-app-request', {
            title: t('reset_app'),
            message: t('reset_app_confirm'),
            detail: t('reset_app_detail'),
            confirm: 'OK',
            cancel: t('cancel')
        });
    };
    resetContainer.appendChild(resetBtn);

    // Cancel / Save Buttons
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('cancel');
    cancelBtn.style.cssText = `
        padding: 0 16px;
        height: 36px;
        background: transparent;
        color: #8ab4f8;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
    `;
    cancelBtn.onmouseenter = () => cancelBtn.style.background = 'rgba(138, 180, 248, 0.08)';
    cancelBtn.onmouseleave = () => cancelBtn.style.background = 'transparent';
    cancelBtn.onclick = () => modal.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('save');
    saveBtn.style.cssText = `
        padding: 0 16px;
        height: 36px;
        background: #8ab4f8; /* Primary */
        color: #202124;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
    `;
    saveBtn.onmouseenter = () => saveBtn.style.background = '#aecbfa';
    saveBtn.onmouseleave = () => saveBtn.style.background = '#8ab4f8';
    saveBtn.onclick = () => {
        const newConfig = {
            ...config,
            language: langSelect.value,
            autoClearCookies: toggleInput.checked,
            enableReplyNotification: notifInput.checked,
            showUrlInTitleBar: urlToggleInput.checked,
            enableDevTools: devToolsToggleInput.checked, 
            devToolsMode: modeSelect.value,
            customHomePage: homeInput.value.trim(),
            startUpMode: document.querySelector('input[name="startup_mode"]:checked').value
        };
        ipcRenderer.send('save-settings', newConfig);
        modal.remove();
        if (newConfig.language !== config.language) {
             ipcRenderer.send('nav-reload');
        }
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    content.appendChild(langContainer);
    content.appendChild(toggleList);
    content.appendChild(modeContainer);
    content.appendChild(homeContainer);
    content.appendChild(profileContainer); // Includes list inside
    content.appendChild(resetContainer);

    dialogContainer.appendChild(header);
    dialogContainer.appendChild(content);
    dialogContainer.appendChild(footer);
    
    modal.appendChild(dialogContainer);
    document.body.appendChild(modal);
}

async function showAboutModal() {
    if (document.getElementById('about-modal')) return;

    const config = await ipcRenderer.invoke('get-settings');
    const t = (key) => {
        let lang = config.language;
        if (lang === 'auto') {
            const sys = navigator.language;
            if (translations[sys]) {
                lang = sys;
            } else {
                const prefix = sys.split('-')[0];
                if (translations[prefix]) {
                    lang = prefix;
                } else if (sys.toLowerCase().includes('zh')) {
                    lang = (sys.toLowerCase().includes('tw') || sys.toLowerCase().includes('hk')) ? 'zh-TW' : 'zh-CN';
                } else {
                    lang = 'en';
                }
            }
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
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'mat-mdc-dialog-container mdc-dialog cdk-dialog-container mdc-dialog--open';
    dialogContainer.style.cssText = `
        background: #1f1f1f;
        border-radius: 8px;
        box-shadow: 0 11px 15px -7px #0003, 0 24px 38px 3px #00000024, 0 9px 46px 8px #0000001f;
        width: 400px;
        max-width: 90vw;
        max-height: 90vh;
        color: #e8eaed;
        display: flex;
        flex-direction: column;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 24px 0 24px;
        margin-bottom: 10px;
    `;
    const title = document.createElement('div');
    title.className = 'title';
    title.style.cssText = `
        font-family: 'Inter Tight', sans-serif;
        font-size: 24px;
        font-weight: 500;
        line-height: 32px;
        color: #e8eaed;
    `;
    title.textContent = t('about');
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #e8eaed;
        cursor: pointer;
        padding: 8px;
        font-size: 16px;
        border-radius: 50%;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.08)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'custom-dialog-scroll';
    content.style.cssText = 'padding: 0 24px 24px 24px; text-align: center; flex: 1; overflow-y: auto;';

    const desc = document.createElement('p');
    desc.textContent = t('about_desc');
    desc.style.color = '#bdc1c6';
    desc.style.lineHeight = '1.6';
    desc.style.marginBottom = '20px';

    const version = document.createElement('p');
    version.textContent = `${t('version')}: 1.5.0`;
    version.style.color = '#9aa0a6';
    version.style.fontSize = '0.9em';
    version.style.marginBottom = '24px';

    const repoLink = document.createElement('a');
    repoLink.href = '#';
    repoLink.textContent = t('repo_link');
    repoLink.style.cssText = `
        display: block;
        color: #8ab4f8;
        text-decoration: none;
        margin-bottom: 24px;
        font-weight: 500;
    `;
    repoLink.onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('open-external-link', 'https://github.com/Augus1217/Google-AI-Studio-Desktop');
    };

    const changelogLink = document.createElement('a');
    changelogLink.href = '#';
    changelogLink.textContent = t('view_changelog') || 'View Changelog'; 
    changelogLink.style.cssText = `
        display: block;
        color: #8ab4f8;
        text-decoration: none;
        margin-bottom: 24px;
        font-weight: 500;
    `;
    changelogLink.onclick = (e) => {
        e.preventDefault();
        showChangelogModal('1.5.0');
    };

    // Star Repo
    const starContainer = document.createElement('div');
    starContainer.style.background = 'rgba(251, 188, 4, 0.08)';
    starContainer.style.borderRadius = '8px';
    starContainer.style.border = '1px solid rgba(251, 188, 4, 0.2)';
    starContainer.style.padding = '12px';
    
    const starLink = document.createElement('a');
    starLink.href = '#';
    starLink.textContent = '★ ' + t('star_repo');
    starLink.style.cssText = `
        color: #fbbc04;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        display: block;
    `;
    starLink.onclick = (e) => {
        e.preventDefault();
        ipcRenderer.send('open-external-link', 'https://github.com/Augus1217/Google-AI-Studio-Desktop');
    };
    starContainer.appendChild(starLink);

    // Update Check Section
    const updateContainer = document.createElement('div');
    updateContainer.style.marginTop = '16px';
    updateContainer.style.textAlign = 'center';

    const checkBtn = document.createElement('button');
    checkBtn.textContent = t('check_for_updates') || 'Check for Updates';
    checkBtn.style.cssText = `
        background: transparent;
        border: 1px solid #5f6368;
        color: #e8eaed;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
    `;
    checkBtn.onmouseenter = () => checkBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
    checkBtn.onmouseleave = () => checkBtn.style.backgroundColor = 'transparent';

    const statusMsg = document.createElement('div');
    statusMsg.style.marginTop = '8px';
    statusMsg.style.fontSize = '13px';
    statusMsg.style.color = '#bdc1c6';
    statusMsg.style.display = 'none';

    checkBtn.onclick = async () => {
        checkBtn.disabled = true;
        checkBtn.textContent = t('checking_updates') || 'Checking...';
        statusMsg.style.display = 'none';

        try {
            const result = await ipcRenderer.invoke('check-for-updates');
            
            if (result.error) {
                 statusMsg.textContent = t('update_error') || 'Error';
                 statusMsg.style.color = '#ff8a80';
                 statusMsg.style.display = 'block';
                 checkBtn.textContent = t('check_for_updates');
                 checkBtn.disabled = false;
            } else if (result.updateAvailable) {
                 statusMsg.textContent = (t('update_available') || 'Update Available: {0}').replace('{0}', result.latestVersion);
                 statusMsg.style.color = '#8ab4f8';
                 statusMsg.style.display = 'block';
                 
                 checkBtn.textContent = t('download_update') || 'Download';
                 checkBtn.style.borderColor = '#8ab4f8';
                 checkBtn.style.color = '#8ab4f8';
                 checkBtn.disabled = false;
                 checkBtn.onclick = () => {
                     ipcRenderer.send('open-external-link', result.releaseUrl);
                 };
            } else {
                 statusMsg.textContent = t('no_update_found') || 'Latest version.';
                 statusMsg.style.color = '#81c995'; // Green
                 statusMsg.style.display = 'block';
                 checkBtn.textContent = t('check_for_updates');
                 checkBtn.disabled = false;
            }
        } catch (e) {
            checkBtn.disabled = false;
            checkBtn.textContent = t('check_for_updates');
        }
    };

    updateContainer.appendChild(checkBtn);
    updateContainer.appendChild(statusMsg);

    content.appendChild(desc);
    content.appendChild(version);
    content.appendChild(repoLink);
    content.appendChild(starContainer);
    content.appendChild(updateContainer);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 8px 24px 24px 24px;
        display: flex;
        justify-content: flex-end;
    `;
    const footerCloseBtn = document.createElement('button');
    footerCloseBtn.textContent = 'Close';
    footerCloseBtn.style.cssText = `
        padding: 0 24px;
        height: 36px;
        background: rgba(138, 180, 248, 0.1);
        color: #8ab4f8;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
    `;
    footerCloseBtn.onmouseenter = () => footerCloseBtn.style.background = 'rgba(138, 180, 248, 0.2)';
    footerCloseBtn.onmouseleave = () => footerCloseBtn.style.background = 'rgba(138, 180, 248, 0.1)';
    footerCloseBtn.onclick = () => modal.remove();
    footer.appendChild(footerCloseBtn);

    dialogContainer.appendChild(header);
    dialogContainer.appendChild(content);
    dialogContainer.appendChild(footer);
    
    modal.appendChild(dialogContainer);
    document.body.appendChild(modal);
}

function showChangelogModal(versionStr) {
    if (document.getElementById('changelog-modal')) return;

    // 1.5.0 Changelog
    const version = versionStr || '1.5.0';
    const features = [
        t('changelog_1'),
        t('changelog_2'),
        t('changelog_3'),
        t('changelog_4'),
        t('changelog_5')
    ];

    const modal = document.createElement('div');
    modal.id = 'changelog-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex;
        justify-content: center; align-items: center; z-index: 10001;
        font-family: 'Inter', sans-serif;
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const container = document.createElement('div');
    container.style.cssText = `
        background: #1f1f1f; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        width: 500px; max-width: 90vw; max-height: 85vh;
        color: #e8eaed; display: flex; flex-direction: column;
        border: 1px solid #3c4043;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding: 24px; border-bottom: 1px solid #3c4043; display: flex; justify-content: space-between; align-items: center;';
    
    const title = document.createElement('div');
    title.style.fontSize = '22px';
    title.style.fontWeight = '500';
    title.textContent = (t('changelog_title') || "What's New in v{0}").replace('{0}', version);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none; border:none; color:#9aa0a6; cursor:pointer; font-size:20px;';
    closeBtn.onclick = () => modal.remove();
    
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'custom-dialog-scroll';
    content.style.cssText = 'padding: 24px; overflow-y: auto; line-height: 1.6;';

    const list = document.createElement('ul');
    list.style.cssText = 'padding-left: 20px; margin: 0;';
    
    features.forEach(feat => {
        const item = document.createElement('li');
        item.textContent = feat;
        item.style.marginBottom = '12px';
        item.style.color = '#bdc1c6';
        list.appendChild(item);
    });

    content.appendChild(list);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 16px 24px; border-top: 1px solid #3c4043; display: flex; justify-content: flex-end;';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = t('changelog_close') || 'Awesome!';
    okBtn.style.cssText = `
        background: #8ab4f8; color: #202124; border: none;
        padding: 8px 24px; border-radius: 4px; font-weight: 500;
        cursor: pointer;
    `;
    okBtn.onclick = () => modal.remove();

    footer.appendChild(okBtn);
    
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);
    modal.appendChild(container);

    document.body.appendChild(modal);
}

function showUpdateCelebration(version) {
    // Container
    const overlay = document.createElement('div');
    overlay.id = 'update-celebration-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); z-index: 20000;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        cursor: pointer; opacity: 0; transition: opacity 0.5s ease;
        font-family: 'Inter', sans-serif; text-align: center;
    `;

    // Canvas for Confetti
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
    overlay.appendChild(canvas);

    // Text Content
    const title = document.createElement('h1');
    title.textContent = `Hurray! You've Updated To v${version}!`;
    title.style.cssText = `
        color: #fff; font-size: 36px; margin-bottom: 20px;
        text-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 1;
        transform: scale(0.8); opacity: 0; transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const subText = document.createElement('p');
    subText.textContent = "Click to View What's New In v1.5.0 ->";
    subText.style.cssText = `
        position: absolute; bottom: 80px;
        color: #8ab4f8; font-size: 16px; font-weight: 500;
        z-index: 1; opacity: 0;
        animation: pulseText 2s infinite ease-in-out;
    `;

    // Animation Keyframes
    if (!document.getElementById('celebration-styles')) {
        const style = document.createElement('style');
        style.id = 'celebration-styles';
        style.textContent = `
            @keyframes pulseText {
                0% { opacity: 0.6; transform: translateY(0); }
                50% { opacity: 1; transform: translateY(-5px); }
                100% { opacity: 0.6; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    overlay.appendChild(title);
    overlay.appendChild(subText);
    document.body.appendChild(overlay);

    // Confetti Logic
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const colors = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#FFFFFF']; // Google Colors

    function createParticle(x, y, velocityX, velocityY) {
        return {
            x: x, y: y,
            vx: velocityX, vy: velocityY,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: 0.4, // Heavier gravity to prevent them flying off-screen for too long
            friction: 0.99
        };
    }

    // Initial Burst (The "Bang!")
    function fireConfetti() {
        // Left Corner Explosion
        for (let i = 0; i < 150; i++) {
            particles.push(createParticle(
                0, height, 
                Math.random() * 20 + 5, // vx towards right
                -(Math.random() * 20 + 25) // vy reduced height (was 25+40) so they stay visible
            ));
        }
        // Right Corner Explosion
        for (let i = 0; i < 150; i++) {
            particles.push(createParticle(
                width, height, 
                -(Math.random() * 20 + 5), // vx towards left
                -(Math.random() * 20 + 25) // vy reduced height
            ));
        }
    }
    
    // Fire once immediately
    fireConfetti();

    // Cleanup logic (runs after 4 seconds to ensure everything handles gracefully, 
    // though particles will fall off naturally)
    setTimeout(() => {
        // Stop animation loop to save resources if users stare at it
        // cancelAnimationFrame(animationId);
    }, 4000);

    let animationId;
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.rotation += p.rotationSpeed;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            ctx.restore();
            
            if (p.y > height) {
                particles.splice(i, 1);
                i--;
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    animate();

    // Show contents
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        title.style.opacity = '1';
        title.style.transform = 'scale(1)';
        
        setTimeout(() => {
             subText.style.opacity = '1'; 
        }, 500);
    });

    // Cleanup and Proceed
    overlay.onclick = () => {
        cancelAnimationFrame(animationId);
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            showChangelogModal(version);
        }, 500);
    };
    
    // Handle Resize
    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });
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
        background: rgba(0,0,0,0.6);
        z-index: 1000000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-family: 'Inter', sans-serif;
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'mat-mdc-dialog-container';
    dialogContainer.style.cssText = `
        background: #1f1f1f;
        border-radius: 8px;
        box-shadow: 0 11px 15px -7px #0003, 0 24px 38px 3px #00000024, 0 9px 46px 8px #0000001f;
        width: 420px;
        max-width: 90vw;
        max-height: 90vh;
        color: #e8eaed;
        display: flex;
        flex-direction: column;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 24px 0 24px;
    `;
    const title = document.createElement('div');
    title.textContent = t('external_login');
    title.style.cssText = `
        font-family: 'Inter Tight', sans-serif;
        font-size: 24px;
        font-weight: 500;
        color: #e8eaed;
    `;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #e8eaed;
        cursor: pointer;
        padding: 8px;
        font-size: 16px;
        border-radius: 50%;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.08)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => modal.remove();
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'custom-dialog-scroll';
    content.style.cssText = 'padding: 20px 24px; font-size: 14px; flex: 1; overflow-y: auto;';

    const step1 = document.createElement('p');
    step1.textContent = t('login_step1');
    step1.style.cssText = 'margin: 0 0 12px 0; color: #e8eaed;';

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 20px;';
    
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Choose Browser... (Beta)';
    openBtn.style.cssText = `
        flex: 1; padding: 8px 12px; background: rgba(138, 180, 248, 0.1); 
        color: #8ab4f8; border: 1px solid rgba(138, 180, 248, 0.5); 
        border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
    `;

    // Browser List Dropdown
    const browserOptionsDiv = document.createElement('div');
    browserOptionsDiv.style.cssText = 'display: none; flex-direction: column; gap: 4px; margin-bottom: 20px; background: #303134; padding: 8px; border-radius: 4px; border: 1px solid #5f6368;';

    openBtn.onclick = async () => {
        if (browserOptionsDiv.style.display === 'flex') {
             browserOptionsDiv.style.display = 'none';
             return;
        }
        
        const originalText = openBtn.textContent;
        openBtn.textContent = 'Scanning...';
        openBtn.disabled = true;
        
        try {
            const browsers = await ipcRenderer.invoke('get-available-browsers');
            // browserOptionsDiv.innerHTML = ''; // Blocked by TrustedHTML
            while (browserOptionsDiv.firstChild) {
                browserOptionsDiv.removeChild(browserOptionsDiv.firstChild);
            }
            
            const createOption = (name, action) => {
                const btn = document.createElement('button');
                btn.textContent = name;
                btn.style.cssText = `
                    text-align: left; padding: 8px; background: transparent; 
                    color: #e8eaed; border: none; cursor: pointer; font-size: 13px;
                    border-radius: 4px; width: 100%; display: flex; align-items: center;
                `;
                btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
                btn.onmouseleave = () => btn.style.background = 'transparent';
                btn.onclick = () => {
                    action();
                    browserOptionsDiv.style.display = 'none';
                };
                browserOptionsDiv.appendChild(btn);
            };
            
            browsers.forEach(b => createOption(b, () => ipcRenderer.send('launch-browser', b)));
            
            browserOptionsDiv.style.display = 'flex';
        } catch(e) {
            console.error(e);
        } finally {
            openBtn.textContent = 'Choose Browser... (Beta)';
            openBtn.disabled = false;
        }
    };

    const copyBtn = document.createElement('button');
    copyBtn.textContent = t('copy_link');
    copyBtn.style.cssText = `
        padding: 8px 12px; background: transparent; 
        color: #e8eaed; border: 1px solid #5f6368; 
        border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
    `;
    copyBtn.onclick = () => {
        const url = 'https://aistudio.google.com/prompts/new_chat';
        navigator.clipboard.writeText(url).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    };
    buttonRow.appendChild(openBtn);
    buttonRow.appendChild(copyBtn);

    const step2 = document.createElement('p');
    const rawStep2 = t('login_step2');
    // Highlight the first line (Important warning)
    const splitIdx = rawStep2.indexOf('\n');
    
    step2.style.cssText = 'margin: 0 0 12px 0; color: #bdc1c6; line-height: 1.5; font-size: 13px; white-space: pre-wrap;';

    if (splitIdx !== -1) {
        const part1 = rawStep2.substring(0, splitIdx);
        const part2 = rawStep2.substring(splitIdx); // Includes the newline
        
        const warningSpan = document.createElement('span');
        warningSpan.textContent = part1;
        warningSpan.style.color = '#ff8a80'; // Red
        warningSpan.style.fontWeight = 'bold';
        
        step2.appendChild(warningSpan);
        step2.appendChild(document.createTextNode(part2));
    } else {
        step2.innerText = rawStep2;
    }

    const input = document.createElement('textarea'); 
    input.placeholder = t('paste_placeholder');
    input.style.cssText = `
        width: 100%; height: 60px; padding: 12px; 
        background: transparent; border: 1px solid #5f6368; 
        color: #e8eaed; border-radius: 4px; box-sizing: border-box; 
        font-family: monospace; font-size: 12px; resize: none; margin-bottom: 12px;
        outline: none;
    `;
    input.onfocus = () => input.style.borderColor = '#8ab4f8';
    input.onblur = () => input.style.borderColor = '#5f6368';

    // Account Index
    const indexContainer = document.createElement('div');
    indexContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    
    const indexLabel = document.createElement('span');
    indexLabel.textContent = t('account_index');
    indexLabel.style.color = '#e8eaed';

    const indexInput = document.createElement('input');
    indexInput.type = 'number';
    indexInput.min = '0';
    indexInput.value = '0';
    indexInput.style.cssText = `
        width: 50px; padding: 6px; background: transparent; 
        border: 1px solid #5f6368; color: #e8eaed; 
        border-radius: 4px; text-align: center;
    `;
    
    const indexHelp = document.createElement('span');
    indexHelp.textContent = '(' + t('account_index_help') + ')';
    indexHelp.style.color = '#9aa0a6';
    indexHelp.style.fontSize = '12px';

    indexContainer.appendChild(indexLabel);
    indexContainer.appendChild(indexInput);
    indexContainer.appendChild(indexHelp);

    content.appendChild(step1);
    content.appendChild(buttonRow);
    content.appendChild(browserOptionsDiv);
    content.appendChild(step2);
    content.appendChild(input);
    content.appendChild(indexContainer);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 16px 24px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid #3c4043;
    `;
    
    const footerCancel = document.createElement('button');
    footerCancel.textContent = t('cancel');
    footerCancel.style.cssText = `
        padding: 0 16px; height: 36px; background: transparent; 
        color: #8ab4f8; border: none; border-radius: 4px; 
        cursor: pointer; font-weight: 500;
    `;
    footerCancel.onmouseenter = () => footerCancel.style.background = 'rgba(138, 180, 248, 0.08)';
    footerCancel.onmouseleave = () => footerCancel.style.background = 'transparent';
    footerCancel.onclick = () => modal.remove();

    const footerLog = document.createElement('button');
    footerLog.textContent = t('login');
    footerLog.style.cssText = `
        padding: 0 16px; height: 36px; background: #8ab4f8; 
        color: #202124; border: none; border-radius: 4px; 
        cursor: pointer; font-weight: 500;
    `;
    footerLog.onmouseenter = () => footerLog.style.background = '#aecbfa';
    footerLog.onmouseleave = () => footerLog.style.background = '#8ab4f8';
    footerLog.onclick = () => {
        const cookieVal = input.value.trim();
        const accountIndex = indexInput.value.trim() || '0';
        if (cookieVal) {
            ipcRenderer.send('set-session-cookie', {
                cookie: cookieVal,
                accountIndex: accountIndex
            });
            modal.remove();
        }
    };

    footer.appendChild(footerCancel);
    footer.appendChild(footerLog);

    dialogContainer.appendChild(header);
    dialogContainer.appendChild(content);
    dialogContainer.appendChild(footer);
    
    modal.appendChild(dialogContainer);
    document.body.appendChild(modal);
}

window.addEventListener('DOMContentLoaded', () => {
    injectTitleBar();

    // Listen for login success event from main process
    ipcRenderer.on('login-success', () => {
        const tooltip = document.createElement('div');
        tooltip.textContent = t('login_success_tooltip');
        tooltip.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #1e8e3e; /* Google Green Darker */
            color: #ffffff;
            padding: 10px 20px;
            border-radius: 24px;
            font-family: 'Google Sans', 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
            pointer-events: none;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        // Add checkmark icon
        const icon = document.createElement('span');
        // TrustedHTML compliant SVG creation
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "currentColor");
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z");
        
        svg.appendChild(path);
        icon.appendChild(svg);
        
        tooltip.prepend(icon);

        document.body.appendChild(tooltip);

        // Animate in
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });

        // Remove after 4 seconds
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                tooltip.remove();
            }, 300);
        }, 4000);
    });

    // Listen for login failure event from main process
    ipcRenderer.on('login-failed', () => {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #d93025; /* Google Red 600 */
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Google Sans', 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        `;
        
        const messageRow = document.createElement('div');
        messageRow.style.display = 'flex';
        messageRow.style.alignItems = 'center';
        messageRow.style.gap = '8px';

        // Warning Icon
        const icon = document.createElement('span');
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "currentColor");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z");
        svg.appendChild(path);
        icon.appendChild(svg);
        
        const text = document.createElement('span');
        text.textContent = t('login_failed_tooltip');
        
        messageRow.appendChild(icon);
        messageRow.appendChild(text);

        const retryBtn = document.createElement('button');
        retryBtn.textContent = t('retry_login');
        retryBtn.style.cssText = `
            align-self: flex-end;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.5);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        retryBtn.onmouseover = () => retryBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        retryBtn.onmouseout = () => retryBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        retryBtn.onclick = () => {
            tooltip.remove();
            showCookieModal();
        };

        tooltip.appendChild(messageRow);
        tooltip.appendChild(retryBtn);
        document.body.appendChild(tooltip);

        // Animate in
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });

        // Auto remove after 10 seconds if no interaction
        setTimeout(() => {
            if (document.body.contains(tooltip)) {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateY(-10px)';
                setTimeout(() => tooltip.remove(), 300);
            }
        }, 10000);
    });

    // Listen for Changelog Show Request
    ipcRenderer.on('show-changelog', (event, version) => {
        showUpdateCelebration(version);
    });

    // Watch for DOM changes (SPA navigation/hydration might remove our bar)
    const observer = new MutationObserver((mutations) => {
        if (!document.getElementById('custom-title-bar')) {
            console.log('Title bar lost, reinjecting...');
            injectTitleBar();
        }
    });

    observer.observe(document.body, { childList: true, subtree: false });

    // --- Reply Notification Logic ---
    let wasGenerating = false;
    // We use a broader observer to catch deep DOM changes where the button text lives
    const replyObserver = new MutationObserver((mutations) => {
        // 1. Run Button Logic (Playground)
        const runButton = document.querySelector('button[mattooltipclass="run-button-tooltip"]');
        // 2. Chat UI Logic (Send/Stop)
        const sendButton = document.querySelector('button[aria-label="Send"]'); // Provided by user
        const stopButton = document.querySelector('button[aria-label*="Stop"]'); // Generic Stop for Chat

        if (runButton) {
            const buttonText = runButton.innerText.trim();
            // console.log('Run Button Text:', buttonText); // Debugging

            // "Run" button state matching (multilingual support might be needed later, but "Run" seems standard in the UI code provided)
            const isRunState = buttonText.includes('Run') || buttonText.includes('Run') || buttonText.includes('Exécuter'); 
            // Check for "Stop" or loading state. The user image shows "Stop".
            const isStopState = buttonText.includes('Stop') || buttonText.includes('Cancel') || runButton.getAttribute('aria-label')?.includes('Stop');

            if (isStopState) {
                if (!wasGenerating) {
                     console.log('AI started generating...');
                     wasGenerating = true;
                }
            } else if (isRunState) {
                // Trigger notification when transitioning from Generating -> Run
                // IMPORTANT: When the AI finishes, the button returns to "Run" but might be DISABLED 
                // because the text input is empty. We should trigger regardless of disabled state
                // as long as we were previously generating.
                if (wasGenerating) {
                    console.log('AI finished generating. Notification sent.');
                    
                    // Reset flag immediately to prevent duplicate triggers
                    wasGenerating = false; 
                    
                    if (currentConfig && currentConfig.enableReplyNotification !== false) {
                        ipcRenderer.send('show-notification', {
                            title: 'Google AI Studio',
                            body: t('notification_reply_finished') || 'AI Response Finished!'
                        });
                    }
                }
            }
        } else {
            // Chat UI Fallback
            if (stopButton) {
                if (!wasGenerating) {
                     console.log('AI started generating (Chat Mode)...');
                     wasGenerating = true;
                }
            } else if (sendButton) {
                 // The presence of the Send button (even if disabled) implies we are not generating
                 if (wasGenerating) {
                     console.log('AI finished generating (Chat Mode). Notification sent.');
                     wasGenerating = false;
                     if (currentConfig && currentConfig.enableReplyNotification !== false) {
                        ipcRenderer.send('show-notification', {
                            title: 'Google AI Studio',
                            body: t('notification_reply_finished') || 'AI Response Finished!'
                        });
                    }
                 }
            }
        }
    });

    // Observe the entire body for changes because frameworks like Angular/React rerender heavily
    replyObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-disabled', 'class', 'disabled'] });
});
