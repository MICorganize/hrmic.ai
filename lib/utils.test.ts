import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and filters falsy values", () => {
    expect(cn("a", "b", false && "c", null, undefined, "d")).toBe("a b d");
  });

  it("merges conflicting Tailwind classes (last one wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
