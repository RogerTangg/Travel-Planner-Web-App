<div align="center">

# 🌸 Travel Planner Web App

**AI 智慧旅遊行程規劃工具**

[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)](https://travel-planner-web-app.pages.dev)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285f4?logo=google&logoColor=white)](https://ai.google.dev)

[🚀 線上體驗](https://travel-planner-web-app.pages.dev) · [📖 功能介紹](#-功能特色) · [🛠️ 技術架構](#️-技術架構)

</div>

---

## ✨ 功能特色

### 🤖 AI 智慧功能
| 功能 | 說明 |
|------|------|
| **景點智慧分析** | 輸入景點名稱，AI 自動取得詳細資訊、GPS 座標、建議停留時間 |
| **一鍵智慧排程** | AI 根據地理位置、時間預算、景點類型，將待安排景點自動分配至各天 |
| **檔案智慧提取** | 上傳 .txt/.csv/.md 檔案，AI 自動辨識並提取所有景點（最多 50 個） |
| **路線智慧排序** | AI 依地理鄰近性重新排序待安排景點，規劃最佳遊覽順序 |

### 🗓️ 行程管理
| 功能 | 說明 |
|------|------|
| **多行程管理** | 支援建立與切換多個旅行計畫 |
| **拖放式編排** | 直覺化拖放操作，輕鬆調整景點順序 |
| **自訂時間選擇器** | 精美時間選擇介面，開始/結束時間皆可獨立設定 |
| **自動計算時間** | 根據建議停留時長自動計算結束時間 |
| **本地自動儲存** | 資料儲存於瀏覽器 localStorage，無需登入 |

### 🏷️ 標籤分類系統
- ✅ 為景點新增自訂標籤（如：必去、美食、夜景）
- ✅ 依標籤快速篩選待安排景點
- ✅ 彩色標籤視覺化顯示

### 🗺️ 互動地圖
- ✅ **彩色分類標記** - 12 種景點類別各有獨特顏色
- ✅ **飛行定位** - 點擊景點卡片，地圖自動平滑移動
- ✅ **地圖圖例** - 左下角顯示當前景點類別圖例
- ✅ **選中動畫** - 選中景點標記有脈動效果

### 📝 景點資訊編輯
- ✅ 可編輯名稱、描述、類別、停留時間、GPS 座標
- ✅ 12 種類別：景點、美食、咖啡廳、酒吧、住宿、交通、購物、博物館、神社寺廟、公園、娛樂、自訂
- ✅ 手動輸入模式 - 無需 AI，直接快速新增

---

## 🖼️ 功能截圖

### 主介面
```
┌─────────────┬──────────────────────┬─────────────┐
│  待安排景點  │     行程總覽         │   地圖預覽   │
│  + 搜尋新增  │  Day 1 / Day 2 ...  │  彩色標記   │
│  + 檔案上傳  │  拖放排序行程        │  即時定位   │
│  + 標籤篩選  │  時間選擇器         │  圖例說明   │
└─────────────┴──────────────────────┴─────────────┘
```

### 時間選擇器
- 🎨 漸層標題顯示時間與時段
- ⬆️⬇️ 上下箭頭精確調整
- ⏰ 早晨/午後/傍晚快速選擇
- 🎯 開始時間與結束時間皆可獨立設定

---

## 🚀 快速開始

### 前置需求
- Node.js 18+
- npm 或 yarn

### 本地開發

```bash
# 1. 複製專案
git clone https://github.com/RogerTangg/Travel-Planner-Web-App.git
cd Travel-Planner-Web-App

# 2. 安裝依賴
npm install

# 3. 設定環境變數（建立 .dev.vars 檔案）
echo "GEMINI_API_KEY=your_api_key_here" > .dev.vars

# 4. 啟動開發伺服器
npm run dev

# 5. 開啟瀏覽器
# http://localhost:5173
```

---

## 🛠️ 技術架構

| 類別 | 技術 |
|------|------|
| **前端框架** | React 19 + TypeScript 5.8 |
| **建置工具** | Vite 6 |
| **樣式** | Tailwind CSS (CDN) |
| **拖放功能** | @dnd-kit/core + @dnd-kit/sortable |
| **地圖** | Leaflet + React-Leaflet + Stadia Maps |
| **AI 模型** | Google Gemini 2.5 Flash |
| **部署** | Cloudflare Pages + Functions |
| **狀態管理** | React useState + localStorage |

---

## 📁 專案結構

```
TravelPlannerApp/
├── App.tsx                     # 主應用程式（狀態管理、拖放邏輯）
├── types.ts                    # TypeScript 型別定義
├── index.tsx                   # 應用程式進入點
├── index.html                  # HTML 模板
├── vite.config.ts              # Vite 建置設定
├── components/
│   ├── SpotCard.tsx            # 景點卡片（含編輯、標籤、時間）
│   ├── MapPreview.tsx          # 地圖預覽（彩色標記、圖例）
│   ├── TimePicker.tsx          # 自訂時間選擇器（Portal 渲染）
│   └── ConfirmDialog.tsx       # 確認對話框
├── services/
│   └── geminiService.ts        # AI 服務封裝
└── functions/api/              # Cloudflare Functions
    ├── analyze-spot.ts         # 景點分析 API
    ├── optimize-schedule.ts    # 單日優化 API
    ├── extract-spots.ts        # 檔案提取 API
    └── schedule-spots.ts       # 智慧排程 API（進階演算法）
```

---

## 🎯 使用指南

### 新增景點
1. 在左側搜尋框輸入景點名稱（如：淺草寺、東京鐵塔）
2. 按下 **新增景點** 按鈕，AI 自動分析
3. 或點擊 ✏️ 切換為手動模式直接新增

### AI 智慧排程
1. 新增多個景點至「待安排」清單
2. 點擊 **✨ 智慧排程** 按鈕
3. AI 將根據以下因素自動分配：
   - 📍 地理位置群聚（同區域同天）
   - ⏱️ 時間預算（每天 8-10 小時）
   - 🏛️ 類型平衡（避免同天過多同類景點）
   - 🛤️ 動線順序（早上戶外→下午室內→晚間餐飲）

### 時間設定
1. 點擊時間選擇器（開始或結束時間皆可）
2. 使用上下箭頭微調，或點擊快速時間
3. 按下 **確定** 儲存

### 標籤管理
1. 點擊景點卡片編輯圖示
2. 在標籤區輸入新標籤並按 Enter
3. 返回後可使用標籤篩選器

---

## 🔒 安全性

- ✅ API Key 透過 Cloudflare Functions 後端處理，前端不暴露
- ✅ 所有使用者資料僅儲存於本地瀏覽器
- ✅ 無需註冊登入，無隱私疑慮

---

## 📄 授權

MIT License © 2024 Roger Tang

---

<div align="center">

**Made with 💖 and ☕ by Roger Tang**

[⬆ 回到頂部](#-travel-planner-web-app)

</div>
