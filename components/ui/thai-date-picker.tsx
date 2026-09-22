"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { th } from "date-fns/locale/th";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatThaiDateNumeric,
  formatThaiMonthYear,
  formatThaiYear,
  gregorianToBuddhistYear,
  parseIsoDate,
  THAI_MONTHS,
  toIsoDate,
} from "@/lib/date/thai-date";
import { cn } from "@/lib/utils";

type CommonProps = {
  name?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

type ThaiDatePickerProps = CommonProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
};

type ThaiDateTimePickerProps = CommonProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

type ThaiDateRangePickerProps = CommonProps & {
  value?: { from: string; to: string };
  defaultValue?: { from: string; to: string };
  onChange?: (value: { from: string; to: string }) => void;
  fromName?: string;
  toName?: string;
  min?: string;
  max?: string;
};

const controlClass =
  "relative flex h-8 w-full items-center justify-between rounded-[4px] border border-[#d9d9d9] bg-white px-3 pr-9 text-left text-sm font-normal leading-5 text-[#34425c] shadow-none outline-none transition-colors focus:border-[#5eaafa] focus:ring-2 focus:ring-[#5eaafa]/20 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#7b8798]";

export function ThaiDatePicker({
  name,
  value,
  defaultValue = "",
  onChange,
  className,
  disabled,
  required,
  placeholder = "เลือกวันที่",
  min,
  max,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ThaiDatePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const resolvedValue = controlled ? value : internalValue;
  const selected = parseIsoDate(resolvedValue);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  const update = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {name && <input type="hidden" name={name} value={resolvedValue} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          data-testid={testId}
          data-required={required || undefined}
          className={cn(controlClass, !selected && "text-muted-foreground/60", className)}
        >
          <span className="truncate">{selected ? formatThaiDateNumeric(resolvedValue) : placeholder}</span>
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={th}
            captionLayout="dropdown-years"
            selected={selected}
            defaultMonth={selected ?? maxDate ?? new Date()}
            startMonth={minDate ?? new Date(1920, 0, 1)}
            endMonth={maxDate ?? new Date(new Date().getFullYear() + 50, 11, 31)}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
            onSelect={(date) => {
              if (!date) return;
              update(toIsoDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

export function ThaiDateRangePicker({
  value,
  defaultValue = { from: "", to: "" },
  onChange,
  fromName,
  toName,
  className,
  disabled,
  required,
  placeholder = "เลือกช่วงวันที่",
  min,
  max,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ThaiDateRangePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const resolvedValue = controlled ? value : internalValue;
  const from = parseIsoDate(resolvedValue.from);
  const to = parseIsoDate(resolvedValue.to);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const selected: DateRange | undefined = from ? { from, to } : undefined;

  const update = (range: DateRange | undefined) => {
    const nextValue = {
      from: range?.from ? toIsoDate(range.from) : "",
      to: range?.to ? toIsoDate(range.to) : "",
    };
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    if (range?.from && range.to) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {fromName && <input type="hidden" name={fromName} value={resolvedValue.from} />}
      {toName && <input type="hidden" name={toName} value={resolvedValue.to} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          data-testid={testId}
          data-required={required || undefined}
          className={cn(controlClass, !from && "text-muted-foreground/60", className)}
        >
          <span className="truncate">
            {from
              ? `${formatThaiDateNumeric(resolvedValue.from)}${to ? ` → ${formatThaiDateNumeric(resolvedValue.to)}` : " → …"}`
              : placeholder}
          </span>
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            locale={th}
            captionLayout="dropdown-years"
            selected={selected}
            defaultMonth={from ?? maxDate ?? new Date()}
            startMonth={minDate ?? new Date(1920, 0, 1)}
            endMonth={maxDate ?? new Date(new Date().getFullYear() + 50, 11, 31)}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
            onSelect={update}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}

export function ThaiDateTimePicker({
  name,
  value,
  defaultValue = "",
  onChange,
  className,
  disabled,
  required,
  placeholder = "เลือกวันและเวลา",
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ThaiDateTimePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const resolvedValue = controlled ? value : internalValue;
  const [datePart = "", timePart = "00:00"] = resolvedValue.split("T");
  const selected = parseIsoDate(datePart);

  const update = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {name && <input type="hidden" name={name} value={resolvedValue} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          data-testid={testId}
          data-required={required || undefined}
          className={cn(controlClass, !selected && "text-muted-foreground/60", className)}
        >
          <span className="truncate">{selected ? `${formatThaiDateNumeric(datePart)} ${timePart.slice(0, 5)} น.` : placeholder}</span>
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={th}
            captionLayout="dropdown-years"
            selected={selected}
            defaultMonth={selected ?? new Date()}
            startMonth={new Date(1920, 0, 1)}
            endMonth={new Date(new Date().getFullYear() + 50, 11, 31)}
            onSelect={(date) => {
              if (!date) return;
              update(`${toIsoDate(date)}T${timePart.slice(0, 5)}`);
            }}
          />
          <div className="border-t p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>เวลา</span>
              <input
                type="time"
                value={timePart.slice(0, 5)}
                onChange={(event) => {
                  const baseDate = datePart || toIsoDate(new Date());
                  update(`${baseDate}T${event.target.value}`);
                }}
                className="h-9 rounded-md border border-[#d9d9d9] px-2 outline-none focus:border-[#5eaafa]"
              />
            </label>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 h-8 w-full rounded-md bg-primary text-sm text-primary-foreground">ตกลง</button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

type ThaiMonthPickerProps = CommonProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

type ThaiYearPickerProps = CommonProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export function ThaiMonthPicker({
  name,
  value,
  defaultValue = "",
  onChange,
  className,
  disabled,
  required,
  placeholder = "เลือกเดือน",
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ThaiMonthPickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const resolvedValue = controlled ? value : internalValue;
  const parsedYear = Number(resolvedValue.slice(0, 4));
  const [visibleYear, setVisibleYear] = useState(Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : new Date().getFullYear());
  const [open, setOpen] = useState(false);

  const update = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={disabled ? undefined : (nextOpen) => {
        if (nextOpen && Number.isFinite(parsedYear) && parsedYear > 0) setVisibleYear(parsedYear);
        setOpen(nextOpen);
      }}
    >
      {name && <input type="hidden" name={name} value={resolvedValue} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          data-testid={testId}
          data-required={required || undefined}
          className={cn(controlClass, !resolvedValue && "text-muted-foreground/60", className)}
        >
          <span className="truncate">{resolvedValue ? formatThaiMonthYear(resolvedValue) : placeholder}</span>
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-[280px] p-3">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setVisibleYear((year) => year - 1)} aria-label="ปีก่อนหน้า" className="rounded-md p-1.5 hover:bg-muted"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-medium">พ.ศ. {gregorianToBuddhistYear(visibleYear)}</span>
            <button type="button" onClick={() => setVisibleYear((year) => year + 1)} aria-label="ปีถัดไป" className="rounded-md p-1.5 hover:bg-muted"><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THAI_MONTHS.map((month, index) => {
              const monthKey = `${visibleYear}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => update(monthKey)}
                  className={cn("rounded-md px-2 py-2 text-sm hover:bg-muted", resolvedValue === monthKey && "bg-primary text-primary-foreground hover:bg-primary")}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

export function ThaiYearPicker({
  name,
  value,
  defaultValue = "",
  onChange,
  className,
  disabled,
  required,
  placeholder = "เลือกปี (พ.ศ.)",
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ThaiYearPickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const resolvedValue = controlled ? value : internalValue;
  const selectedYear = Number(resolvedValue) || new Date().getFullYear();
  const [rangeStart, setRangeStart] = useState(selectedYear - 5);
  const [open, setOpen] = useState(false);

  const update = (year: number) => {
    const nextValue = String(year);
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={disabled ? undefined : (nextOpen) => {
        if (nextOpen) setRangeStart(selectedYear - 5);
        setOpen(nextOpen);
      }}
    >
      {name && <input type="hidden" name={name} value={resolvedValue} />}
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          data-required={required || undefined}
          data-testid={testId}
          className={cn(controlClass, !resolvedValue && "text-muted-foreground/60", className)}
        >
          <span>{resolvedValue ? formatThaiYear(Number(resolvedValue)) : placeholder}</span>
          <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-[280px] p-3">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setRangeStart((year) => year - 12)} aria-label="ช่วงปีก่อนหน้า" className="rounded-md p-1.5 hover:bg-muted"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-medium">พ.ศ. {formatThaiYear(rangeStart)}–{formatThaiYear(rangeStart + 11)}</span>
            <button type="button" onClick={() => setRangeStart((year) => year + 12)} aria-label="ช่วงปีถัดไป" className="rounded-md p-1.5 hover:bg-muted"><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => rangeStart + index).map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => update(year)}
                className={cn("rounded-md px-2 py-2 text-sm hover:bg-muted", resolvedValue === String(year) && "bg-primary text-primary-foreground hover:bg-primary")}
              >
                {formatThaiYear(year)}
              </button>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
