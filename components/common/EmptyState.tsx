/**
 * 空狀態元件 (Empty State Component)
 * 
 * 當列表或區域無內容時顯示的引導性訊息
 * 
 * @module components/common/EmptyState
 */

import React from 'react';
import { MapPin, Calendar, Package } from 'lucide-react';

type EmptyStateVariant = 'unscheduled' | 'day' | 'filtered' | 'default';

interface EmptyStateProps {
  /** 空狀態類型 */
  variant?: EmptyStateVariant;
  /** 自訂標題 */
  title?: string;
  /** 自訂描述 */
  description?: string;
  /** 自訂圖示 */
  icon?: React.ReactNode;
}

// 預設配置
const variants: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; description: string }> = {
  unscheduled: {
    icon: <MapPin className="w-10 h-10 text-gray-300" />,
    title: '尚無待安排景點',
    description: '輸入景點名稱或上傳行程檔案開始規劃'
  },
  day: {
    icon: <Calendar className="w-10 h-10 text-gray-300" />,
    title: '拖曳景點至此',
    description: '從左側待安排清單拖曳景點到這裡'
  },
  filtered: {
    icon: <Package className="w-10 h-10 text-gray-300" />,
    title: '沒有符合條件的景點',
    description: '試著調整篩選條件或清除篩選'
  },
  default: {
    icon: <Package className="w-10 h-10 text-gray-300" />,
    title: '暫無內容',
    description: ''
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  variant = 'default',
  title,
  description,
  icon
}) => {
  const config = variants[variant];
  
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3">
        {icon || config.icon}
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">
        {title || config.title}
      </p>
      {(description || config.description) && (
        <p className="text-xs text-gray-400">
          {description || config.description}
        </p>
      )}
    </div>
  );
};

/**
 * 簡易空狀態 - 用於行程日
 */
export const DayEmptyState: React.FC = () => (
  <div className="h-24 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-50 rounded-xl">
    <p className="text-xs">拖曳景點至此</p>
  </div>
);

export default EmptyState;
