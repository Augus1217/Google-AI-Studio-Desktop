# Google AI Studio Desktop

這是一個非官方的 [Google AI Studio](https://aistudio.google.com/) 桌面客戶端，使用 Electron 構建。提供接近原生的使用體驗，並解決了在非標準瀏覽器環境下的登入問題。

## ✨ 功能特色

*   **原生體驗**：無邊框視窗設計，搭配自訂的深色標題列。
*   **完整導航**：標題列整合了 上一頁、下一頁、重新載入、首頁 按鈕。
*   **高度客製化**：
    *   **自動清除 Cookie**：可設定每次啟動時自動清除 Cookie，保持乾淨的 Session。
    *   **自訂首頁**：設定您喜歡的起始頁面網址。
    *   **顯示網址**：可選擇是否在標題列顯示當前網址。
    *   **多國語言支援**：支援 英文、繁體中文、簡體中文、日文。
*   **登入支援**：
    *   **直接登入**：使用特殊的 User-Agent 策略 (Chrome 142) 來模擬標準瀏覽器環境。
    *   **外部登入 (External Login)**：如果直接登入被 Google 阻擋，可使用此備用方案。透過 Chrome/Edge 登入後複製 Cookie 注入程式。
*   **故障排除**：內建「重置應用程式」功能，可一鍵清除所有快取與資料並重啟。

## 🚀 安裝與執行

1.  **複製專案**：
    ```bash
    git clone <your-repo-url>
    cd google-ai-studio-desktop
    ```

2.  **安裝依賴**：
    ```bash
    npm install
    ```

3.  **啟動應用程式**：
    ```bash
    npm start
    ```

## 🛠️ 疑難排解 (Troubleshooting)

### 登入問題 ("This browser or app may not be secure")
Google 對於瀏覽器環境的檢查非常嚴格。如果您遇到登入阻擋：

1.  **再試一次**：通常第一次初始化 Session 後，第二次嘗試登入就會成功。
2.  **使用外部登入**：
    *   點擊標題列右側的鑰匙圖示 (🔑)。
    *   點擊 "Open Google AI Studio" (會嘗試使用 Chrome/Edge 開啟)。
    *   在瀏覽器中登入 Google AI Studio。
    *   開啟開發者工具 (F12) -> Network (網路) 分頁。
    *   重新整理頁面，點擊任一請求 (如 `new_chat`)。
    *   在 Headers (標頭) -> Request Headers 中找到 `Cookie`。
    *   複製完整的 Cookie 值，貼回應用程式的對話框中並確認。
3.  **重置應用程式**：
    *   點擊標題列的設定圖示 (⚙️)。
    *   捲動到底部，點擊紅色的 **「重置應用程式」** 按鈕。
    *   這將清除所有快取與設定並重新啟動。

## ⚙️ 設定檔位置

設定檔 `config.json` 儲存於使用者的應用程式資料夾：

*   **Linux**: `~/.config/google-ai-studio-desktop/config.json`
*   **Windows**: `%APPDATA%/google-ai-studio-desktop/config.json`
*   **Mac**: `~/Library/Application Support/google-ai-studio-desktop/config.json`

## 📝 License

ISC
