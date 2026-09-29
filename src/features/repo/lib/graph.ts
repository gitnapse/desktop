import type { RepoDto, TreeNodeDto } from "../../../lib/types";
import { parentPath } from "./tree";

export type GraphKind = "dir" | "file" | "user" | "org" | "repo";

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  kind: GraphKind;
  category: string;
  depth: number;
  childCount: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphLink {
  source: number;
  target: number;
}

export interface RepoGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  total: number;
  truncated: boolean;
  categories: string[];
}

export const DEFAULT_MAX_NODES = 4000;
export const HARD_MAX_NODES = 120000;

/** First path segment, or "root" for entries at the repository root. */
export function graphCategory(path: string): string {
  const slash = path.indexOf("/");
  return slash === -1 ? "root" : path.slice(0, slash);
}

function hashPath(path: string): number {
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function isHub(kind: GraphKind): boolean {
  return kind === "dir" || kind === "user" || kind === "org";
}

function nodeRadius(kind: GraphKind, childCount: number): number {
  switch (kind) {
    case "user":
      return 9;
    case "org":
      return 6.5;
    case "dir":
      return 5 + Math.min(14, Math.sqrt(childCount) * 2.4);
    case "file":
      return 3.4;
    case "repo":
      return 3.2;
  }
}

/**
 * Turns a flat repo tree into a node/link graph. Directories are kept before
 * files when capping, so the backbone of the repository survives truncation.
 */
export function buildRepoGraph(
  tree: readonly TreeNodeDto[],
  max = DEFAULT_MAX_NODES,
): RepoGraph {
  const total = tree.length;
  const ordered = [...tree].sort((a, b) => {
    if (a.is_dir !== b.is_dir) {
      return a.is_dir ? -1 : 1;
    }
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    return a.path.localeCompare(b.path);
  });
  const selected = ordered.slice(0, max);
  const truncated = total > selected.length;

  const childCounts = new Map<string, number>();
  for (const entry of tree) {
    const parent = parentPath(entry.path);
    if (parent) {
      childCounts.set(parent, (childCounts.get(parent) ?? 0) + 1);
    }
  }

  const includedPaths = new Set(selected.map((entry) => entry.path));
  const nodes: GraphNode[] = selected.map((entry) => {
    const kind: GraphKind = entry.is_dir ? "dir" : "file";
    const childCount = childCounts.get(entry.path) ?? 0;
    const seed = hashPath(entry.path);
    const angle = ((seed % 3600) / 3600) * Math.PI * 2;
    const radius = 40 + entry.depth * 34 + (seed % 24);
    return {
      id: entry.path,
      label: entry.name,
      path: entry.path,
      kind,
      category: graphCategory(entry.path),
      depth: entry.depth,
      childCount,
      radius: nodeRadius(kind, childCount),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const indexByPath = new Map<string, number>();
  nodes.forEach((node, position) => indexByPath.set(node.path, position));

  const links: GraphLink[] = [];
  for (const node of nodes) {
    let parent = parentPath(node.path);
    // Walk up until an ancestor made it into the capped graph.
    while (parent && !includedPaths.has(parent)) {
      parent = parentPath(parent);
    }
    if (parent) {
      const source = indexByPath.get(parent);
      const target = indexByPath.get(node.path);
      if (source !== undefined && target !== undefined) {
        links.push({ source, target });
      }
    }
  }

  const categories = [...new Set(nodes.map((node) => node.category))].sort((a, b) =>
    a.localeCompare(b),
  );

  return { nodes, links, total, truncated, categories };
}

export interface ConnectedOrg {
  login: string;
  repos: readonly RepoDto[];
}

export interface UserGraphInput {
  login: string;
  repos: readonly RepoDto[];
  orgs: readonly ConnectedOrg[];
  max?: number;
}

/**
 * Builds a profile graph: the user at the center, their own repositories, and
 * the organizations they are connected to with each org's repositories.
 */
export function buildUserGraph(input: UserGraphInput, max = DEFAULT_MAX_NODES): RepoGraph {
  const nodes: GraphNode[] = [];
  const index = new Map<string, number>();
  const links: GraphLink[] = [];
  let categoryCursor = 0;

  function add(id: string, label: string, kind: GraphKind, category: string, path: string): number {
    const existing = index.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const seed = hashPath(id);
    const angle = ((seed % 3600) / 3600) * Math.PI * 2;
    const radius = 40 + (categoryCursor % 7) * 30 + (seed % 24);
    categoryCursor += 1;
    const position = nodes.length;
    nodes.push({
      id,
      label,
      path,
      kind,
      category,
      depth: 0,
      childCount: 0,
      radius: nodeRadius(kind, 0),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    });
    index.set(id, position);
    return position;
  }

  const userIndex = add(`user:${input.login}`, input.login, "user", "you", input.login);
  const link = (source: number, target: number) => {
    if (source !== target) {
      links.push({ source, target });
    }
  };

  for (const repo of input.repos) {
    link(userIndex, add(`repo:${repo.full_name}`, repo.name, "repo", "repos", repo.full_name));
  }

  for (const org of input.orgs) {
    const category = `org:${org.login}`;
    const orgIndex = add(`org:${org.login}`, org.login, "org", category, org.login);
    link(userIndex, orgIndex);
    for (const repo of org.repos) {
      link(orgIndex, add(`repo:${repo.full_name}`, repo.name, "repo", category, repo.full_name));
    }
  }

  const truncated = nodes.length > max;
  const limited = truncated ? nodes.slice(0, max) : nodes;
  const limit = limited.length;
  const validLinks = links.filter((entry) => entry.source < limit && entry.target < limit);
  const categories = [...new Set(limited.map((node) => node.category))].sort((a, b) =>
    a.localeCompare(b),
  );

  return { nodes: limited, links: validLinks, total: nodes.length, truncated, categories };
}

export interface SimulationParams {
  repulsion: number;
  linkDistance: number;
  linkStrength: number;
  gravity: number;
  damping: number;
  maxVelocity: number;
}

export const defaultSimulation: SimulationParams = {
  repulsion: 1800,
  linkDistance: 46,
  linkStrength: 0.035,
  gravity: 0.016,
  damping: 0.86,
  maxVelocity: 8,
};

const THETA = 0.9;
const SOFTENING = 1;

interface Quad {
  x: number;
  y: number;
  size: number;
  mass: number;
  cx: number;
  cy: number;
  body: number;
  children: Quad[] | null;
}

function buildQuad(
  nodes: readonly GraphNode[],
  indices: readonly number[],
  x: number,
  y: number,
  size: number,
  depth: number,
): Quad {
  let mass = 0;
  let sx = 0;
  let sy = 0;
  for (const index of indices) {
    const node = nodes[index]!;
    mass += 1;
    sx += node.x;
    sy += node.y;
  }
  const quad: Quad = {
    x,
    y,
    size,
    mass,
    cx: mass > 0 ? sx / mass : x,
    cy: mass > 0 ? sy / mass : y,
    body: -1,
    children: null,
  };
  if (indices.length <= 1) {
    quad.body = indices[0] ?? -1;
    return quad;
  }
  if (depth >= 28 || size <= 1e-3) {
    quad.body = -2;
    return quad;
  }
  const half = size / 2;
  const buckets: number[][] = [[], [], [], []];
  for (const index of indices) {
    const node = nodes[index]!;
    const bucket = (node.y >= y + half ? 2 : 0) + (node.x >= x + half ? 1 : 0);
    buckets[bucket]!.push(index);
  }
  quad.children = [
    buildQuad(nodes, buckets[0]!, x, y, half, depth + 1),
    buildQuad(nodes, buckets[1]!, x + half, y, half, depth + 1),
    buildQuad(nodes, buckets[2]!, x, y + half, half, depth + 1),
    buildQuad(nodes, buckets[3]!, x + half, y + half, half, depth + 1),
  ];
  return quad;
}

function buildQuadtree(nodes: readonly GraphNode[]): Quad {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }
  const size = Math.max(maxX - minX, maxY - minY, 1);
  const indices = nodes.map((_, index) => index);
  return buildQuad(nodes, indices, minX, minY, size, 0);
}

/** Barnes-Hut repulsion: O(n log n) instead of all pairs. */
function applyRepulsion(
  nodes: GraphNode[],
  tree: Quad,
  repulsion: number,
): void {
  const thetaSq = THETA * THETA;
  const stack: Quad[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    stack.length = 0;
    stack.push(tree);
    while (stack.length > 0) {
      const quad = stack.pop()!;
      if (quad.mass === 0) {
        continue;
      }
      if (quad.children === null) {
        if (quad.body === index || quad.body === -2) {
          // Aggregate leaf with coincident bodies: mass only, no exact pair.
          if (quad.body === -2) {
            applyMass(node, quad, repulsion);
          }
          continue;
        }
        applyMass(node, quad, repulsion);
        continue;
      }
      const dx = quad.cx - node.x;
      const dy = quad.cy - node.y;
      const distanceSq = dx * dx + dy * dy;
      if (quad.size * quad.size < thetaSq * distanceSq) {
        applyMass(node, quad, repulsion);
      } else {
        for (const child of quad.children) {
          stack.push(child);
        }
      }
    }
  }
}

function applyMass(node: GraphNode, quad: Quad, repulsion: number): void {
  const dx = node.x - quad.cx;
  const dy = node.y - quad.cy;
  const distanceSq = dx * dx + dy * dy + SOFTENING;
  const distance = Math.sqrt(distanceSq);
  const force = (repulsion * quad.mass) / distanceSq;
  node.vx += (dx / distance) * force;
  node.vy += (dy / distance) * force;
}

/**
 * One force-directed integration step: Barnes-Hut repulsion, spring links and a
 * gentle pull to the origin. Mutates node positions/velocities in place and
 * returns the total kinetic energy (used to stop once the graph settles).
 */
export function stepSimulation(
  nodes: GraphNode[],
  links: readonly GraphLink[],
  params: SimulationParams = defaultSimulation,
): number {
  const count = nodes.length;
  if (count === 0) {
    return 0;
  }

  applyRepulsion(nodes, buildQuadtree(nodes), params.repulsion);

  for (const link of links) {
    const a = nodes[link.source];
    const b = nodes[link.target];
    if (!a || !b) {
      continue;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const displacement = (distance - params.linkDistance) * params.linkStrength;
    const fx = (dx / distance) * displacement;
    const fy = (dy / distance) * displacement;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  let energy = 0;
  for (const node of nodes) {
    node.vx -= node.x * params.gravity;
    node.vy -= node.y * params.gravity;
    node.vx *= params.damping;
    node.vy *= params.damping;
    const speed = Math.hypot(node.vx, node.vy);
    if (speed > params.maxVelocity) {
      node.vx = (node.vx / speed) * params.maxVelocity;
      node.vy = (node.vy / speed) * params.maxVelocity;
    }
    node.x += node.vx;
    node.y += node.vy;
    energy += node.vx * node.vx + node.vy * node.vy;
  }
  return energy;
}
