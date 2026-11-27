# 聖誕魔法派對｜免費多人後端
此版使用 Cloudflare Workers Free + D1 Free，保留 Firebase Spark 匿名登入。不使用 Cloud Functions 或 Blaze。原本 Firebase Functions 程式留作備用，不需要部署。請勿將 Cloudflare 帳戶升級至付費方案。
## 部署（控制台操作）
1. https://dash.cloudflare.com/ 登入帳戶，確認 Workers 為 Free。進入 Storage & databases > D1 SQL Database，建立 xmas-party-2026。
2. 在資料庫 Console 執行 schema.sql 的 CREATE TABLE 指令，表名 rooms。
3. 在 Workers & Pages 建立 Hello World Worker，名稱 xmas-party-2026-free；若要求升級付費或輸入信用卡，停止並確認所選方案。
4. 編輯 Worker 程式，完整取代為本資料夾 worker.js（單一 ES module，不需 npm）。部署。
5. 在 Worker Settings > Bindings 新增 D1 database binding，變數名稱 DB，選擇 xmas-party-2026 資料庫。保存／部署。
6. 開啟 Worker 的 https://xxx.workers.dev 網址，應返回 JSON，backend 為 cloudflare-d1、configured 為 true（代表已綁定；完整檢查會在手機初始化時驗證登入與資料表）。
7. 將 Worker 的 HTTPS 網址填入根目錄 xmas-party-free-config.js 的 workerUrl，提交至 GitHub。僅接受 workers.dev HTTPS 網址，Firebase ID token 只送給此後端。不要提供 API token 或密碼。
8. 開啟 https://applehwa-cmyk.github.io/x-mas-gif/xmas-party-2026.html，確認兩支手機不同匿名身份、建立及加入房間、倒數、查看個人配對、換裝置復原、遊戲及重置。GitHub Pages 須已啟用。
## 免費限制與同步
可見分頁一般每 5–5.6 秒查詢一次，完成後每 15 秒；背景分頁暫停，重新開啟立即同步。主持人操作後立即嘗試更新；開始時間由伺服器統一設定為 12 秒後，最後 3 秒顯示倒數。不是 WebSocket 即時推播，網路延遲或免費額度耗盡可能導致延後／暫停。不要長時間讓所有手機開著。Free 超過配額服務可能拒絕請求；沒有自動升級。
## 安全
Worker 驗證 Firebase ID token 簽章、簽發者、專案、有效期與身份，再決定權限。D1 存放公開狀態及秘密資料，前端不能直接讀取；公開回應不含配對、復原碼或其他成員的實際 UID。更新使用版本條件比對以防並行覆蓋。復原碼以 SHA-256 雜湊保存。資料庫管理員仍可讀取資料。尚未支援帳號撤銷檢查、強制 App Check、速率限制或自動清理；僅供私人小型活動使用，注意公開 API 可能被濫用而耗盡免費額度。已建立的 Firebase Firestore 可保留，不再使用。若曾部署其他版本，D1 不會自動搬移 Firestore 房間資料。
## 測試
已執行 JavaScript 語法、3900 次配對、身份權限／私密結果／復原／重置的模擬測試。尚未連接實際 Cloudflare D1、驗證真實 Firebase token 或實機多手機測試。
