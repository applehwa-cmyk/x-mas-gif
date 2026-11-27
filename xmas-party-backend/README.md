# 2026 雲端聖誕魔法派對｜多人連線豪華版

## 目前狀態
前端及後端原始碼已加入 GitHub，尚未連接任何 Firebase 專案，尚未正式啟用跨裝置服務。前端設定空白時會停用建立／加入按鈕，不會建立假的本機房間。
原本 index.html 及 xmas-gift-2026.html 保留。多人頁：../xmas-party-2026.html。

## 啟用方式（使用專屬 Firebase 專案）
1. https://console.firebase.google.com/ 建立專案。選擇 Blaze 計費方案才能部署 Cloud Functions；可能產生費用，請先設預算通知（通知不是硬性支出上限）。
2. 建立 Web App，複製公開 Web SDK 設定，填到儲存庫根目錄 xmas-party-config.js 的 firebaseConfig。不要放入服務帳戶私鑰、管理者憑證或付款資料。
3. Firebase Authentication > 登入方式 > 啟用 Anonymous（匿名）。如需設定授權網域，加入 applehwa-cmyk.github.io。停用會自動刪除匿名身份的設定，或確保參加者保存復原碼。
4. Cloud Firestore 建立 Native mode 資料庫，建議 asia-east1（台灣）。使用專屬專案，因本專案的 Firestore rules 會拒絕所有其他集合。
5. 本機下載或 clone 儲存庫，安裝 Node.js 22 及 Firebase CLI。於命令列執行：

```sh
npm install -g firebase-tools
firebase login
cd xmas-party-backend
cd functions
npm install
npm test
cd ..
firebase deploy --only firestore:rules,functions --project YOUR_FIREBASE_PROJECT_ID
```

6. 更新並提交 xmas-party-config.js（公開 Web SDK 參數），GitHub Pages 設定 main / root。等待部署後開啟 https://applehwa-cmyk.github.io/x-mas-gif/xmas-party-2026.html。
7. 至少用兩支手機或兩個不同瀏覽器測試：A 建房、B 掃碼加入、A 也加入、兩人填願望、A 啟動倒數、各自揭曉、刷新保持同一結果、用復原碼換裝置；確認未加入者無法讀取資料，普通參加者不能啟動或重置，且秘密文件不可直接讀取。正式活動前勿跳過。
8. 公開服務應考慮 Firebase App Check、防濫用配額、資料保留期限及費用監控。此版尚未強制 App Check、無每人建立房間速率限制、無自動清除舊房間，請勿當作大規模公開服務。

## 主持人
最多 60 人；建房後保存主持人復原碼，透過邀請連結／QR Code 分享。名單、願望可在抽籤前設定。伺服器交易一次配對、設定開始時間；手機用伺服器時間估計校正倒數，網路延遲可能略有差異。主持人可加入成為參加者。重置二次確認：保留名單與願望，永久清除本輪配對與幸運籤。匯出公開進度 JSON 不含配對，無法作為完整秘密資料匯入；完整資料由 Firestore 保存，專案管理員如需災難復原，可另設 Firestore 管理備份（可能收費）。投影模式只顯示公開資料。

## 參加者
每個人使用自己的手機，匿名身份與個人復原碼綁定。復原碼可在新裝置接管該身份，舊裝置不再能讀取其資料。只用自己的房間與身份；不要轉傳復原碼。配對一經產生不會因揭曉、重開或遊戲重抽；可在自己的手機再次確認原結果，關閉視窗後隱藏。許願只在自己送禮者的私密結果中返回。Firebase 專案管理員仍有資料庫管理存取權。

## 測試狀態
core.js 狀態邏輯測試：3900 次不自配／唯一配對，8 位虛構參加者權限、重複揭曉、恢復身份、遊戲隔離及重置。test.js 可使用 Node 22 執行。前端 JavaScript 語法及 HTML ID 檢查已執行。尚未安裝 SDK 執行 Firebase Emulator、部署規則或實機跨手機測試；QR Code、音效、PNG、投影需正式環境測試。
