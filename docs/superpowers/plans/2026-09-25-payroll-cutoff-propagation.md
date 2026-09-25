# Payroll Cutoff Setting Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist the company payroll cutoff setting and make every payroll period consumer use the saved value consistently after the user confirms the existing save dialog.

**Architecture:** Store the cutoff day on the active `Company` record and expose it through a company-scoped settings API. Keep a pure date-mapping helper for default periods, then make payroll period, dashboard, personal payroll, and work-time code use the same server-side resolution rule: an explicitly configured monthly `PayrollRun` wins; otherwise the company cutoff determines the period. The existing settings page and payroll UI markup remain unchanged; only loading, saving, and data-fetch behavior changes.

**Tech Stack:** Next.js 16.3.0 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, Vitest, Testing Library, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-25-payroll-cutoff-propagation-design.md`

## Global Constraints

- Change only behavior/data flow; do not change Layout, UI structure, class names, colors, copy, or control placement.
- `1` means day 1 through the selected month’s last day; `2..16` means day N through day N-1 of the following month.
- An explicit monthly `PayrollRun.periodStart/periodEnd` overrides the company default.
- Settings are company-scoped and must never be read from localStorage as the source of truth.
- The existing save dialog opens on “บันทึก”; the PUT occurs only after “ยืนยัน”.
- Preserve unrelated working-tree changes.

## Review Focus

- Leap-year February with cutoff `16` produces a valid inclusive end date in the next month.
- Cutoff `1` uses EOM and does not accidentally become a one-month-later day-1 period.
- Invalid settings values, missing active company, and API failures leave the selected form value intact and do not report a false save.
- A manually configured monthly `PayrollRun` remains unchanged after the company default changes.
- Dashboard SQL, personal payroll, work-time, and period API all resolve the same default boundaries for the same company/month.

### Task 1: Add the persisted company setting and pure period mapping

**Files:**
- Modify: `prisma/schema.prisma` — add `Company.payrollCutoffDay Int @default(1)`.
- Create: `prisma/migrations/20260925100000_add_company_payroll_cutoff_day/migration.sql` — add the non-null column with default `1`.
- Create: `lib/payroll/period-default.ts` — pure validation and default period mapping.
- Create: `tests/unit/payroll-period-default.test.ts` — mapping and validation tests.

**Interfaces:**
- Produces `normalizePayrollCutoffDay(value: unknown): number | null`.
- Produces `getDefaultPayrollPeriod(monthKey: string, cutoffDay: number): { startDate: string; endDate: string }` with inclusive ISO date strings.
- Produces `getDefaultPayrollBounds(monthKey: string, cutoffDay: number): { start: Date; end: Date }`, where `end` is the exclusive UTC date boundary used by attendance/leave queries.

- [ ] **Step 1: Write the failing tests**

Add tests that assert:

```ts
expect(getDefaultPayrollPeriod("2026-08", 1)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
expect(getDefaultPayrollPeriod("2026-08", 8)).toEqual({ startDate: "2026-08-08", endDate: "2026-09-07" });
expect(getDefaultPayrollPeriod("2026-08", 16)).toEqual({ startDate: "2026-08-16", endDate: "2026-09-15" });
expect(getDefaultPayrollPeriod("2024-02", 16)).toEqual({ startDate: "2024-02-16", endDate: "2024-03-15" });
expect(normalizePayrollCutoffDay(0)).toBeNull();
expect(normalizePayrollCutoffDay(17)).toBeNull();
expect(normalizePayrollCutoffDay("8")).toBe(8);
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npx vitest run tests/unit/payroll-period-default.test.ts --reporter=verbose`

Expected: FAIL because `lib/payroll/period-default.ts` does not exist yet.

- [ ] **Step 3: Implement the minimal pure helper**

Use UTC date construction and explicit month rollover. For cutoff `1`, return the first and last day of the selected month. For cutoff `N > 1`, return day `N` of the selected month and day `N-1` of the next month. Reject non-integer values outside `1..16`.

- [ ] **Step 4: Add the Prisma field and migration**

Add the field to `Company` and create the migration SQL:

```sql
ALTER TABLE "Company"
ADD COLUMN "payrollCutoffDay" INTEGER NOT NULL DEFAULT 1;
```

Run `npm run db:generate` so the generated Prisma client exposes the field. Do not run a destructive reset or overwrite unrelated schema changes.

- [ ] **Step 5: Run the focused test and typecheck**

Run: `npx vitest run tests/unit/payroll-period-default.test.ts --reporter=verbose`

Expected: all period mapping and validation tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

### Task 2: Add company-scoped settings API and connect the existing save flow

**Files:**
- Create: `app/api/settings/general/route.ts` — GET/PUT active-company payroll cutoff setting.
- Modify: `app/(portal)/settings/setting-general/page.tsx` — load the saved value and PUT only after the existing dialog is confirmed; do not change rendered markup or styling.
- Modify: `tests/unit/general-settings.test.tsx` — cover loading, confirm-save payload, failure retention, and existing UI behavior.
- Create: `tests/unit/general-settings-api.test.ts` — validate route input and company scoping using the repository’s existing route-test patterns.

**Interfaces:**
- `GET /api/settings/general` returns `{ payrollCutoffDay: number }`.
- `PUT /api/settings/general` accepts `{ payrollCutoffDay: number }` and returns `{ payrollCutoffDay: number }`.
- Invalid input returns HTTP 400; no active company returns HTTP 403.
- The page keeps the selected option in React state, sends the selected numeric day only after clicking “ยืนยัน”, and leaves the dialog open/form value unchanged when the request fails.

- [ ] **Step 1: Write failing API tests**

Cover these cases:

```ts
await PUT(requestWithJson({ payrollCutoffDay: 8 }));
expect(prisma.company.update).toHaveBeenCalledWith(expect.objectContaining({ data: { payrollCutoffDay: 8 } }));
expect(response.status).toBe(200);

expect((await PUT(requestWithJson({ payrollCutoffDay: 17 }))).status).toBe(400);
expect((await GET()).status).toBe(403); // no active company
```

Use the same Prisma/active-company mocking conventions as existing API unit tests; do not call a live database.

- [ ] **Step 2: Run API tests to verify they fail for the missing route**

Run: `npx vitest run tests/unit/general-settings-api.test.ts --reporter=verbose`

Expected: FAIL because the route module and persistence behavior do not exist.

- [ ] **Step 3: Implement the route**

Resolve `getActiveCompany()`, validate with `normalizePayrollCutoffDay`, read/update only the active company, and call `invalidateReadModel("payroll-dashboard", company.id)` after a successful update. Return the same Thai error style used by neighboring payroll routes.

- [ ] **Step 4: Write failing page behavior tests**

Extend `tests/unit/general-settings.test.tsx` so the component receives mocked GET/PUT responses and asserts:

```ts
fireEvent.click(screen.getByRole("option", { name: "ตั้งแต่วันที่ 8 จนถึงวันที่ 7" }));
fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
expect(fetch).toHaveBeenCalledWith("/api/settings/general", expect.objectContaining({ method: "PUT", body: JSON.stringify({ payrollCutoffDay: 8 }) }));
```

Also assert that a rejected PUT leaves the existing dialog open and does not change the selected option.

- [ ] **Step 5: Run the page tests to verify the new assertions fail**

Run: `npx vitest run tests/unit/general-settings.test.tsx --reporter=verbose`

Expected: FAIL because the page currently initializes locally and the confirm handler does not call the settings API.

- [ ] **Step 6: Implement page data flow without changing UI**

Add only effects/handlers/state needed to GET the saved cutoff and PUT the pending value. Keep the existing `PayPeriodDropdown`, Dialog JSX, text, class names, and button labels unchanged. Use the existing default `eom` while the initial GET is pending, and keep the form selection when GET/PUT fails.

- [ ] **Step 7: Run focused tests and typecheck**

Run: `npx vitest run tests/unit/general-settings.test.tsx tests/unit/general-settings-api.test.ts --reporter=verbose`

Expected: all settings UI/API tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

### Task 3: Centralize default period resolution for every payroll consumer

**Files:**
- Create: `lib/payroll/resolved-period.ts` — server-only resolver that gives explicit monthly period precedence over the company cutoff default.
- Modify: `app/api/payroll/period/route.ts` — use the resolver for GET fallback.
- Modify: `lib/payroll/dashboard.ts` — derive SQL fallback dates from the active company cutoff.
- Modify: `app/api/payroll/personal/route.ts` — use the resolver/bounds for attendance and leave queries.
- Modify: `app/api/payroll/work-time/route.ts` — use the resolver/bounds for work-time queries.
- Create: `tests/unit/payroll-resolved-period.test.ts` — explicit override and company default tests.
- Modify: existing payroll route tests as needed to pin shared behavior.

**Interfaces:**
- `getResolvedPayrollPeriod(monthKey: string, companyId: string): Promise<{ startDate: string; endDate: string; isConfigured: boolean }>`.
- `getResolvedPayrollBounds(monthKey: string, companyId: string): Promise<{ start: Date; end: Date }>` where `end` is exclusive.
- Explicit `PayrollRun` dates are returned unchanged; missing dates use `Company.payrollCutoffDay` and the pure helper from Task 1.

- [ ] **Step 1: Write failing resolver tests**

Mock Prisma reads and assert:

```ts
expect(await getResolvedPayrollPeriod("2026-08", "company-a")).toEqual({
  startDate: "2026-08-08",
  endDate: "2026-09-07",
  isConfigured: false,
});
```

Then provide a `PayrollRun` with `periodStart/periodEnd` and assert those dates win even when the company cutoff is `16`.

- [ ] **Step 2: Run resolver tests to verify the expected failure**

Run: `npx vitest run tests/unit/payroll-resolved-period.test.ts --reporter=verbose`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the server resolver**

Read the company cutoff and company-namespaced `PayrollRun` in one server helper. Convert inclusive database `periodEnd` to the exclusive boundary only in the bounds function. Keep date-only UTC semantics used by current queries.

- [ ] **Step 4: Update all period consumers**

Replace each duplicated fallback of `month day 1 through month end` with the resolver or with the same cutoff-derived default passed into the dashboard SQL. Preserve existing response shapes, route paths, query parameters, and UI-facing formatting.

- [ ] **Step 5: Add cross-consumer regression assertions**

For cutoff `8` and month `2026-08`, assert the period API, personal payroll bounds, work-time bounds, and dashboard period all represent `2026-08-08` through `2026-09-07`. Assert an explicitly configured monthly run still returns its own dates.

- [ ] **Step 6: Run focused payroll tests**

Run: `npx vitest run tests/unit/payroll-period-default.test.ts tests/unit/payroll-resolved-period.test.ts tests/unit/tenant-scoped-batch-routes.test.ts --reporter=verbose`

Expected: all focused tests pass.

### Task 4: Verify client refresh behavior without UI changes

**Files:**
- Modify: `app/(portal)/salary/calculate/normal/PayrollCalculationClient.tsx` — ensure period reload effects consume the server’s updated period response when the page is mounted or the month changes.
- Modify: `app/(portal)/salary/calculate/normal/PayrollDashboardShellClient.tsx` only if a data refresh signal is required; keep rendered JSX unchanged.
- Create/modify: `tests/unit/payroll-client-period-refresh.test.tsx` only if an existing test harness can exercise the reload signal without browser-only layout assumptions.

**Interfaces:**
- No new visible controls or layout changes.
- Existing `/api/payroll/period` fetches remain the source of displayed period values.
- If a same-window settings update signal is needed, it is an internal event only; it must not replace the database/API as the source of truth.

- [ ] **Step 1: Reproduce the stale-client behavior in a focused test**

Mount the existing payroll client with a mocked period response, update the server response after a settings save signal, and assert the rendered period text changes without changing the component’s existing markup contract.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tests/unit/payroll-client-period-refresh.test.tsx --reporter=verbose`

Expected: FAIL only if the current client does not react to the settings update signal; if the existing fetch lifecycle already covers the requirement, record the passing test and make no unnecessary client change.

- [ ] **Step 3: Implement the smallest behavior-only refresh**

Reuse the existing fetch/abort pattern. Do not change labels, visual structure, CSS classes, or component dimensions.

- [ ] **Step 4: Run focused client tests**

Run: `npx vitest run tests/unit/payroll-client-period-refresh.test.tsx --reporter=verbose`

Expected: PASS, or no file added when the existing lifecycle test proves no change is needed.

### Task 5: Full verification and handoff

**Files:**
- Verify: all files changed by Tasks 1–4.
- Verify: `git diff --check` and working-tree scope.

- [ ] **Step 1: Run the complete test suite**

Run: `npm run test:run`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run typecheck and scoped lint**

Run: `npm run typecheck`

Run: `npx eslint -- "app/(portal)/settings/setting-general/page.tsx" "app/api/settings/general/route.ts" "lib/payroll/period-default.ts" "lib/payroll/resolved-period.ts" "lib/payroll/dashboard.ts" "app/api/payroll/period/route.ts" "app/api/payroll/personal/route.ts" "app/api/payroll/work-time/route.ts" "app/(portal)/salary/calculate/normal/PayrollCalculationClient.tsx" tests/unit/payroll-period-default.test.ts tests/unit/payroll-resolved-period.test.ts tests/unit/general-settings.test.tsx tests/unit/general-settings-api.test.ts

Expected: exit code 0 for typecheck and no errors from scoped lint. Report unrelated pre-existing full-project lint errors separately if they remain.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0. An existing environment warning about disabled Redis is not a failure unless the build exits non-zero.

- [ ] **Step 4: Check diff and verify UI files only contain behavior changes**

Run: `git diff --check` and inspect the diff for `setting-general/page.tsx` and payroll client files. Confirm no class names, visible text, element hierarchy, or layout dimensions changed.

- [ ] **Step 5: Report the result**

Summarize the persisted company setting, consumers updated, tests/build evidence, the spec/plan links, and any unrelated pre-existing worktree changes left untouched.
