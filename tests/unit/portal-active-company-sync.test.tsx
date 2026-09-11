import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  getLatestPortalActiveCompany,
  PortalActiveCompanySync,
  resetPortalActiveCompany,
  selectPortalActiveCompany,
} from "@/components/layouts/PortalActiveCompanySync";
import type { ActiveCompany } from "@/lib/active-company";

const mic: ActiveCompany = {
  id: "mic",
  code: "MIC",
  name: "MIC ORGANIZE CO., LTD.",
  employeeLimit: 500,
};
const psth: ActiveCompany = {
  id: "psth-lighting",
  code: "PSTH_LIGHTING",
  name: "PSTH LIGHTING CO., LTD.",
  employeeLimit: 500,
};

afterEach(() => {
  cleanup();
  resetPortalActiveCompany();
});

describe("portal active-company synchronization", () => {
  it("does not let an old streamed company overwrite a newer browser selection", async () => {
    let resolveServerCompany!: (company: ActiveCompany) => void;
    const serverCompany = new Promise<ActiveCompany>((resolve) => {
      resolveServerCompany = resolve;
    });
    render(<PortalActiveCompanySync company={serverCompany} />);

    act(() => selectPortalActiveCompany(mic));
    await act(async () => resolveServerCompany(psth));

    expect(getLatestPortalActiveCompany()).toEqual(mic);
  });

  it("accepts the fresh server snapshot started after a browser selection", async () => {
    act(() => selectPortalActiveCompany(mic));
    render(<PortalActiveCompanySync company={Promise.resolve(psth)} />);

    await act(async () => {});

    expect(getLatestPortalActiveCompany()).toEqual(psth);
  });
});
