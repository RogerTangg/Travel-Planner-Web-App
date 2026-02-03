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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
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
      const dropdownWidth = 180;
      const dropdownHeight = 200;

      let left = rect.left + rect.width / 2 - dropdownWidth / 2;
      let top = rect.bottom + 4;

      // Adjust if too far right
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      // Adjust if too far left
      if (left < 10) left = 10;

      // Adjust if too low (show above instead)
      if (top + dropdownHeight > window.innerHeight - 10) {
        top = rect.top - dropdownHeight - 4;
      }

      setDropdownPos({ top, left });
    } else {
      setDropdownPos(null);
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

  const handleHoursInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setHours(Math.max(0, Math.min(23, val)));
  };

  const handleMinutesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setMinutes(Math.max(0, Math.min(59, val)));
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Dropdown rendered via Portal - only render when position is calculated
  const dropdown = isOpen && dropdownPos && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: 200 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Time Selector - 行動端優化觸控目標 */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-3">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustHours(1)}
              className="w-10 h-8 md:w-8 md:h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg md:rounded transition-all"
              aria-label="增加小時"
            >
              <ChevronUp size={20} className="md:w-[16px] md:h-[16px]" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={hours.toString().padStart(2, '0')}
              onChange={handleHoursInput}
              className="w-12 h-10 md:w-10 md:h-8 text-center text-xl md:text-lg font-bold text-gray-800 font-mono bg-gray-50 rounded-lg md:rounded border border-gray-200 focus:outline-none focus:border-sakura-400"
              maxLength={2}
              aria-label="小時"
            />
            <button
              type="button"
              onClick={() => adjustHours(-1)}
              className="w-10 h-8 md:w-8 md:h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg md:rounded transition-all"
              aria-label="減少小時"
            >
              <ChevronDown size={20} className="md:w-[16px] md:h-[16px]" />
            </button>
          </div>

          <span className="text-xl md:text-lg font-bold text-gray-300">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              className="w-10 h-8 md:w-8 md:h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg md:rounded transition-all"
              aria-label="增加分鐘"
            >
              <ChevronUp size={20} className="md:w-[16px] md:h-[16px]" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={minutes.toString().padStart(2, '0')}
              onChange={handleMinutesInput}
              className="w-12 h-10 md:w-10 md:h-8 text-center text-xl md:text-lg font-bold text-gray-800 font-mono bg-gray-50 rounded-lg md:rounded border border-gray-200 focus:outline-none focus:border-sakura-400"
              maxLength={2}
              aria-label="分鐘"
            />
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              className="w-10 h-8 md:w-8 md:h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg md:rounded transition-all"
              aria-label="減少分鐘"
            >
              <ChevronDown size={20} className="md:w-[16px] md:h-[16px]" />
            </button>
          </div>
        </div>

        {/* Actions - 行動端增大按鈕 */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-3 py-2.5 md:px-2 md:py-1 text-sm md:text-[11px] bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 rounded-lg md:rounded transition-colors font-medium"
            aria-label="清除時間"
          >
            清除
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-3 py-2.5 md:px-2 md:py-1 text-sm md:text-[11px] bg-sakura-500 hover:bg-sakura-600 active:bg-sakura-700 text-white rounded-lg md:rounded transition-colors font-medium"
            aria-label="確定選擇時間"
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
      {/* Trigger Button - 行動端增大觸控區域 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={label || '選擇時間'}
        className={`
          flex items-center justify-center transition-all duration-200 min-h-[32px] md:min-h-0 px-1
          ${value
            ? 'text-gray-800 hover:text-sakura-600 active:text-sakura-700'
            : 'px-1.5 py-1 md:py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 active:border-sakura-300 active:text-sakura-500'
          }
        `}
      >
        <span className={`font-mono ${value ? 'text-sm md:text-base font-bold' : 'text-xs'}`}>
          {value || '--:--'}
        </span>
      </button>

      {dropdown}
    </div>
  );
};
