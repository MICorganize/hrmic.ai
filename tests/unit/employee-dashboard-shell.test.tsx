import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OrganizationEmployeePage from "@/app/(portal)/organization/organization-employee/employee-dashboard-client";
import { preloadEmployeeSummary, type EmployeeSummaryData } from "@/lib/employee/summary-client";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const label = loader.toString().includes("create/page") ? "Employee create" : "Employee editor";
    return () => <div>{label}</div>;
  },
}));
vi.mock("@/lib/employee/summary-client", () => ({
  preloadEmployeeSummary: vi.fn(),
  invalidatePreloadedEmployeeSummary: vi.fn(),
  storePreloadedEmployeeSummary: vi.fn(),
}));

const summary: EmployeeSummaryData = {
  company: { id: "company-pecth", code: "PECTH", name: "PECTH", employeeLimit: 50 },
  total: 38,
  byGender: { male: 20, female: 18, other: 0, unknown: 0 },
  byEmploymentType: {}, byBranch: [], byNationality: [], history: [], historyTotal: 0,
};

beforeEach(() => {
  vi.mocked(preloadEmployeeSummary).mockReset();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("view=basic")) {
      return new Response(JSON.stringify({ employees: [], nextCursor: null }));
    }
    throw new Error(`Unexpected request: ${String(input)}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Employee Dashboard shell-first rendering", () => {
  it("hydrates a streamed server snapshot without an employee API request", async () => {
    render(<OrganizationEmployeePage initialStats={Promise.resolve(summary)} />);
    expect(await screen.findByText("38/50 คน")).toBeVisible();
    expect(preloadEmployeeSummary).not.toHaveBeenCalled();
  });

  it("opens the add-employee form directly on the first click", async () => {
    render(<OrganizationEmployeePage initialStats={Promise.resolve(summary)} />);
    await screen.findByText("38/50 คน");

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มพนักงาน" }));

    expect(screen.getByText("Employee create")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("does not render the legacy employee picker while the summary is pending", () => {
    vi.mocked(preloadEmployeeSummary).mockReturnValue(new Promise(() => {}));
    render(<OrganizationEmployeePage />);
    expect(screen.queryByRole("button", { name: "เลือกพนักงาน" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "รายชื่อพนักงาน" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "เมนูย่อย" })).toBeVisible();
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
