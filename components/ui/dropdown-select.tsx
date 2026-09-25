"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type OptionElementProps = {
  children?: ReactNode;
  value?: string | number;
  disabled?: boolean;
};

export type DropdownSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  children?: ReactNode;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
  value?: string;
};

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement<OptionElementProps>(node)) return textContent(node.props.children);
  return "";
}

function collectOptions(children: ReactNode): DropdownOption[] {
  const options: DropdownOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement<OptionElementProps>(child)) return;
    if (child.type === Fragment) {
      options.push(...collectOptions(child.props.children));
      return;
    }
    if (child.type !== "option") return;

    const label = textContent(child.props.children);
    options.push({
      value: String(child.props.value ?? label),
      label,
      disabled: Boolean(child.props.disabled),
    });
  });

  return options;
}

export function DropdownSelect({
  children,
  className,
  defaultValue,
  disabled = false,
  id,
  name,
  onChange,
  placeholder,
  value,
  ...selectProps
}: DropdownSelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const firstValue = options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => {
    const initialValue = defaultValue ?? firstValue;
    const index = options.findIndex((option) => option.value === initialValue);
    return index >= 0 ? index : 0;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value ?? "" : internalValue;
  const selectedIndex = options.findIndex((option) => option.value === currentValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const emptyOption = options.find((option) => option.value === "");
  const displayLabel = selectedOption?.label || emptyOption?.label || placeholder || "เลือก";

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const emitChange = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const selectOption = (option: DropdownOption, index: number) => {
    if (option.disabled) return;
    setActiveIndex(index);
    emitChange(option.value);
    setOpen(false);
  };

  const moveActive = (direction: 1 | -1) => {
    if (options.length === 0) return;
    setActiveIndex((current) => {
      let next = current;
      for (let count = 0; count < options.length; count += 1) {
        next = (next + direction + options.length) % options.length;
        if (!options[next].disabled) return next;
      }
      return current;
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <select
        {...selectProps}
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        name={name}
        tabIndex={-1}
        value={currentValue}
        onChange={() => undefined}
      >
        {children}
      </select>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          className,
          "flex w-full items-center justify-between rounded-lg border border-[#dfe4e8] bg-white px-3 text-left font-light text-[#757575] shadow-none outline-none transition-colors",
          open && "border-[#5eaafa] ring-2 ring-[#5eaafa]/20",
          disabled && "cursor-not-allowed bg-[#f5f7fa] text-[#9aa5b5]"
        )}
        onClick={() => {
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) setOpen(true);
            moveActive(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            moveActive(-1);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
            } else if (options[activeIndex]) {
              selectOption(options[activeIndex], activeIndex);
            }
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-[#8b8b8b] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={selectProps["aria-label"] ?? placeholder}
          className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 max-h-[260px] overflow-y-auto rounded-[2px] border border-[#e0e0e0] bg-white py-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
        >
          {options.map((option, index) => {
            const selected = option.value === currentValue;
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option, index)}
                className={cn(
                  "flex min-h-8 w-full items-center px-3 py-1 text-left text-sm font-light leading-5 text-[#555] transition-colors",
                  selected
                    ? "bg-[#e2f4ff] font-bold hover:bg-[#e2f4ff]"
                    : "hover:bg-[#f2f2f2]",
                  option.disabled && "cursor-not-allowed text-[#b5b5b5]"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
