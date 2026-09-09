import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyEmployeeSelectPanel } from "@/components/employee/CompanyEmployeeSelectPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const treeResponse = (code: string) => new Response(JSON.stringify({ orgTree: [
  { id: code, code, name: "พนักงานทดสอบ", status: "active" },
] }));

describe("Employee picker asynchronous loading", () => {
  it("ignores a previous company's response after switching during a read", async () => {
    let resolveOld!: (response: Response) => void;
    const fetchTree = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(treeResponse("NEW001"));
    vi.stubGlobal("fetch", fetchTree);
    const onClose = vi.fn();
    render(<CompanyEmployeeSelectPanel open onClose={onClose} onEmployeeSelect={vi.fn()} />);
    act(() => { window.dispatchEvent(new CustomEvent("active-company-changed")); });
    expect(onClose).toHaveBeenCalledOnce();
    expect(fetchTree.mock.calls[0][1].signal.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: /NEW001/ })).toBeVisible();
    await act(async () => resolveOld(treeResponse("OLD001")));
    expect(screen.queryByRole("button", { name: /OLD001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NEW001/ })).toBeVisible();
  });

  it("keeps the panel open on failure and loads employees after retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("HTTP 503")).mockResolvedValueOnce(treeResponse("E001")));
    render(<CompanyEmployeeSelectPanel open onClose={vi.fn()} onEmployeeSelect={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่สามารถโหลดรายชื่อพนักงานได้");
    expect(screen.queryByText("ไม่มีข้อมูลพนักงาน")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByRole("button", { name: /E001/ })).toBeVisible();
  });
});
