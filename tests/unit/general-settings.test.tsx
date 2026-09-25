import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GeneralSettingsPage from "@/app/(portal)/settings/setting-general/page";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ payrollCutoffDay: 1 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("general settings payroll cutoff dropdown", () => {
  it("loads the saved cutoff from the active company", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ payrollCutoffDay: 8 }), { status: 200 }));
    render(<GeneralSettingsPage />);

    expect(await screen.findByRole("button", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/general", expect.objectContaining({ cache: "no-store" }));
  });

  it("matches the original cutoff list with a selected row and a scrollable menu", () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" }));

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(16);
    expect(listbox).toHaveClass("max-h-[280px]", "overflow-y-auto");
    expect(screen.getByRole("option", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" })).toHaveClass("bg-[#e6f7ff]", "text-[#1890ff]");
    expect(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" })).toHaveClass("bg-white", "text-black/[.65]", "hover:bg-[#f5f5f5]");
  });

  it("updates the selected cutoff and closes the list after choosing another option", () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" }));
    fireEvent.click(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" }));

    expect(screen.getByRole("button", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" })).toBeVisible();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the original change-settings dialog when saving", () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(screen.getByRole("dialog", { name: "เปลี่ยนการตั้งค่า" })).toBeVisible();
    expect(screen.getByText("ยืนยันการเปลี่ยนการตั้งค่า")).toBeVisible();
    expect(screen.getByText("หากมีการตั้งค่าที่ไม่เป็นไปตามเงื่อนไข ระบบจะไม่บันทึก การตั้งค่ารายการนั้น")).toBeVisible();
    expect(screen.getByRole("button", { name: "ยืนยัน" })).toBeVisible();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeVisible();
  });

  it("closes the dialog without marking the form saved when cancelled", () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(screen.queryByRole("dialog", { name: "เปลี่ยนการตั้งค่า" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeVisible();
  });

  it("keeps the save button label after confirming the dialog", async () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "เปลี่ยนการตั้งค่า" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeVisible();
  });

  it("saves the selected cutoff only after confirming the dialog", async () => {
    render(<GeneralSettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" }));
    fireEvent.click(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" }));
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/settings/general", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ payrollCutoffDay: 8 }),
    })));
  });

  it("keeps the dialog open and selected cutoff when saving fails", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ payrollCutoffDay: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "failed" }), { status: 500 }));
    render(<GeneralSettingsPage />);

    await screen.findByRole("button", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" });
    fireEvent.click(screen.getByRole("button", { name: "ตั้งแต่วันที่ 1 จนถึงวันที่ EOM (End of Month)" }));
    fireEvent.click(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" }));
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("dialog", { name: "เปลี่ยนการตั้งค่า" })).toBeVisible();
    expect(screen.getByRole("button", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" })).toBeVisible();
  });
});
