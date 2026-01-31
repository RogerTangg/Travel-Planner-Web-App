/**
 * 載入遮罩元件 (Loading Overlay Component)
 * 
 * 顯示 AI 處理中的載入狀態
 * 
 * @module components/common/LoadingOverlay
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  /** 顯示的載入文字 */
  text?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  text = 'AI 優化中...' 
}) => (
  <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl">
    <div className="flex flex-col items-center">
      <div className="bg-white p-3 rounded-full shadow-lg border border-sakura-100 mb-2 animate-pulse">
        <Sparkles className="text-sakura-500" size={20} />
      </div>
      <span className="text-sakura-500 font-bold text-xs">{text}</span>
    </div>
  </div>
);

export default LoadingOverlay;
