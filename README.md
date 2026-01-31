# Travel Planner Web App

一個功能完整的旅遊行程規劃應用程式，結合 AI 智慧分析與 Google Places API 驗證，幫助你輕鬆規劃完美旅程。
- 立即試用：https://travel-planner-beo.pages.dev/

## 功能特色

### AI 智慧功能 + Google Places API 驗證

| 功能 | 說明 |
|------|------|
| **智慧景點分析** | 輸入景點名稱，先透過 Google Places API 獲取官方精確資料（座標、地址），再由 AI 生成描述與建議停留時間 |
| **批次文字提取** | 貼上旅遊文章或行程表，AI 識別景點後透過 Google Places API 驗證並獲取完整資訊 |
| **智慧排程** | 一鍵將待安排景點分配至各天，自動安排合理的參觀時間 |
| **單日路線優化** | AI 根據地理位置與時段邏輯重新排序當日行程 |
| **地址定位** | 修改地址後可自動更新 GPS 座標 |

### 資料來源優先順序

```
用戶輸入 → Google Places API 搜尋 → 找到：使用官方精確資料
                                  → 沒找到：AI 智慧生成
```

| 資料項目 | Places API 驗證通過 | 僅 AI 生成 |
|---------|-------------------|-----------|
| 座標 | ✅ Google 官方精確座標 | AI 推測 |
| 地址 | ✅ Google 官方完整地址 | AI 推測 |
| 名稱 | ✅ 官方標準名稱 | AI 識別 |
| 描述 | AI 生成 | AI 生成 |
| 建議時間 | AI 建議 | AI 建議 |

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

- **Google Maps**：使用 Google Maps 顯示景點位置
- **彩色標記**：依類別顯示不同顏色的標記
- **資訊視窗**：點擊標記顯示景點詳細資訊
- **即時同步**：選中景點時自動定位
- **點擊新增** 🆕：直接點擊地圖上的車站、景點、餐廳等 POI，一鍵新增至行程

## 技術架構

### 前端

| 技術 | 說明 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 型別安全 |
| Vite 6 | 建置工具 |
| Tailwind CSS | 樣式框架 |
| @dnd-kit | 拖曳功能 |
| Google Maps | 地圖服務 |
| Lucide React | 圖示庫 |

### 後端

| 技術 | 說明 |
|------|------|
| Cloudflare Pages | 靜態網站託管 |
| Cloudflare Functions | Serverless API |
| Google Gemini 2.5 Flash | AI 模型 |
| Google Maps Platform | 地圖與地點服務 |

### 資料儲存

- **localStorage**：本地儲存行程資料
- **Zustand**：輕量級狀態管理庫（persist middleware）

## 專案結構

```
TravelPlannerApp/
├── App.tsx                    # 主應用程式入口（輕量化）
├── index.tsx                  # React 掛載點
├── index.html                 # HTML 模板
├── types.ts                   # TypeScript 型別定義
├── vite.config.ts             # Vite 設定
├── tsconfig.json              # TypeScript 設定
├── wrangler.toml              # Cloudflare 設定
├── package.json               # 專案依賴
├── tailwind.config.js         # Tailwind CSS 設定
├── postcss.config.js          # PostCSS 設定
│
├── stores/                    # 狀態管理 (Zustand)
│   ├── index.ts               # Store 匯出
│   ├── tripStore.ts           # 行程狀態管理
│   └── uiStore.ts             # UI 狀態管理
│
├── hooks/                     # 自訂 Hooks
│   ├── index.ts               # Hooks 匯出
│   ├── useSpotActions.ts      # 景點操作邏輯
│   └── useDragAndDrop.ts      # 拖曳功能邏輯
│
├── components/                # React 元件
│   ├── common/                # 共用元件
│   │   ├── Toast.tsx          # Toast 通知
│   │   ├── LoadingOverlay.tsx # 載入遮罩
│   │   ├── EmptyState.tsx     # 空狀態提示
│   │   └── DroppableContainer.tsx # 拖放容器
│   │
│   ├── layout/                # 佈局元件
│   │   ├── Sidebar.tsx        # 左側面板（行程選擇、新增景點、待安排清單）
│   │   ├── SchedulePanel.tsx  # 中間面板（行程總覽）
│   │   └── MapPanel.tsx       # 右側面板（地圖）
│   │
│   ├── SpotCard.tsx           # 景點卡片元件
│   ├── TimePicker.tsx         # 時間選擇器元件
│   ├── MapPreview.tsx         # 地圖預覽元件（Google Maps）
│   └── ConfirmDialog.tsx      # 確認對話框元件
│
├── services/                  # 服務層
│   └── geminiService.ts       # AI API 呼叫封裝
│
├── functions/                 # Cloudflare Functions (API)
│   └── api/
│       ├── analyze-spot.ts    # 景點分析 API（Google Places + AI）
│       ├── extract-spots.ts   # 文字提取景點 API（Google Places 驗證）
│       ├── maps-config.ts     # Google Maps API 設定
│       ├── schedule-spots.ts  # 智慧排程 API
│       ├── optimize-day.ts    # 單日優化 API
│       └── geocode.ts         # 地址定位 API
│
├── src/styles/                # 樣式檔案
│   └── index.css              # Tailwind 入口（建置時編譯用）
│
└── public/                    # 靜態資源
    └── index.css              # 全域樣式
```

## 架構特點

### 狀態管理 (State Management)

使用 **Zustand** 取代 prop drilling：

- `tripStore`：管理行程 CRUD、景點操作、localStorage 持久化
- `uiStore`：管理拖曳狀態、載入狀態、Toast、確認對話框、響應式視圖狀態

### 元件拆分原則 (Component Split)

遵循單一職責原則，將原 1300+ 行的 `App.tsx` 拆分：

- **Layout Components**：負責佈局結構
- **Common Components**：可重用的 UI 元件
- **Custom Hooks**：封裝業務邏輯（景點操作、拖曳處理）

### 效能優化 (Performance)

- 使用 `React.memo` 避免不必要的重渲染
- 使用 `useMemo` 快取計算結果
- 使用 `p-limit` 控制並行 API 請求數量

### 響應式設計 (Responsive Design)

支援多種裝置尺寸的完整響應式體驗：

| 斷點 | 尺寸 | 佈局 |
|------|------|------|
| `xs` | < 640px | 手機版：底部導航切換三個面板 |
| `sm` | 640px+ | 大型手機：優化的觸控體驗 |
| `md` | 768px+ | 平板版：側邊欄 + 行程面板 |
| `xl` | 1280px+ | 桌面版：三欄式完整佈局 |

**手機版特色**：
- 底部導航列（景點/行程/地圖切換）
- 支援 Safe Area（iPhone 底部安全區域）
- 觸控優化的按鈕與間距
- 減少動畫（prefers-reduced-motion）

### Tailwind CSS 建置

使用 **Tailwind CSS v4** 搭配 `@tailwindcss/postcss`：

- 開發時：Vite 即時編譯
- 生產時：PostCSS 建置優化，移除未使用的樣式
- 自訂主題：透過 `@theme` 定義品牌色彩與動畫

## 開發指令

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 生產建置
npm run build

# 預覽建置結果
npm run preview

# 部署到 Cloudflare Pages
npx wrangler pages deploy dist
```

## 環境變數

在 Cloudflare Pages 設定以下環境變數：

| 變數名稱 | 說明 |
|---------|------|
| `GEMINI_API_KEY` | Google Gemini API 金鑰 |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API 金鑰 |

## 授權

MIT License
