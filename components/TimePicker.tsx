import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = '選擇時間',
  className = '',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value on mount or when value changes
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h)) setHours(h);
      if (!isNaN(m)) setMinutes(m);
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirm = () => {
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
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

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5'
  };

  const displaySizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`
          flex items-center justify-center gap-1.5 rounded-lg border transition-all
          ${value 
            ? 'bg-sakura-50 border-sakura-200 text-sakura-700 font-bold' 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-sakura-300'
          }
          ${sizeClasses[size]}
        `}
      >
        <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
        <span className={`font-mono ${displaySizeClasses[size]}`}>
          {value || placeholder}
        </span>
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 p-3 min-w-[180px]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"></div>
          
          {/* Time Selector */}
          <div className="flex items-center justify-center gap-2 relative z-10">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustHours(1)}
                className="p-1 text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded transition-colors"
              >
                <ChevronUp size={18} />
              </button>
              <div className="w-12 h-12 flex items-center justify-center bg-sakura-50 rounded-lg border-2 border-sakura-200">
                <span className="text-2xl font-bold text-sakura-600 font-mono">
                  {hours.toString().padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={() => adjustHours(-1)}
                className="p-1 text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            <span className="text-2xl font-bold text-gray-400 pb-1">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustMinutes(5)}
                className="p-1 text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded transition-colors"
              >
                <ChevronUp size={18} />
              </button>
              <div className="w-12 h-12 flex items-center justify-center bg-sakura-50 rounded-lg border-2 border-sakura-200">
                <span className="text-2xl font-bold text-sakura-600 font-mono">
                  {minutes.toString().padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={() => adjustMinutes(-5)}
                className="p-1 text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Quick Select */}
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
            {['08:00', '09:00', '10:00', '12:00', '14:00', '18:00'].map(time => (
              <button
                key={time}
                onClick={() => {
                  const [h, m] = time.split(':').map(Number);
                  setHours(h);
                  setMinutes(m);
                }}
                className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-sakura-100 text-gray-600 hover:text-sakura-600 rounded-md transition-colors"
              >
                {time}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              清除
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 text-xs bg-sakura-500 hover:bg-sakura-600 text-white rounded-lg transition-colors font-medium"
            >
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
