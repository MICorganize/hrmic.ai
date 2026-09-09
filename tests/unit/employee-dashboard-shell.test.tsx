import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrganizationEmployeePage from "@/app/(portal)/organization/organization-employee/page";
import { preloadEmployeeSummary, type EmployeeSummaryData } from "@/lib/employee/summary-client";

vi.mock("next/dynamic", () => ({ default: () => () => <div>Employee editor</div> }));
vi.mock("@/lib/employee/summary-client", () => ({ preloadEmployeeSummary: vi.fn(), invalidatePreloadedEmployeeSummary: vi.fn() }));

const summary: EmployeeSummaryData = {
  company: { id: "company-pecth", code: "PECTH", name: "PECTH", employeeLimit: 50 },
  total: 38,
  byGender: { male: 20, female: 18, other: 0, unknown: 0 },
  byEmploymentType: {}, byBranch: [], byNationality: [], history: [], historyTotal: 0,
};

beforeEach(() => { vi.mocked(preloadEmployeeSummary).mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Employee Dashboard shell-first rendering", () => {
  it("opens the employee panel on the first click while summary and tree reads are pending", async () => {
    vi.mocked(preloadEmployeeSummary).mockReturnValue(new Promise(() => {}));
    let resolveTree!: (response: Response) => void;
    const fetchTree = vi.fn(() => new Promise<Response>((resolve) => { resolveTree = resolve; }));
    vi.stubGlobal("fetch", fetchTree);
    render(<OrganizationEmployeePage />);
    expect(fetchTree).not.toHaveBeenCalled();
    const trigger = screen.getByRole("button", { name: "เลือกพนักงาน" });
    fireEvent.click(trigger);
    expect(screen.getByRole("complementary", { name: "รายชื่อพนักงาน" })).toBeVisible();
    expect(screen.getByTestId("org-emp-select-tree")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "เมนูย่อย" })).toBeVisible();
    expect(screen.queryByText("Employee editor")).not.toBeInTheDocument();
    expect(fetchTree).toHaveBeenCalledWith("/api/employee?view=tree&includeEmployees=1", expect.objectContaining({ cache: "no-store" }));
    await act(async () => resolveTree(new Response(JSON.stringify({ orgTree: [{
      id: "company-pecth", code: "PECTH", name: "PECTH", count: 1, children: [{
        id: "employee-1", code: "E001", name: "พนักงานทดสอบ", status: "active",
      }],
    }] }))));
    expect(screen.getByRole("button", { name: /E001: พนักงานทดสอบ/ })).toBeVisible();
    expect(screen.getByTestId("org-emp-select-tree")).toHaveAttribute("aria-busy", "false");
    fireEvent.click(trigger);
    expect(screen.queryByRole("complementary", { name: "รายชื่อพนักงาน" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: /E001: พนักงานทดสอบ/ })).toBeVisible();
    expect(fetchTree).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /E001: พนักงานทดสอบ/ }));
    expect(screen.getByText("Employee editor")).toBeVisible();
  });

  it("sends the shell as HTML without requesting summary and hydrates while data is pending", async () => {
    vi.mocked(preloadEmployeeSummary).mockReturnValue(new Promise(() => {}));
    const html = renderToString(<OrganizationEmployeePage />);
    expect(html).toContain("เมนูย่อย");
    expect(html).toContain("Dashboard");
    expect(html).toContain("กำลังโหลดข้อมูลพนักงาน");
    expect(preloadEmployeeSummary).not.toHaveBeenCalled();

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <OrganizationEmployeePage />, { onRecoverableError });
    });
    expect(screen.getByRole("region", { name: "Dashboard พนักงาน" })).toHaveAttribute("aria-busy", "true");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(preloadEmployeeSummary).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
    container.remove();
  });

  it("shows the submenu before a slow summary resolves, then fills the employee count", async () => {
    let resolveSummary!: (data: EmployeeSummaryData) => void;
    vi.mocked(preloadEmployeeSummary).mockReturnValue(new Promise((resolve) => { resolveSummary = resolve; }));
    render(<OrganizationEmployeePage />);
    expect(screen.getByRole("heading", { name: "เมนูย่อย" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดข้อมูลพนักงาน");
    expect(screen.queryByText("0/500 คน")).not.toBeInTheDocument();
    await act(async () => resolveSummary(summary));
    expect(screen.getByText("38/50 คน")).toBeVisible();
    expect(screen.queryByText("กำลังโหลดข้อมูลพนักงาน")).not.toBeInTheDocument();
  });

  it("keeps navigation visible on API failure and fills the shell after retry", async () => {
    vi.mocked(preloadEmployeeSummary)
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(summary);
    render(<OrganizationEmployeePage />);
    const retry = await screen.findByRole("button", { name: "ลองใหม่" });
    expect(screen.getByRole("heading", { name: "เมนูย่อย" })).toBeVisible();
    fireEvent.click(retry);
    expect(await screen.findByText("38/50 คน")).toBeVisible();
  });
});
