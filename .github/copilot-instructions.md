# Google AI Studio Desktop - Copilot Instructions

## Project Overview
This is an Electron-based desktop wrapper for [Google AI Studio](https://aistudio.google.com). It provides a native-like experience with a frameless window, custom title bar, and specific configurations to ensure the web application loads correctly outside a standard browser environment.

## Architecture
- **Main Process (`main.js`)**: 
  - Manages application lifecycle and window creation.
  - **Critical**: Applies Chrome command-line switches (e.g., `disable-blink-features=AutomationControlled`) and a custom User-Agent to prevent Google from blocking the login/app as an automated bot.
  - Handles IPC events for window management (minimize, maximize, close) and session cookie injection.
- **Preload Script (`preload.js`)**: 
  - Runs in an isolated context with access to Node.js APIs via `ipcRenderer`.
  - **UI Injection**: Manually injects a custom HTML/CSS title bar into the DOM of the loaded external website.
  - **Anti-Detection**: Aggressively masks `navigator.webdriver` to avoid detection.
- **Renderer**: 
  - Loads the live URL: `https://aistudio.google.com/prompts/new_chat`.
  - **Note**: The local `Google AI Studio.html` file appears to be a reference artifact and is NOT loaded by the application.

## Key Workflows
- **Run Application**: `npm start` (executes `electron .`).
- **Debugging**: 
  - DevTools are configured to open in `detach` mode by default in `createWindow()`.
  - Use console logs in `main.js` (terminal output) and `preload.js` (DevTools console).

## Conventions & Patterns
- **Frameless Window**: 
  - The `BrowserWindow` is created with `frame: false`.
  - Window controls are implemented in `preload.js` (HTML/CSS injection) and communicate via IPC to `main.js`.
- **IPC Communication**:
  - **Pattern**: Renderer sends `window-{action}` -> Main performs action.
  - **Channels**: `window-minimize`, `window-maximize`, `window-close`, `open-external-login`, `set-session-cookie`.
- **Security & Isolation**:
  - `contextIsolation: true` and `sandbox: true` are enabled.
  - Direct Node.js integration is disabled in the renderer; all native actions must go through `preload.js`.

## Critical Implementation Details
- **Login Handling**: The app includes logic to handle external login flows or manual cookie injection (`__Secure-1PSID`) if the embedded login is blocked.
- **User-Agent**: A specific Windows/Chrome User-Agent is hardcoded in `main.js` to maintain compatibility. Do not change this unless necessary for unblocking.

## External Login Implementation
- **Purpose**: Bypasses Google's automated browser detection by allowing users to log in via their default browser and manually transfer the session.
- **Flow**:
  1. **Trigger**: User clicks the Key icon (🔑) in the custom title bar.
  2. **Modal**: `preload.js` renders a modal overlay (`showCookieModal()`).
  3. **Open Browser**: Link triggers `ipcRenderer.send('open-external-login')`. `main.js` uses `shell.openExternal()`.
  4. **Cookie Injection**: User pastes `__Secure-1PSID`. `preload.js` sends `ipcRenderer.send('set-session-cookie', value)`.
  5. **Session Restore**: `main.js` sets the cookie on `session.defaultSession` and reloads the window.

## Important Files
- `main.js`: Entry point, window config, IPC handlers.
- `preload.js`: UI injection, IPC bridge, environment masking.
