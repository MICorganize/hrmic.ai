import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCompany: vi.fn(),
  findEmployees: vi.fn(),
  findEmployee: vi.fn(),
  transaction: vi.fn(),
  updateEmployee: vi.fn(),
  refreshSummary: vi.fn(),
  workTime: vi.fn(),
  shiftHoliday: vi.fn(),
  overtime: vi.fn(),
  general: vi.fn(),
}));

vi.mock("@/lib/active-company", () => ({ getActiveCompany: mocks.getActiveCompany }));
vi.mock("@/lib/employee/summary", () => ({ refreshEmployeeSummarySnapshot: mocks.refreshSummary }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: { findMany: mocks.findEmployees, findFirst: mocks.findEmployee },
    $transaction: mocks.transaction,
    individualWorkTimeSetting: { findMany: mocks.workTime },
    individualShiftHolidaySetting: { findUnique: mocks.shiftHoliday },
    individualOvertimeSetting: { findMany: mocks.overtime },
    individualGeneralSetting: { findUnique: mocks.general },
  },
}));

import { POST as bulkUpdate } from "@/app/api/employee/bulk/route";
import { GET as individualSettings } from "@/app/api/payroll/individual-settings-snapshot/route";

const company = { id: "11111111-1111-4111-8111-111111111111", name: "MIC", code: "MIC", employeeLimit: 100 };
const employeeId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveCompany.mockResolvedValue(company);
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    employee: { update: mocks.updateEmployee },
  }));
});

describe("tenant-scoped batch routes", () => {
  it("rejects the whole employee batch when any id is outside the active company", async () => {
    mocks.findEmployees.mockResolvedValue([]);
    const response = await bulkUpdate(new Request("http://local/api/employee/bulk", {
      method: "POST",
      body: JSON.stringify({ updates: [{ id: employeeId, changes: { hashtag: "team-a" } }] }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.refreshSummary).not.toHaveBeenCalled();
  });

  it("commits one transaction and refreshes the read model once for a valid batch", async () => {
    mocks.findEmployees.mockResolvedValue([{ id: employeeId }]);
    mocks.updateEmployee.mockResolvedValue({ id: employeeId });
    const response = await bulkUpdate(new Request("http://local/api/employee/bulk", {
      method: "POST",
      body: JSON.stringify({ updates: [{ id: employeeId, changes: { hashtag: "team-a" } }] }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.updateEmployee).toHaveBeenCalledOnce();
    expect(mocks.refreshSummary).toHaveBeenCalledOnce();
  });

  it("does not read individual payroll settings for an employee outside the company", async () => {
    mocks.findEmployee.mockResolvedValue(null);
    const response = await individualSettings(new Request(`http://local/api/payroll/individual-settings-snapshot?employeeId=${employeeId}`));

    expect(response.status).toBe(404);
    expect(mocks.workTime).not.toHaveBeenCalled();
    expect(mocks.shiftHoliday).not.toHaveBeenCalled();
  });
});
