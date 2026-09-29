import { describe, expect, it } from "vitest";
import {
  buildRepoQuery,
  mergeRepoQuery,
  parseIssueState,
  parseNumberParam,
  parsePullState,
  parsePullView,
  parseRefParam,
  refOnlySearch,
} from "./query";

describe("parse helpers", () => {
  it("defaults issue and pull state filters", () => {
    expect(parseIssueState(null)).toBe("open");
    expect(parseIssueState("closed")).toBe("closed");
    expect(parseIssueState("all")).toBe("all");
    expect(parseIssueState("bogus")).toBe("open");
    expect(parsePullState("closed")).toBe("closed");
    expect(parsePullState("nope")).toBe("open");
  });

  it("parses pull views", () => {
    expect(parsePullView(null)).toBe("conversation");
    expect(parsePullView("files")).toBe("files");
    expect(parsePullView("commits")).toBe("commits");
    expect(parsePullView("reviews")).toBe("reviews");
    expect(parsePullView("other")).toBe("conversation");
  });

  it("parses positive integers and refs", () => {
    expect(parseNumberParam("142")).toBe(142);
    expect(parseNumberParam("0")).toBeNull();
    expect(parseNumberParam("-3")).toBeNull();
    expect(parseNumberParam("abc")).toBeNull();
    expect(parseNumberParam(null)).toBeNull();
    expect(parseRefParam(" main ")).toBe("main");
    expect(parseRefParam("   ")).toBeNull();
  });
});

describe("buildRepoQuery", () => {
  it("encodes only provided values", () => {
    expect(buildRepoQuery({})).toBe("");
    expect(buildRepoQuery({ ref: "main", path: "src/app.ts" })).toBe(
      "?ref=main&path=src%2Fapp.ts",
    );
    expect(buildRepoQuery({ number: 142, view: "files" })).toBe("?number=142&view=files");
    expect(buildRepoQuery({ isNew: true })).toBe("?new=1");
    expect(buildRepoQuery({ isNew: false })).toBe("");
  });
});

describe("mergeRepoQuery", () => {
  it("updates, preserves and removes keys", () => {
    const current = new URLSearchParams("ref=main&number=12");
    const next = mergeRepoQuery(current, { number: null, state: "all", ref: null, view: "commits" });
    expect(next.toString()).toBe("state=all&view=commits");
    expect(current.toString()).toBe("ref=main&number=12");
  });

  it("leaves untouched keys alone", () => {
    const next = mergeRepoQuery(new URLSearchParams("ref=dev"), { path: "a.ts" });
    expect(next.get("ref")).toBe("dev");
    expect(next.get("path")).toBe("a.ts");
  });
});

describe("refOnlySearch", () => {
  it("keeps only the ref parameter for tab navigation", () => {
    expect(refOnlySearch(new URLSearchParams("ref=main&number=3"))).toBe("?ref=main");
    expect(refOnlySearch(new URLSearchParams("number=3"))).toBe("");
    expect(refOnlySearch(new URLSearchParams("ref=a%2Fb"))).toBe("?ref=a%2Fb");
  });
});
