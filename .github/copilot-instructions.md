# Google AI Studio Desktop - Copilot Instructions

## Project Overview
This is an Electron-based desktop wrapper for [Google AI Studio](https://aistudio.google.com). It provides a native-like experience with a frameless window, custom title bar, and specific configurations to ensure the web application loads correctly outside a standard browser environment.

## Architecture
- **Main Process (`main.js`)**: 
  - **Lifecycle**: Manages app lifecycle, window creation, and session persistence.
  - **Configuration**: Loads/saves settings to `config.json` in `userData` (handled via `loadConfig`/`saveConfig` helpers).
  - **Anti-Detection**: Applies critical Chrome switches (`disable-blink-features=AutomationControlled`, `disable-site-isolation-trials`) to prevents bot detection.
  - **I18n**: Loads translation files from `lang/*.json` and serves them via `ipcMain.handle('get-translations')`.
  - **IPC Handlers**: Manages window controls, navigation events, and profile switching.
- **Preload Script (`preload.js`)**: 
  - **Context Isolation**: Runs in an isolated context; uses `ipcRenderer` to bridge Renderer and Main.
  - **UI Injection**: Manually injects a custom HTML/CSS title bar (`#custom-title-bar`) into the DOM of the loaded external website.
  - **Anti-Detection**: Aggressively masks `navigator.webdriver` to undefined to avoid detection.
  - **I18n Client**: Requests translations on load and provides a `t(key)` helper for the injected UI.
- **Renderer**: 
  - The live URL `https://aistudio.google.com/prompts/new_chat` is loaded directly.
  - **Note**: The local `Google AI Studio.html` is a reference artifact, NOT the entry point.

## Key Workflows
- **Run Application**: `npm start` (executes `electron .`).
- **Build/Package**: Uses `electron-builder`.
  - Windows: `npm run build:win`
  - Linux: `npm run build:linux`
  - macOS: `npm run build:mac`
- **Debugging**: 
  - DevTools mode defaults to `detach`.
  - Console logs appear in terminal (Main) and DevTools console (Preload/Renderer).

## Conventions & Patterns
- **Frameless Window**: 
  - `BrowserWindow` created with `frame: false`.
  - Title bar logic is largely in `preload.js` (DOM creation, event listeners) communicating via IPC (e.g., `window-minimize`, `window-close`).
- **Internationalization (i18n)**:
  - Language files (e.g., `en.json`, `zh-TW.json`) reside in the `lang/` directory.
  - Main process loads these at startup. Renderer requests them via `invoke('get-translations')`.
  - Auto-detect loop: Config -> System Locale -> Fallback to 'en'.
- **Profile Management**:
  - Profiles are folder-based logical separations in `config.json`.
  - Switching profiles triggers `app.relaunch()` to ensure clean session state.
- **Security & Cookie Injection**:
  - **Problem**: Google blocks embedded logins.
  - **Solution**: "External Login" flow.
    1. User clicks Key icon (🔑) -> `showCookieModal()`.
    2. User authenticates in external browser.
    3. User manually pastes `__Secure-1PSID` cookie.
    4. IPC `set-session-cookie` sets it on `session.defaultSession`.

## Critical Implementation Details
- **User-Agent & Switches**: check `main.js` for the exact `app.commandLine.appendSwitch` calls. strict adherence is required for the app to function.
- **DOM Injection**: The title bar is purely DOM manipulation in `preload.js`. Ensure styles (z-index, positioning) don't conflict with Google AI Studio's native UI.
- **Config Persistence**: `config.json` schema includes `autoClearCookies`, `customHomePage`, `profiles`.

## Important Files
- `main.js`: Core logic, IPC implementation, Config/I18n loading.
- `preload.js`: UI injection, Anti-detection, I18n helper.
- `lang/`: JSON translation files.
