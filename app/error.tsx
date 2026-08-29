"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-zinc-500">{error.message || "Something went wrong"}</p>
      <button
        onClick={() => reset()}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white"
      >
        ลองอีกครั้ง
      </button>
    </div>
  );
}
