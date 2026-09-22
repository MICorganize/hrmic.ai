import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmployeeSelectPanel, type OrgNode } from "@/components/employee/EmployeeSelectPanel";

afterEach(cleanup);

describe("EmployeeSelectPanel", () => {
  it("starts the visible tree below the company and branch levels", () => {
    const orgTree: OrgNode[] = [{
      id: "company-1",
      code: "PECTH",
      name: "MIC ORGANIZE CO., LTD.",
      kind: "company",
      count: 38,
      children: [{
        id: "branch-1",
        code: "B01",
        name: "PANASONIC ENERGY (PECTH)",
        kind: "branch",
        count: 38,
        children: [{
          id: "department-1",
          code: "D01",
          name: "ฝ่ายทรัพยากรบุคคล",
          kind: "department",
          count: 1,
          children: [{
            id: "employee-1",
            code: "E001",
            name: "พนักงานทดสอบ",
            kind: "employee",
            status: "active",
          }],
        }],
      }],
    }];

    render(<EmployeeSelectPanel orgTree={orgTree} onClose={vi.fn()} />);

    expect(screen.queryByText(/PECTH: MIC ORGANIZE CO\., LTD\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/B01: PANASONIC ENERGY \(PECTH\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/ฝ่ายทรัพยากรบุคคล/)).toBeVisible();
    expect(screen.queryByText(/D01: ฝ่ายทรัพยากรบุคคล/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /E001: พนักงานทดสอบ/ })).toBeVisible();
  });
});
