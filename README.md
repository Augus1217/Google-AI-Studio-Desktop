# Google AI Studio Desktop

This is an unofficial desktop client for [Google AI Studio](https://aistudio.google.com/), built with Electron. It provides a native-like experience and addresses login issues often encountered in non-standard browser environments.

## ✨ Features

*   **Native Experience**: Frameless window design with a custom dark mode title bar.
*   **Full Navigation**: Integrated Back, Forward, Reload, and Home buttons within the title bar.
*   **Highly Customizable**:
    *   **Auto Clear Cookies**: Option to automatically clear cookies on startup for a clean session.
    *   **Custom Home Page**: Set your preferred starting URL.
    *   **Show URL**: Toggle the display of the current URL in the title bar.
    *   **Multi-language Support**: Supports English, Traditional Chinese, Simplified Chinese, and Japanese.
*   **Login Support**:
    *   **Direct Login**: Utilizes a specific User-Agent strategy (Chrome 142) to simulate a standard browser environment.
    *   **External Login**: A fallback mechanism if direct login is blocked by Google. Allows logging in via Chrome/Edge and manually injecting the session cookie.
*   **Troubleshooting**: Built-in "Reset App" feature to clear all cache and data with one click and restart the application.

## 🚀 Installation & Running

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd google-ai-studio-desktop
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the application**:
    ```bash
    npm start
    ```

## 🛠️ Troubleshooting

### Login Issues ("This browser or app may not be secure")
Google has strict checks for browser environments. If you encounter a login block:

1.  **Try Again**: Often, after the initial session initialization, a second login attempt will succeed.
2.  **Use External Login**:
    *   Click the Key icon (🔑) in the title bar.
    *   Click "Open Google AI Studio" (this attempts to open the link in your external Chrome or Edge browser).
    *   Log in to Google AI Studio in your external browser.
    *   Open Developer Tools (F12) -> **Network** tab.
    *   Refresh the page and click on the first request.
    *   Under **Headers** -> **Request Headers**, find the `Cookie` field.
    *   Copy the entire Cookie value, paste it into the application's dialog box, and confirm.
3.  **Reset App**:
    *   Click the Settings icon (⚙️) in the title bar.
    *   Scroll to the bottom and click the red **"Reset App"** button.
    *   This will clear all cache and settings, and restart the application.

## ⚙️ Configuration File Location

The `config.json` file is stored in the user's application data directory:

*   **Linux**: `~/.config/google-ai-studio-desktop/config.json`
*   **Windows**: `%APPDATA%/google-ai-studio-desktop/config.json`
*   **macOS**: `~/Library/Application Support/google-ai-studio-desktop/config.json`

## 📝 License

ISC
