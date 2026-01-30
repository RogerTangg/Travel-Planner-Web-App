# Travel Planner Web App

一個功能完整的旅遊行程規劃應用程式，結合 AI 智慧分析與直覺化的拖曳操作，幫助你輕鬆規劃完美旅程。
- 立即試用：https://travel-planner-beo.pages.dev/

## 功能特色

### AI 智慧功能

| 功能 | 說明 |
|------|------|
| **智慧景點分析** | 輸入景點名稱，AI 自動填入地址、座標、類別、描述及建議停留時間 |
| **批次文字提取** | 貼上旅遊文章或行程表，AI 自動識別並提取所有景點 |
| **智慧排程** | 一鍵將待安排景點分配至各天，自動安排合理的參觀時間 |
| **單日路線優化** | AI 根據地理位置與時段邏輯重新排序當日行程 |
| **地址定位** | 修改地址後可自動更新 GPS 座標 |

### 行程管理

- **多行程管理**：建立、切換、刪除多個旅行計畫
- **天數調整**：自由增減旅行天數
- **拖曳排序**：直覺式拖放景點調整順序
- **快速模組**：一鍵新增常用類別景點（景點、交通、餐飲等）
- **收回全部**：一鍵將所有已排程景點收回待安排清單
- **自動儲存**：所有變更即時儲存至本地

### 景點卡片

- **時間設定**：可編輯開始/結束時間，支援直接輸入或按鈕調整
- **類別標籤**：12 種預設類別（景點、博物館、神社寺廟、公園、購物、餐廳等）
- **自訂標籤**：為景點新增個人化標籤
- **地址顯示**：顯示完整街道地址
- **複製功能**：快速複製景點建立副本
- **編輯模式**：修改名稱、描述、類別、地址等所有欄位

### 地圖預覽

- **互動地圖**：使用 Leaflet 顯示景點位置
- **標記顯示**：在地圖上標示所有景點
- **即時同步**：地址修改後地圖自動更新

## 技術架構

### 前端

| 技術 | 說明 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 型別安全 |
| Vite 6 | 建置工具 |
| Tailwind CSS | 樣式框架 |
| @dnd-kit | 拖曳功能 |
| Leaflet | 地圖元件 |
| Lucide React | 圖示庫 |

### 後端

| 技術 | 說明 |
|------|------|
| Cloudflare Pages | 靜態網站託管 |
| Cloudflare Functions | Serverless API |
| Google Gemini 2.5 Flash | AI 模型 |

### 資料儲存

- **localStorage**：本地儲存行程資料
- **Key**：`travel-planner-trips`

## 專案結構

```
TravelPlannerApp/
├── App.tsx                    # 主應用程式元件
├── index.tsx                  # React 進入點
├── index.html                 # HTML 模板
├── types.ts                   # TypeScript 型別定義
├── vite.config.ts             # Vite 設定
├── tsconfig.json              # TypeScript 設定
├── wrangler.toml              # Cloudflare 設定
├── package.json               # 專案依賴
│
├── components/                # React 元件
│   ├── SpotCard.tsx           # 景點卡片元件
│   ├── TimePicker.tsx         # 時間選擇器元件
│   ├── MapPreview.tsx         # 地圖預覽元件
│   └── ConfirmDialog.tsx      # 確認對話框元件
│
├── services/                  # 服務層
│   └── geminiService.ts       # AI API 呼叫封裝
│
├── functions/                 # Cloudflare Functions (API)
│   └── api/
│       ├── analyze-spot.ts    # 景點分析 API
│       ├── extract-spots.ts   # 文字提取景點 API
│       ├── schedule-spots.ts  # 智慧排程 API
│       ├── optimize-day.ts    # 單日優化 API
│       └── geocode.ts         # 地址定位 API
│
└── public/                    # 靜態資源
```
