import { describe, expect, it } from "vitest";
import type { RepoDto, TreeNodeDto } from "../../../lib/types";
import {
  buildRepoGraph,
  buildUserGraph,
  graphCategory,
  stepSimulation,
  type GraphNode,
} from "./graph";

function node(path: string, is_dir: boolean, depth: number): TreeNodeDto {
  return { path, name: path.split("/").pop() ?? path, depth, is_dir };
}

const tree: TreeNodeDto[] = [
  node("README.md", false, 0),
  node("src", true, 0),
  node("src/main.rs", false, 1),
  node("src/lib.rs", false, 1),
  node("src/ui", true, 1),
  node("src/ui/button.ts", false, 2),
  node("docs", true, 0),
  node("docs/guide.md", false, 1),
];

function graphNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    label: id,
    path: id,
    kind: "file",
    category: "root",
    depth: 0,
    childCount: 0,
    radius: 3,
    x,
    y,
    vx: 0,
    vy: 0,
  };
}

describe("graphCategory", () => {
  it("uses the first path segment, or root", () => {
    expect(graphCategory("src/ui/button.ts")).toBe("src");
    expect(graphCategory("README.md")).toBe("root");
  });
});

describe("buildRepoGraph", () => {
  it("creates a node per entry and a link per non-root entry", () => {
    const graph = buildRepoGraph(tree);
    expect(graph.nodes).toHaveLength(tree.length);
    expect(graph.links).toHaveLength(5);
    expect(graph.categories).toEqual(["docs", "root", "src"]);
  });

  it("links children to their directory", () => {
    const graph = buildRepoGraph(tree);
    const index = new Map(graph.nodes.map((entry, i) => [entry.path, i]));
    const source = index.get("src")!;
    const target = index.get("src/main.rs")!;
    expect(graph.links).toContainEqual({ source, target });
  });

  it("keeps directories and flags truncation when capped", () => {
    const graph = buildRepoGraph(tree, 3);
    expect(graph.truncated).toBe(true);
    expect(graph.total).toBe(tree.length);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.every((entry) => entry.kind === "dir")).toBe(true);
  });

  it("only links nodes that are in the capped graph", () => {
    const graph = buildRepoGraph(tree, 4);
    for (const link of graph.links) {
      expect(graph.nodes[link.source]).toBeDefined();
      expect(graph.nodes[link.target]).toBeDefined();
    }
  });
});

describe("stepSimulation", () => {
  it("pulls linked nodes toward the link distance", () => {
    const nodes = [graphNode("a", 0, 0), graphNode("b", 200, 0)];
    const links = [{ source: 0, target: 1 }];
    const params = {
      repulsion: 0,
      linkDistance: 40,
      linkStrength: 0.1,
      gravity: 0,
      damping: 0.8,
      maxVelocity: 50,
    };
    for (let i = 0; i < 300; i += 1) {
      stepSimulation(nodes, links, params);
    }
    const distance = Math.hypot(nodes[0]!.x - nodes[1]!.x, nodes[0]!.y - nodes[1]!.y);
    expect(distance).toBeLessThan(200);
    expect(distance).toBeGreaterThan(0);
    expect(Number.isFinite(distance)).toBe(true);
  });

  it("returns zero energy for an empty graph", () => {
    expect(stepSimulation([], [])).toBe(0);
  });

  it("stays finite with thousands of nodes (Barnes-Hut)", () => {
    const big: TreeNodeDto[] = [];
    for (let dir = 0; dir < 40; dir += 1) {
      big.push(node(`dir${dir}`, true, 0));
    }
    for (let i = 0; i < 1200; i += 1) {
      big.push(node(`dir${i % 40}/file${i}.ts`, false, 1));
    }
    const graph = buildRepoGraph(big, 5000);
    expect(graph.nodes.length).toBe(big.length);
    let energy = Infinity;
    for (let step = 0; step < 5; step += 1) {
      energy = stepSimulation(graph.nodes, graph.links);
    }
    expect(Number.isFinite(energy)).toBe(true);
    for (const entry of graph.nodes) {
      expect(Number.isFinite(entry.x)).toBe(true);
      expect(Number.isFinite(entry.y)).toBe(true);
    }
  });
});

function repoDto(fullName: string): RepoDto {
  const [owner = "", name = ""] = fullName.split("/");
  return {
    full_name: fullName,
    name,
    owner,
    description: null,
    stargazers_count: 0,
    language: null,
    default_branch: "main",
    clone_url: `https://github.com/${fullName}.git`,
    html_url: `https://github.com/${fullName}`,
    forks_count: null,
    open_issues_count: null,
    watchers_count: null,
    private: null,
    topics: null,
    updated_at: null,
    pushed_at: null,
    owner_avatar_url: null,
  };
}

describe("buildUserGraph", () => {
  it("connects the user to repos and orgs, and orgs to their repos", () => {
    const graph = buildUserGraph({
      login: "octocat",
      repos: [repoDto("octocat/hello"), repoDto("octocat/world")],
      orgs: [{ login: "acme", repos: [repoDto("acme/tool")] }],
    });
    expect(graph.nodes.map((entry) => entry.kind).sort()).toEqual([
      "org",
      "repo",
      "repo",
      "repo",
      "user",
    ]);
    expect(graph.categories).toContain("you");
    expect(graph.categories).toContain("org:acme");

    const index = new Map(graph.nodes.map((entry, position) => [entry.id, position]));
    const user = index.get("user:octocat")!;
    const org = index.get("org:acme")!;
    const tool = index.get("repo:acme/tool")!;
    expect(graph.links).toContainEqual({ source: user, target: org });
    expect(graph.links).toContainEqual({ source: org, target: tool });
  });
});
