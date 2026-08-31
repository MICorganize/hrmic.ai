import { cn } from "@/lib/utils";

export function HRMicWordmark({ compact = false, primaryClassName }: { compact?: boolean; primaryClassName?: string }) {
  return (
    <div className={cn("select-none text-center font-semibold leading-none tracking-tight antialiased [font-family:var(--font-kanit)]", compact ? "text-[29.76px]" : "text-[59.52px]") }>
      <span className={cn("text-[#0799f4] [text-shadow:0_0_1.5px_#047ac4]", primaryClassName)}>HRMic</span>
      <span className="text-[#ff6b00] [text-shadow:0_0_1.5px_#cc5500]">.ai</span>
      <p className={cn("font-light tracking-normal text-[#4f5660] antialiased [text-shadow:0_0_18px_#c3c8d0]", compact ? "-mt-[11.5px] text-[12.48px]" : "-mt-[16.8px] text-[17.472px]")}>Automated HRM Solutions</p>
    </div>
  );
}
