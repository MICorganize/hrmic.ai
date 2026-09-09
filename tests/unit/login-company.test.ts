import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateWithCredentials } from "@/app/actions/authenticate";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), setCookie: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.setCookie }) }));
vi.mock("@/lib/active-company", () => ({ ACTIVE_COMPANY_COOKIE: "hrmic_active_company" }));

const micId = "11111111-1111-4111-8111-111111111111";
const input = { email: "user@example.test", password: "test-password", companyId: micId, kind: "employee" as const };
beforeEach(() => { vi.clearAllMocks(); });

describe("login company hand-off", () => {
  it("replaces an earlier company cookie with authorized MIC before reporting success", async () => {
    mocks.signIn.mockResolvedValue("/dashboard");
    expect(await authenticateWithCredentials(input)).toEqual({ ok: true });
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ companyId: micId }));
    expect(mocks.setCookie).toHaveBeenCalledWith("hrmic_active_company", micId,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 43200 }));
  });
  it("does not commit a company when authentication/access is rejected", async () => {
    mocks.signIn.mockResolvedValue("/login?error=CredentialsSignin");
    expect((await authenticateWithCredentials(input)).ok).toBe(false);
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });
  it("expires the previous selection on a successful company-management login", async () => {
    mocks.signIn.mockResolvedValue("/organization/companies");
    expect((await authenticateWithCredentials({ ...input, kind: "company-management" })).ok).toBe(true);
    expect(mocks.setCookie).toHaveBeenCalledWith("hrmic_active_company", "", expect.objectContaining({ maxAge: 0 }));
  });
});
