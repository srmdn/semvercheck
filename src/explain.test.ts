import { describe, it, expect } from "bun:test";
import { explainRange } from "./explain";

describe("explainRange", () => {
  it("marks invalid semver ranges as invalid", () => {
    const result = explainRange("not-a-range");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("handles wildcard *", () => {
    const result = explainRange("*");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Wildcard");
    expect(result.summary).toContain("any version");
  });

  it("handles empty string as wildcard", () => {
    const result = explainRange("");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Wildcard");
  });

  it("handles caret range ^1.2.3", () => {
    const result = explainRange("^1.2.3");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Caret");
    expect(result.summary).toContain("1.2.3");
    expect(result.summary).toContain("2.0.0");
    // samples should include matching and non-matching versions
    const matching = result.samples.filter((s) => s.matches);
    expect(matching.length).toBeGreaterThan(0);
  });

  it("caret on 0.x only allows patch updates", () => {
    const result = explainRange("^0.2.0");
    expect(result.valid).toBe(true);
    expect(result.summary).toContain("patch updates");
  });

  it("handles tilde range ~1.2.3", () => {
    const result = explainRange("~1.2.3");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Tilde");
    expect(result.summary).toContain("Patch");
  });

  it("handles exact version 1.2.3", () => {
    const result = explainRange("1.2.3");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Exact");
    expect(result.summary).toContain("Pinned");
    const matching = result.samples.filter((s) => s.matches);
    expect(matching).toHaveLength(1);
    expect(matching[0].version).toBe("1.2.3");
  });

  it("handles >= range", () => {
    const result = explainRange(">=2.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain(">=");
    expect(result.summary).toContain("No upper bound");
  });

  it("handles > range", () => {
    const result = explainRange(">1.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain(">");
    expect(result.summary).toContain("excluded");
  });

  it("handles <= range", () => {
    const result = explainRange("<=3.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("<=");
  });

  it("handles < range", () => {
    const result = explainRange("<2.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("<");
    expect(result.summary).toContain("excluded");
  });

  it("handles hyphen range 1.0.0 - 2.0.0", () => {
    const result = explainRange("1.0.0 - 2.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Hyphen");
    expect(result.summary).toContain("Inclusive");
  });

  it("handles union range with ||", () => {
    const result = explainRange("1.0.0 || 2.0.0");
    expect(result.valid).toBe(true);
    expect(result.operatorLabel).toContain("Union");
  });

  it("generates sample versions", () => {
    const result = explainRange("^1.2.0");
    expect(result.valid).toBe(true);
    expect(result.samples.length).toBeGreaterThan(0);
    for (const s of result.samples) {
      expect(s.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof s.matches).toBe("boolean");
    }
  });

  it("exact pin has no non-matching samples from the pinned version", () => {
    const result = explainRange("1.5.0");
    expect(result.valid).toBe(true);
    const match = result.samples.find((s) => s.version === "1.5.0");
    expect(match?.matches).toBe(true);
  });
});
