import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, UserCog, UserPlus } from "lucide-react";

export function EmployeePageHeadingCard({
  avatarSrc,
  avatarAlt = "",
  employee,
  onBack,
  backHref,
}: {
  avatarSrc?: string;
  avatarAlt?: string;
  employee?: {
    name: string;
    position: string;
    department: string;
    employmentType: string;
    startDate: string;
    confirmationDate: string;
    phone: string;
    email: string;
  };
  onBack?: () => void;
  backHref?: string;
}) {
  return (
    <section className="h-[123px] w-full overflow-hidden rounded-xl border border-[#e5eaf2] bg-white shadow-[0_3px_12px_rgba(29,52,93,.07)]">
      <div className="flex h-full items-center px-4 py-3">
        <div className={avatarSrc ? "min-w-0 shrink-0 self-start lg:w-[210.8px]" : "min-w-0 self-start"}>
          <p className="flex items-center gap-0 text-sm font-normal leading-[22.001px] text-[#7b8798]">
            <span>พนักงาน</span>
            <ChevronRight className="size-4" />
            <span>ข้อมูลพนักงาน</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="relative -left-[5px] -ml-1 mr-1 flex size-7 shrink-0 items-center justify-center rounded text-[#5d7695] transition-colors hover:bg-[#f0f6fc] hover:text-[#1474ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]"
                aria-label="กลับไปหน้าข้อมูลพนักงาน"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : backHref ? (
              <Link
                href={backHref}
                className="relative -left-[5px] -ml-1 mr-1 flex size-7 shrink-0 items-center justify-center rounded text-[#5d7695] transition-colors hover:bg-[#f0f6fc] hover:text-[#1474ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]"
                aria-label="กลับไปหน้าข้อมูลพนักงาน"
              >
                <ChevronLeft className="size-5" />
              </Link>
            ) : null}
            <h1 className={`${employee ? "relative -left-5" : ""} text-xl font-semibold tracking-tight text-[#172348]`}>ข้อมูลพนักงาน</h1>
          </div>
        </div>
        {avatarSrc && (
          <div className="flex h-full w-32 shrink-0 items-center justify-start pl-6 pr-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={avatarAlt}
              className="block size-[86.4px] rounded-full bg-white object-cover shadow-[0_0_0_1.8px_#20b889,0_0_0_5.4px_rgba(32,184,137,.14)]"
            />
          </div>
        )}
        {employee && (
          <div className="relative -left-2 ml-3 flex min-w-0 flex-1 items-center justify-between gap-8 pr-[2vw]">
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-xl font-semibold leading-[30.4px] text-[#172348]">{employee.name}</p>
              <div className="text-sm font-normal leading-[20.8px] text-[#627895]">
                <p>ตำแหน่ง: <span className="font-medium text-[#29466f]">{employee.position}</span></p>
                <p>แผนก: <span className="font-medium text-[#29466f]">{employee.department}</span></p>
                <p>ประเภทพนักงาน: <span className="font-medium text-[#29466f]">{employee.employmentType}</span></p>
              </div>
            </div>
            <div className="relative top-[5px] flex min-w-0 flex-col text-sm font-normal leading-[20.8px] text-[#627895]">
              <p>วันที่เริ่มงาน: <span className="font-medium text-[#29466f]">{employee.startDate}</span></p>
              <p>วันที่บรรจุ: <span className="font-medium text-[#29466f]">{employee.confirmationDate}</span></p>
              <p>เบอร์โทรศัพท์: <span className="font-medium text-[#29466f]">{employee.phone}</span></p>
              <p className="truncate">อีเมล: <span className="font-medium text-[#29466f]">{employee.email}</span></p>
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1">
                <span className="text-base font-medium leading-6 text-[#29466f]">ผู้อนุมัติ</span>
                <Pencil className="size-4 text-[#5e7693]" />
              </div>
              <button
                type="button"
                className="mt-2 flex size-[35px] items-center justify-center rounded-full border border-white/80 bg-[#a9ccef] text-[#126fd5] transition-colors hover:bg-[#94bff0]"
                aria-label="ผู้อนุมัติ 8 คนขึ้นไป"
              >
                <UserPlus className="size-4" />
              </button>
            </div>
          </div>
        )}
        {employee && (
          <div className="flex shrink-0 flex-col justify-center">
            <button
              type="button"
              className="inline-flex h-[33px] min-w-16 items-center justify-center gap-2 rounded-[4px] border border-[#dce7f3] bg-white px-4 text-sm font-semibold leading-9 text-[rgba(0,0,0,0.87)] shadow-[0px_2px_4px_1px_rgba(29,52,93,0.12)] transition-colors hover:bg-[#f6f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eaafa]"
            >
              <UserCog className="size-5 text-black/87" />
              จัดการ
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
