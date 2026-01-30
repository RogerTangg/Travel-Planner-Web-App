import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse value when it changes
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h)) setHours(h);
      if (!isNaN(m)) setMinutes(m);
    }
  }, [value]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 200;
      const dropdownHeight = 220;
      
      let left = rect.left + rect.width / 2 - dropdownWidth / 2;
      let top = rect.bottom + 8;
      
      // Adjust if too far right
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      // Adjust if too far left
      if (left < 10) left = 10;
      
      // Adjust if too low (show above instead)
      if (top + dropdownHeight > window.innerHeight - 10) {
        top = rect.top - dropdownHeight - 8;
      }
      
      setDropdownPos({ top, left });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatTime = (h: number, m: number) => 
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  const handleConfirm = () => {
    onChange(formatTime(hours, minutes));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const adjustHours = (delta: number) => {
    setHours(prev => {
      const newVal = prev + delta;
      if (newVal < 0) return 23;
      if (newVal > 23) return 0;
      return newVal;
    });
  };

  const adjustMinutes = (delta: number) => {
    setMinutes(prev => {
      const newVal = prev + delta;
      if (newVal < 0) return 55;
      if (newVal > 59) return 0;
      return newVal;
    });
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Dropdown rendered via Portal
  const dropdown = isOpen && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: 200 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Time Selector */}
      <div className="p-3">
        <div className="flex items-center justify-center gap-3">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustHours(1)}
              className="w-10 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronUp size={18} />
            </button>
            <div className="w-12 h-10 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xl font-bold text-gray-800 font-mono">
                {hours.toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustHours(-1)}
              className="w-10 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronDown size={18} />
            </button>
            <span className="text-[9px] text-gray-400 mt-0.5">時</span>
          </div>

          <span className="text-xl font-bold text-gray-300 mb-4">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              className="w-10 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronUp size={18} />
            </button>
            <div className="w-12 h-10 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xl font-bold text-gray-800 font-mono">
                {minutes.toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              className="w-10 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronDown size={18} />
            </button>
            <span className="text-[9px] text-gray-400 mt-0.5">分</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors font-medium"
          >
            清除
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-3 py-1.5 text-xs bg-sakura-500 hover:bg-sakura-600 text-white rounded-lg transition-colors font-medium"
          >
            確定
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onPointerDown={(e) => e.stopPropagation()}
        className={`
          flex items-center justify-center transition-all duration-200
          ${value
            ? 'text-gray-800 hover:text-sakura-600' 
            : 'px-1.5 py-1 rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
          }
        `}
      >
        <span className={`font-mono ${value ? 'text-sm font-bold' : 'text-xs'}`}>
          {value || '--:--'}
        </span>
      </button>

      {dropdown}
    </div>
  );
};
