"use client";

/**
 * RideCast - System Calendar Component
 * =====================================
 * Custom calendar interface allowing passengers to pick travel dates:
 * - Highlights a 7-day active forecasting window.
 * - Supports month-by-month navigation (prev/next).
 * - Accurately computes day cells, overflow days from adjacent months, and current day dot markers.
 * 
 * Key Concepts for Beginners:
 * ---------------------------
 * 1. Date Math in JavaScript:
 *    - `new Date(year, month + 1, 0).getDate()` returns the total number of days in `month`.
 *    - `new Date(year, month, 1).getDay()` returns the weekday index (0 for Sunday).
 * 
 * 2. 7-Day Window:
 *    - Generates a `Set` of the next 7 valid dates for LSTM sequence prediction.
 */

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SystemCalendarProps {
  selectedDate: string; // ISO format string: YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function SystemCalendar({
  selectedDate,
  onSelectDate,
}: SystemCalendarProps) {
  const parsedSelected = new Date(selectedDate);
  const [currentYear, setCurrentYear] = useState(
    isNaN(parsedSelected.getFullYear()) ? new Date().getFullYear() : parsedSelected.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(parsedSelected.getMonth()) ? new Date().getMonth() : parsedSelected.getMonth()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a Set of 7 active forecast dates starting from today
  const selectableDateSet = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    selectableDateSet.add(formatDate(d));
  }

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Compute calendar grid dimensions
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 = SUN, 1 = MON, ... 6 = SAT
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  interface CalendarCell {
    dayNum: number;
    monthOffset: number; // -1 = prev, 0 = current, 1 = next
    dateStr: string;
  }

  const cells: CalendarCell[] = [];

  // 1. Previous month overflow days
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(currentYear, currentMonth - 1, day);
    cells.push({
      dayNum: day,
      monthOffset: -1,
      dateStr: formatDate(prevDate),
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const currDate = new Date(currentYear, currentMonth, d);
    cells.push({
      dayNum: d,
      monthOffset: 0,
      dateStr: formatDate(currDate),
    });
  }

  // 3. Next month overflow days
  const totalGridSize = cells.length > 35 ? 42 : 35;
  const remaining = totalGridSize - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(currentYear, currentMonth + 1, d);
    cells.push({
      dayNum: d,
      monthOffset: 1,
      dateStr: formatDate(nextDate),
    });
  }

  const yearShort = currentYear.toString().slice(-2);
  const monthHeader = `${MONTH_NAMES_SHORT[currentMonth]} ${yearShort}`;

  return (
    <div className="w-full bg-[#1f2329] text-[#EDDECB] rounded-3xl p-4 sm:p-5 shadow-2xl border border-[#6B8D8A]/30 select-none">
      {/* ── TOP HEADER (CALENDAR & MONTH NAV) ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#EDDECB] uppercase tracking-wider">
            CALENDAR
          </span>
        </div>

        {/* Month Navigation Buttons */}
        <div className="flex items-center gap-1 text-xs font-black text-[#F3B763] tracking-wider">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-[#B5C3C4] hover:text-[#F3B763] hover:bg-[#2a3038] rounded-lg transition-colors cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <span className="min-w-[60px] text-center font-mono font-bold text-[#EDDECB]">
            {monthHeader}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-[#B5C3C4] hover:text-[#F3B763] hover:bg-[#2a3038] rounded-lg transition-colors cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── WEEKDAY LABELS (SUN MON TUE WED THU FRI SAT) ── */}
      <div className="grid grid-cols-7 text-center mb-1.5">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-[10px] font-black text-[#B5C3C4] uppercase tracking-tight"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── CALENDAR DAYS GRID ── */}
      <div className="grid grid-cols-7 gap-x-1 gap-y-0.5 text-center">
        {cells.map((cell, idx) => {
          const isSelected = selectedDate === cell.dateStr;
          const isSelectable = selectableDateSet.has(cell.dateStr);
          const isToday = formatDate(today) === cell.dateStr;

          return (
            <div key={`${cell.dateStr}-${idx}`} className="flex flex-col items-center py-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  if (cell.monthOffset === -1) {
                    handlePrevMonth();
                  } else if (cell.monthOffset === 1) {
                    handleNextMonth();
                  }
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs flex items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-[#AF4B47] text-[#EDDECB] font-black shadow-lg shadow-[#AF4B47]/40 scale-105 ring-2 ring-[#F3B763]/50"
                    : isSelectable
                    ? "bg-[#96BCBB]/20 text-[#EDDECB] font-black border border-[#96BCBB]/50 hover:bg-[#F3B763] hover:text-[#131518]"
                    : cell.monthOffset === 0
                    ? "text-[#B5C3C4]/40 hover:text-[#EDDECB] hover:bg-[#2a3038] font-medium"
                    : "text-[#B5C3C4]/20 hover:text-[#B5C3C4]/40 font-normal"
                }`}
                title={isSelectable ? "7-day forecasting window active" : undefined}
              >
                {cell.dayNum}
              </button>

              {/* Indicator dot under today / active day */}
              <div className="h-1 flex items-center justify-center mt-0.5">
                {isToday && !isSelected ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F3B763]"></span>
                ) : isSelectable && !isSelected ? (
                  <span className="w-1 h-1 rounded-full bg-[#96BCBB]/60"></span>
                ) : (
                  <span className="w-1 h-1"></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
