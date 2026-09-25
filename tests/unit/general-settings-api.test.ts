import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCompany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  invalidateReadModel: vi.fn(),
}));

vi.mock("@/lib/active-company", () => ({ getActiveCompany: mocks.getActiveCompany }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/cache/read-model-version", () => ({ invalidateReadModel: mocks.invalidateReadModel }));

import { GET, PUT } from "@/app/api/settings/general/route";

const company = { id: "11111111-1111-4111-8111-111111111111", name: "MIC", code: "MIC", employeeLimit: 100 };

function requestWithJson(body: unknown) {
  return new Request("http://local/api/settings/general", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getActiveCompany.mockResolvedValue(company);
  mocks.findUnique.mockResolvedValue({ payrollCutoffDay: 1 });
  mocks.update.mockResolvedValue({ payrollCutoffDay: 8 });
});

describe("general payroll settings API", () => {
  it("loads the active company cutoff setting", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payrollCutoffDay: 1 });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: company.id },
      select: { payrollCutoffDay: true },
    });
  });

  it("saves a supported cutoff and invalidates the payroll dashboard", async () => {
    const response = await PUT(requestWithJson({ payrollCutoffDay: 8 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payrollCutoffDay: 8 });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: company.id },
      data: { payrollCutoffDay: 8 },
      select: { payrollCutoffDay: true },
    });
    expect(mocks.invalidateReadModel).toHaveBeenCalledWith("payroll-dashboard", company.id);
  });

  it("rejects unsupported cutoff values before touching the company", async () => {
    const response = await PUT(requestWithJson({ payrollCutoffDay: 17 }));

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires an active company", async () => {
    mocks.getActiveCompany.mockResolvedValue(null);

    expect((await GET()).status).toBe(403);
    expect((await PUT(requestWithJson({ payrollCutoffDay: 8 }))).status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
