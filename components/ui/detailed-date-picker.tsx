"use client";

import { useState } from "react";
import { addMonths, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BUDDHIST_YEAR_OFFSET,
  formatThaiDateNumeric,
  parseIsoDate,
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  toIsoDate,
} from "@/lib/date/thai-date";
import { cn } from "@/lib/utils";

type DateView = "day" | "month" | "year";

type DetailedDatePickerProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  selectedDate?: Date;
  onChange?: (value: string) => void;
  onDateChange?: (date: Date | undefined) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  disableFuture?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

const controlClass =
  "relative flex h-8 w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 pr-9 text-left text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20 data-[state=open]:border-[#5eaafa] data-[state=open]:ring-2 data-[state=open]:ring-[#5eaafa]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#7b8798]";

export function DetailedDatePicker({
  name,
  value,
  defaultValue = "",
  selectedDate,
  onChange,
  onDateChange,
  min,
  max,
  disabled,
  required,
  disableFuture = false,
  placeholder = "กรุณาเลือก",
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: DetailedDatePickerProps) {
  const today = startOfDay(new Date());
  const controlledValue = value !== undefined;
  const [internalDate, setInternalDate] = useState<Date | undefined>(() => parseIsoDate(defaultValue));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DateView>("day");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [yearRangeStart, setYearRangeStart] = useState(() => today.getFullYear() + BUDDHIST_YEAR_OFFSET - 9);

  const resolvedSelected = selectedDate ?? (controlledValue ? parseIsoDate(value) : internalDate);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const buddhistYear = visibleYear + BUDDHIST_YEAR_OFFSET;
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const isCurrentOrFutureMonth = visibleMonth.getTime() >= currentMonthStart.getTime();

  const isDisabledDate = (date: Date) => Boolean(
    (disableFuture && date > today) ||
    (minDate && date < minDate) ||
    (maxDate && date > maxDate),
  );

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      const anchorDate = resolvedSelected ?? maxDate ?? today;
      setVisibleMonth(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
      setYearRangeStart(anchorDate.getFullYear() + BUDDHIST_YEAR_OFFSET - 9);
      setView("day");
    }
  };

  const moveCalendar = (direction: -1 | 1) => {
    if (view === "day") {
      setVisibleMonth((current) => addMonths(current, direction));
      return;
    }
    if (view === "month") {
      setVisibleMonth((current) => new Date(current.getFullYear() + direction, current.getMonth(), 1));
      return;
    }
    setYearRangeStart((current) => current + direction * 12);
  };

  const update = (date: Date | undefined) => {
    if (date && isDisabledDate(date)) return;
    if (!controlledValue && selectedDate === undefined) setInternalDate(date);
    onChange?.(date ? toIsoDate(date) : "");
    onDateChange?.(date);
  };

  const selectDay = (day: number) => {
    const date = new Date(visibleYear, visibleMonthIndex, day);
    if (isDisabledDate(date)) return;
    update(date);
    setOpen(false);
  };

  const selectMonth = (monthIndex: number) => {
    const isFutureMonth = disableFuture && visibleYear === today.getFullYear() && monthIndex > today.getMonth();
    if (disableFuture && (visibleYear > today.getFullYear() || isFutureMonth)) return;
    setVisibleMonth(new Date(visibleYear, monthIndex, 1));
    setView("day");
  };

  const selectYear = (yearBE: number) => {
    const year = yearBE - BUDDHIST_YEAR_OFFSET;
    if (disableFuture && year > today.getFullYear()) return;
    const month = disableFuture && year === today.getFullYear() ? Math.min(visibleMonthIndex, today.getMonth()) : visibleMonthIndex;
    setVisibleMonth(new Date(year, month, 1));
    setView("month");
  };

  const dayCells = Array.from(
    { length: ((new Date(visibleYear, visibleMonthIndex, 1).getDay() + 6) % 7) + new Date(visibleYear, visibleMonthIndex + 1, 0).getDate() },
    (_, index) => index < ((new Date(visibleYear, visibleMonthIndex, 1).getDay() + 6) % 7) ? null : index - ((new Date(visibleYear, visibleMonthIndex, 1).getDay() + 6) % 7) + 1,
  );
  const selectedText = resolvedSelected ? formatThaiDateNumeric(resolvedSelected) : "";

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={resolvedSelected ? toIsoDate(resolvedSelected) : ""} />}
      <Popover open={open} onOpenChange={disabled ? undefined : changeOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel ?? placeholder}
            data-testid={testId}
            data-required={required || undefined}
            className={cn(controlClass, className)}
          >
            <span className={cn("truncate", !resolvedSelected && "text-muted-foreground/60")}>{selectedText || placeholder}</span>
            <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          </button>
        </PopoverTrigger>
        {!disabled && (
          <PopoverContent align="start" sideOffset={6} className="w-[276px] gap-0 overflow-hidden rounded-lg bg-white p-0 shadow-[0_4px_18px_rgba(28,37,54,0.16)] ring-1 ring-black/5">
            <div className="flex h-12 items-center justify-between border-b border-[#f0f0f0] px-2">
              <button type="button" onClick={() => moveCalendar(-1)} aria-label={view === "year" ? "ช่วงปีก่อนหน้า" : view === "month" ? "ปีก่อนหน้า" : "เดือนก่อนหน้า"} className="flex size-8 items-center justify-center rounded-md text-[#858b94] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => { if (view === "day") setView("month"); else if (view === "month") { setYearRangeStart(buddhistYear - 9); setView("year"); } }} className={cn("rounded px-2 py-1 text-sm font-semibold text-[#30343b]", view !== "year" && "hover:bg-[#eef7ff] hover:text-[#5eaafa]")}>
                {view === "day" ? `${THAI_MONTHS[visibleMonthIndex]} ${buddhistYear}` : view === "month" ? buddhistYear : `${yearRangeStart} - ${yearRangeStart + 11}`}
              </button>
              <button type="button" disabled={disableFuture && view !== "year" && (view === "month" ? visibleYear >= today.getFullYear() : isCurrentOrFutureMonth)} onClick={() => moveCalendar(1)} aria-label={view === "year" ? "ช่วงปีถัดไป" : view === "month" ? "ปีถัดไป" : "เดือนถัดไป"} className="flex size-8 items-center justify-center rounded-md text-[#858b94] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa] disabled:cursor-not-allowed disabled:text-[#d4d6da] disabled:hover:bg-transparent">
                <ChevronRight className="size-5" />
              </button>
            </div>

            {view === "day" && (
              <div className="px-3 pb-3 pt-2">
                <div className="grid grid-cols-7">
                  {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((weekday) => <span key={weekday} className="flex h-8 items-center justify-center text-xs font-normal text-[#8b9098]">{weekday}</span>)}
                  {dayCells.map((day, index) => {
                    if (day === null) return <span key={`empty-${index}`} className="size-8" />;
                    const date = new Date(visibleYear, visibleMonthIndex, day);
                    const isToday = date.getTime() === today.getTime();
                    const isSelected = resolvedSelected?.getTime() === date.getTime();
                    const unavailable = isDisabledDate(date);
                    return <button key={day} type="button" disabled={unavailable} onClick={() => selectDay(day)} className={cn("mx-auto flex size-8 items-center justify-center rounded-md text-sm font-normal text-[#464b53] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isToday && !isSelected && "font-semibold text-[#5eaafa]", isSelected && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", unavailable && "cursor-not-allowed text-[#c9ccd1] hover:bg-transparent hover:text-[#c9ccd1]")}>{day}</button>;
                  })}
                </div>
              </div>
            )}

            {view === "month" && (
              <div className="grid min-h-[202px] grid-cols-4 gap-x-1 gap-y-3 px-4 py-5">
                {THAI_MONTHS_SHORT.map((month, monthIndex) => {
                  const isFuture = disableFuture && (visibleYear > today.getFullYear() || (visibleYear === today.getFullYear() && monthIndex > today.getMonth()));
                  const isActive = resolvedSelected?.getFullYear() === visibleYear && resolvedSelected.getMonth() === monthIndex;
                  return <button key={month} type="button" disabled={isFuture} onClick={() => selectMonth(monthIndex)} className={cn("rounded-md text-sm text-[#4b5058] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isActive && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", isFuture && "cursor-not-allowed bg-[#fafafa] text-[#c9ccd1] hover:bg-[#fafafa] hover:text-[#c9ccd1]")}>{month}</button>;
                })}
              </div>
            )}

            {view === "year" && (
              <div className="grid min-h-[202px] grid-cols-4 gap-x-1 gap-y-3 px-4 py-5">
                {Array.from({ length: 12 }, (_, index) => yearRangeStart + index).map((yearBE) => {
                  const isFuture = disableFuture && yearBE - BUDDHIST_YEAR_OFFSET > today.getFullYear();
                  const isActive = resolvedSelected ? resolvedSelected.getFullYear() + BUDDHIST_YEAR_OFFSET === yearBE : false;
                  return <button key={yearBE} type="button" disabled={isFuture} onClick={() => selectYear(yearBE)} className={cn("rounded-md text-sm text-[#4b5058] transition-colors hover:bg-[#eef7ff] hover:text-[#5eaafa]", isActive && "bg-[#5eaafa] text-white hover:bg-[#4a9be9] hover:text-white", isFuture && "cursor-not-allowed bg-[#fafafa] text-[#c9ccd1] hover:bg-[#fafafa] hover:text-[#c9ccd1]")}>{yearBE}</button>;
                })}
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
