import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronUp, ChevronDown, Sun, Sunset, Moon } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

// Period presets for quick selection
const PERIOD_PRESETS = [
  { label: '早晨', icon: Sun, times: ['07:00', '08:00', '09:00', '10:00'], color: 'from-amber-400 to-orange-400' },
  { label: '午後', icon: Sunset, times: ['12:00', '13:00', '14:00', '15:00'], color: 'from-orange-400 to-rose-400' },
  { label: '傍晚', icon: Moon, times: ['17:00', '18:00', '19:00', '20:00'], color: 'from-indigo-400 to-purple-400' },
];

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
      const dropdownWidth = 280;
      const dropdownHeight = 380;
      
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

  const handleQuickSelect = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    setHours(h);
    setMinutes(m);
    onChange(time);
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

  // Get period indicator based on hour
  const getPeriodInfo = (h: number) => {
    if (h >= 5 && h < 12) return { text: '上午', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300' };
    if (h >= 12 && h < 17) return { text: '下午', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300' };
    if (h >= 17 && h < 21) return { text: '傍晚', color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-300' };
    return { text: '夜間', color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-300' };
  };

  const periodInfo = value ? getPeriodInfo(parseInt(value.split(':')[0])) : null;

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Dropdown rendered via Portal
  const dropdown = isOpen && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: 280 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sakura-400 to-sakura-500 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium opacity-90">{label || '選擇時間'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25">
            {getPeriodInfo(hours).text}
          </span>
        </div>
        <div className="text-3xl font-bold font-mono mt-1 tracking-wider">
          {formatTime(hours, minutes)}
        </div>
      </div>

      {/* Time Selector */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustHours(1)}
              className="w-12 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
            >
              <ChevronUp size={22} />
            </button>
            <div className="w-16 h-14 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
              <span className="text-3xl font-bold text-gray-800 font-mono">
                {hours.toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustHours(-1)}
              className="w-12 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
            >
              <ChevronDown size={22} />
            </button>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">時</span>
          </div>

          <span className="text-3xl font-bold text-gray-300 mb-5">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              className="w-12 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
            >
              <ChevronUp size={22} />
            </button>
            <div className="w-16 h-14 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
              <span className="text-3xl font-bold text-gray-800 font-mono">
                {minutes.toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              className="w-12 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
            >
              <ChevronDown size={22} />
            </button>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">分</span>
          </div>
        </div>

        {/* Quick Select */}
        <div className="mt-4 space-y-2">
          {PERIOD_PRESETS.map((period) => (
            <div key={period.label} className="flex items-center gap-2">
              <div className="w-14 flex items-center gap-1 text-[10px] font-medium text-gray-500">
                <period.icon size={12} />
                {period.label}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1">
                {period.times.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleQuickSelect(time)}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all
                      ${formatTime(hours, minutes) === time 
                        ? `bg-gradient-to-r ${period.color} text-white shadow-md scale-105` 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102'
                      }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors font-medium"
          >
            清除
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-sakura-500 to-sakura-600 hover:from-sakura-600 hover:to-sakura-700 text-white rounded-xl transition-all font-medium shadow-md"
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
          flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border-2 transition-all duration-200 min-w-[70px]
          ${value && periodInfo
            ? `${periodInfo.bg} ${periodInfo.border} ${periodInfo.color} font-bold shadow-sm` 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sakura-300 hover:bg-white'
          }
        `}
      >
        <Clock size={14} className="flex-shrink-0" />
        <span className="text-sm font-mono font-bold">
          {value || '--:--'}
        </span>
      </button>

      {dropdown}
    </div>
  );
};
