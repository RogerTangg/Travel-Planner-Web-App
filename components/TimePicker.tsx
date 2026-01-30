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
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: 180 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Time Selector */}
      <div className="p-3">
        <div className="flex items-center justify-center gap-2">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustHours(1)}
              className="w-8 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronUp size={16} />
            </button>
            <input
              type="text"
              value={hours.toString().padStart(2, '0')}
              onChange={handleHoursInput}
              className="w-10 h-8 text-center text-lg font-bold text-gray-800 font-mono bg-gray-50 rounded border border-gray-200 focus:outline-none focus:border-sakura-400"
              maxLength={2}
            />
            <button
              type="button"
              onClick={() => adjustHours(-1)}
              className="w-8 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <span className="text-lg font-bold text-gray-300">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              className="w-8 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronUp size={16} />
            </button>
            <input
              type="text"
              value={minutes.toString().padStart(2, '0')}
              onChange={handleMinutesInput}
              className="w-10 h-8 text-center text-lg font-bold text-gray-800 font-mono bg-gray-50 rounded border border-gray-200 focus:outline-none focus:border-sakura-400"
              maxLength={2}
            />
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              className="w-8 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors font-medium"
          >
            清除
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-2 py-1 text-[11px] bg-sakura-500 hover:bg-sakura-600 text-white rounded transition-colors font-medium"
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
            : 'px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
          }
        `}
      >
        <span className={`font-mono ${value ? 'text-sm font-bold' : 'text-[11px]'}`}>
          {value || '--:--'}
        </span>
      </button>

      {dropdown}
    </div>
  );
};
