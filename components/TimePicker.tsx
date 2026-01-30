import React, { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value when it changes
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

  // Get period indicator
  const getPeriodInfo = (h: number) => {
    if (h >= 5 && h < 12) return { text: '上午', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (h >= 12 && h < 17) return { text: '下午', color: 'text-orange-500', bg: 'bg-orange-50' };
    if (h >= 17 && h < 21) return { text: '傍晚', color: 'text-rose-500', bg: 'bg-rose-50' };
    return { text: '夜間', color: 'text-indigo-500', bg: 'bg-indigo-50' };
  };

  const periodInfo = getPeriodInfo(hours);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`
          flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border-2 transition-all duration-200
          ${value 
            ? `${periodInfo.bg} border-current ${periodInfo.color} font-bold shadow-sm` 
            : 'bg-white border-gray-200 text-gray-400 hover:border-sakura-300 hover:bg-sakura-50'
          }
        `}
      >
        <Clock size={12} className="flex-shrink-0" />
        <span className="text-sm font-mono font-semibold min-w-[40px]">
          {value || '--:--'}
        </span>
      </button>

      {/* Dropdown Picker */}
      {isOpen && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[260px]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-sakura-400 to-sakura-500 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-80">{label || '選擇時間'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur`}>
                {periodInfo.text}
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
                  onClick={() => adjustHours(1)}
                  className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
                >
                  <ChevronUp size={20} />
                </button>
                <div className="w-16 h-14 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 shadow-inner">
                  <span className="text-3xl font-bold text-gray-800 font-mono">
                    {hours.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={() => adjustHours(-1)}
                  className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
                >
                  <ChevronDown size={20} />
                </button>
                <span className="text-[10px] text-gray-400 mt-1">時</span>
              </div>

              <span className="text-3xl font-bold text-gray-300 mb-6">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => adjustMinutes(5)}
                  className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
                >
                  <ChevronUp size={20} />
                </button>
                <div className="w-16 h-14 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 shadow-inner">
                  <span className="text-3xl font-bold text-gray-800 font-mono">
                    {minutes.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={() => adjustMinutes(-5)}
                  className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-lg transition-all"
                >
                  <ChevronDown size={20} />
                </button>
                <span className="text-[10px] text-gray-400 mt-1">分</span>
              </div>
            </div>

            {/* Quick Select Periods */}
            <div className="mt-4 space-y-2">
              {PERIOD_PRESETS.map((period) => (
                <div key={period.label} className="flex items-center gap-2">
                  <div className={`w-16 flex items-center gap-1 text-[10px] font-medium text-gray-500`}>
                    <period.icon size={12} />
                    {period.label}
                  </div>
                  <div className="flex-1 flex gap-1">
                    {period.times.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleQuickSelect(time)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all
                          ${value === time 
                            ? `bg-gradient-to-r ${period.color} text-white shadow-md` 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                onClick={handleClear}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors font-medium"
              >
                清除
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-sakura-500 to-sakura-600 hover:from-sakura-600 hover:to-sakura-700 text-white rounded-xl transition-all font-medium shadow-md hover:shadow-lg"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
