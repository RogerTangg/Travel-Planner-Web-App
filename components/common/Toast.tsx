/**
 * Toast 通知元件 (Toast Notification Component)
 * 
 * 顯示操作結果的浮動通知，支援四種類型：
 * - success: 成功
 * - error: 錯誤
 * - warning: 警告
 * - info: 資訊
 * 
 * @module components/common/Toast
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ToastState, useUIStore } from '../../stores';

interface ToastProps {
  toast: ToastState;
  onClose: () => void;
}

// 背景顏色對應
const bgColors: Record<ToastState['type'], string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200'
};

// 文字顏色對應
const textColors: Record<ToastState['type'], string> = {
  success: 'text-green-700',
  error: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700'
};

// 圖示對應
const icons: Record<ToastState['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * Toast 元件 - 獨立使用
 */
export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible, onClose]);

  if (!toast.isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 shadow-lg backdrop-blur-sm ${bgColors[toast.type]} max-w-sm`}>
        <span className={`text-lg flex-shrink-0 ${textColors[toast.type]}`}>
          {icons[toast.type]}
        </span>
        <p className={`text-sm font-medium ${textColors[toast.type]} flex-1`}>
          {toast.message}
        </p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${textColors[toast.type]} opacity-60 hover:opacity-100 transition-opacity`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * Toast 容器 - 連接 Store 自動管理
 * 直接使用此元件可自動連接 UI Store
 */
export const ToastContainer: React.FC = () => {
  const toast = useUIStore(state => state.toast);
  const hideToast = useUIStore(state => state.hideToast);
  return <Toast toast={toast} onClose={hideToast} />;
};

export default Toast;
