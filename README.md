<div align="center">

# Travel Planner Web App

**智慧旅遊行程規劃工具**

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-f38020?logo=cloudflare)](https://travel-planner-web-app.pages.dev)
[![Made with React](https://img.shields.io/badge/Made%20with-React%2019-61dafb?logo=react)](https://react.dev)
[![Powered by Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285f4?logo=google)](https://ai.google.dev)

</div>

---

## 功能特色

### AI 智慧功能
- **景點智慧分析** - 輸入景點名稱，AI 自動取得詳細資訊、GPS 座標與建議停留時間
- **一鍵智慧排程** - AI 根據地理位置與旅遊邏輯，將所有待安排景點自動分配至各天行程
- **檔案智慧提取** - 上傳 .txt、.csv、.md 檔案，AI 自動辨識並提取所有景點
- **路線智慧排序** - AI 根據地理鄰近性重新排序待安排景點，規劃最佳路線

### 行程管理
- **多行程管理** - 支援建立與切換多個旅行計畫
- **拖放式編排** - 直覺化的拖放操作，輕鬆調整景點順序
- **自訂時間選擇器** - 優雅的時間選擇介面，精確設定每個景點的開始時間
- **自動計算結束時間** - 根據建議停留時長自動計算離開時間
- **本地自動儲存** - 資料儲存於瀏覽器，無需登入即可使用

### 標籤分類系統
- **自訂標籤** - 為景點新增自訂標籤（如：必去、美食、夜景等）
- **標籤篩選** - 依據標籤快速篩選待安排景點
- **視覺化標籤** - 彩色標籤顯示，一目瞭然

### 互動地圖
- **即時定位** - 所有景點即時顯示於地圖
- **飛行定位** - 點擊景點卡片，地圖自動飛行至該位置
- **座標編輯** - 支援手動調整景點 GPS 座標

### 景點資訊編輯
- **完整編輯** - 可編輯景點名稱、描述、類別、停留時間
- **12 種類別** - 景點、美食、咖啡廳、酒吧、住宿、交通、購物、博物館、神社寺廟、公園、娛樂、自訂
- **手動輸入模式** - 不需 AI，直接快速新增景點

---

## 技術架構

| 類別 | 技術 |
|------|------|
| **前端框架** | React 19 + TypeScript |
| **建置工具** | Vite 6 |
| **樣式** | Tailwind CSS |
| **拖放功能** | @dnd-kit |
| **地圖** | Leaflet + React-Leaflet |
| **AI 模型** | Google Gemini 2.5 Flash |
| **部署平台** | Cloudflare Pages + Functions |

---

## 專案結構

```
TravelPlannerApp/
├── App.tsx                 # 主應用程式元件
├── types.ts                # TypeScript 型別定義
├── index.tsx               # 應用程式進入點
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 設定
├── components/
│   ├── SpotCard.tsx        # 景點卡片元件
│   ├── MapPreview.tsx      # 地圖預覽元件
│   ├── TimePicker.tsx      # 自訂時間選擇器
│   └── ConfirmDialog.tsx   # 確認對話框元件
├── services/
│   └── geminiService.ts    # AI 服務封裝
└── functions/
    └── api/
        ├── analyze-spot.ts     # 景點分析 API
        ├── optimize-schedule.ts # 行程優化 API
        ├── extract-spots.ts    # 檔案提取 API
        └── schedule-spots.ts   # 智慧排程 API
```

---

## 🎯 使用說明

### 新增景點
1. 在左側搜尋框輸入景點名稱
2. 按下 **+** 按鈕，AI 將自動分析景點資訊
3. 或切換為「手動模式」直接新增

### 智慧排程
1. 將景點新增至「待安排」清單
2. 點擊 **✨ 智慧排程** 按鈕
3. AI 將自動把所有景點分配至各天行程

### 標籤管理
1. 點擊景點卡片進入編輯模式
2. 在標籤區塊輸入新標籤
3. 使用標籤篩選快速找到特定景點

### 時間設定
1. 點擊時間選擇器設定開始時間
2. 系統會根據建議停留時間自動計算結束時間

---