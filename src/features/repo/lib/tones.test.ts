import { describe, expect, it } from "vitest";
import {
  checkLabel,
  checkTone,
  fileKindTone,
  issueTone,
  pullLabel,
  pullTone,
  reviewTone,
  statusTone,
} from "./tones";

describe("statusTone", () => {
  it("maps status and conclusion values", () => {
    expect(statusTone("open")).toBe("ok");
    expect(statusTone("success")).toBe("ok");
    expect(statusTone("completed")).toBe("ok");
    expect(statusTone("in_progress")).toBe("warn");
    expect(statusTone("queued")).toBe("warn");
    expect(statusTone("closed")).toBe("err");
    expect(statusTone("failure")).toBe("err");
    expect(statusTone("timed_out")).toBe("err");
    expect(statusTone("merged")).toBe("info");
    expect(statusTone(null)).toBe("muted");
    expect(statusTone("unknown")).toBe("muted");
  });
});

describe("check helpers", () => {
  it("uses the conclusion once completed", () => {
    expect(checkTone("completed", "success")).toBe("ok");
    expect(checkTone("completed", "failure")).toBe("err");
    expect(checkTone("in_progress", null)).toBe("warn");
    expect(checkLabel("completed", "action_required")).toBe("action required");
    expect(checkLabel("queued", null)).toBe("queued");
  });
});

describe("issue and pull tones", () => {
  it("encodes state as status", () => {
    expect(issueTone("open")).toBe("ok");
    expect(issueTone("closed")).toBe("err");
    expect(pullTone({ state: "open", merged: false })).toBe("ok");
    expect(pullTone({ state: "open", merged: null })).toBe("ok");
    expect(pullTone({ state: "closed", merged: true })).toBe("info");
    expect(pullTone({ state: "closed", merged: false })).toBe("err");
    expect(pullLabel({ state: "open", merged: false })).toBe("open");
    expect(pullLabel({ state: "closed", merged: true })).toBe("merged");
    expect(pullLabel({ state: "closed", merged: null })).toBe("closed");
  });

  it("maps review and file kinds", () => {
    expect(reviewTone("APPROVED")).toBe("ok");
    expect(reviewTone("CHANGES_REQUESTED")).toBe("err");
    expect(reviewTone("COMMENTED")).toBe("warn");
    expect(fileKindTone("added")).toBe("ok");
    expect(fileKindTone("removed")).toBe("err");
    expect(fileKindTone("renamed")).toBe("info");
    expect(fileKindTone("modified")).toBe("warn");
  });
});
