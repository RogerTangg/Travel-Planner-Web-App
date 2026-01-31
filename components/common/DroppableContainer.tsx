/**
 * 可拖放容器元件 (Droppable Container Component)
 * 
 * 包裝 @dnd-kit 的 useDroppable，提供視覺回饋
 * 
 * @module components/common/DroppableContainer
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableContainerProps {
  /** 容器唯一識別碼 */
  id: string;
  /** 子元素 */
  children?: React.ReactNode;
  /** 額外的 CSS 類別 */
  className?: string;
  /** 是否有正在進行的拖曳 */
  active?: boolean;
}

export const DroppableContainer: React.FC<DroppableContainerProps> = ({ 
  id, 
  children, 
  className = '',
  active = false
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  // 拖曳懸停時的高亮效果
  const hoverStyles = isOver && !active 
    ? 'ring-2 ring-sakura-300 ring-opacity-50 bg-sakura-50/30' 
    : '';
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} ${hoverStyles} transition-all`}
    >
      {children}
    </div>
  );
};

export default DroppableContainer;
