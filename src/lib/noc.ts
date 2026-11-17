/**
 * NOC dependency graph (RENCANA Phase 5). Pure functions, no DOM.
 *
 * A node `dependsOn` the nodes it needs. A node is **down** when it is in the down set. A
 * node is **affected** when it is down or any ancestor is down (a check on it fails either
 * way). A down node **alarms** only when none of its ancestors is down: it is the root
 * cause. Every other affected node is **suppressed**.
 */

export interface GraphNode {
  id: string;
  dependsOn: readonly string[];
}

export interface Graph<N extends GraphNode = GraphNode> {
  nodes: readonly N[];
}

export interface AlarmResult {
  /** ids of down nodes with no down ancestor, in graph order */
  alarms: string[];
  /** ids of affected nodes that are not a root cause, in graph order */
  suppressed: string[];
}

/**
 * Check a graph and return it. Throws on an empty graph, an empty or duplicate id, a
 * dependency on an unknown node, a node that depends on itself, or any cycle. Call it
 * once, when the graph is loaded.
 */
export function parseGraph<N extends GraphNode>(raw: Graph<N>): Graph<N> {
  if (raw.nodes.length === 0) throw new Error('noc graph: no nodes');
  const ids = new Set<string>();
  for (const n of raw.nodes) {
    if (!n.id) throw new Error('noc graph: a node has an empty id');
    if (ids.has(n.id)) throw new Error(`noc graph: duplicate id "${n.id}"`);
    ids.add(n.id);
  }
  for (const n of raw.nodes) {
    for (const d of n.dependsOn) {
      if (d === n.id) throw new Error(`noc graph: "${n.id}" depends on itself`);
      if (!ids.has(d)) throw new Error(`noc graph: "${n.id}" depends on unknown node "${d}"`);
    }
  }
  assertAcyclic(raw);
  return raw;
}

function assertAcyclic(graph: Graph): void {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') throw new Error(`noc graph: cycle through "${id}"`);
    state.set(id, 'visiting');
    for (const d of byId.get(id)!.dependsOn) visit(d);
    state.set(id, 'done');
  };
  for (const n of graph.nodes) visit(n.id);
}

function normalise(graph: Graph, down: ReadonlySet<string> | readonly string[]) {
  const downSet = new Set(down);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const id of downSet) {
    if (!byId.has(id)) throw new Error(`noc graph: down set names unknown node "${id}"`);
  }
  const memo = new Map<string, boolean>();
  const visiting = new Set<string>();
  /** true when any ancestor (not the node itself) is down */
  const ancestorDown = (id: string): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`noc graph: cycle through "${id}"`);
    visiting.add(id);
    const result = byId.get(id)!.dependsOn.some((p) => downSet.has(p) || ancestorDown(p));
    visiting.delete(id);
    memo.set(id, result);
    return result;
  };
  return { downSet, ancestorDown };
}

/** One alarm per root cause; downstream failures are suppressed. */
export function computeAlarms(
  graph: Graph,
  down: ReadonlySet<string> | readonly string[],
): AlarmResult {
  const { downSet, ancestorDown } = normalise(graph, down);
  const alarms: string[] = [];
  const suppressed: string[] = [];
  for (const n of graph.nodes) {
    const isDown = downSet.has(n.id);
    const blocked = ancestorDown(n.id);
    if (isDown && !blocked) alarms.push(n.id);
    else if (isDown || blocked) suppressed.push(n.id);
  }
  return { alarms, suppressed };
}

/** Without dependencies every affected node alarms. Returns ids in graph order. */
export function computeNaiveAlarms(
  graph: Graph,
  down: ReadonlySet<string> | readonly string[],
): string[] {
  const { downSet, ancestorDown } = normalise(graph, down);
  return graph.nodes.filter((n) => downSet.has(n.id) || ancestorDown(n.id)).map((n) => n.id);
}

export type NocState = 'ok' | 'alarm' | 'suppressed';

/** The state each node shows, with dependencies (`naive` false) or without. */
export function nodeStates(
  graph: Graph,
  down: ReadonlySet<string> | readonly string[],
  naive: boolean,
): Map<string, NocState> {
  const states = new Map<string, NocState>(graph.nodes.map((n) => [n.id, 'ok']));
  if (naive) {
    for (const id of computeNaiveAlarms(graph, down)) states.set(id, 'alarm');
  } else {
    const { alarms, suppressed } = computeAlarms(graph, down);
    for (const id of alarms) states.set(id, 'alarm');
    for (const id of suppressed) states.set(id, 'suppressed');
  }
  return states;
}

export interface SummaryStrings {
  none: string;
  alarmsOne: string;
  alarmsMany: string;
  suppressedOne: string;
  suppressedMany: string;
  naiveOne: string;
  naiveMany: string;
}

const fill = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** The sentence the live region reads out. Plural wording comes from `strings`. */
export function describe(
  strings: SummaryStrings,
  labelOf: (id: string) => string,
  state: { alarms: readonly string[]; suppressed: readonly string[] },
  naive: boolean,
): string {
  const names = state.alarms.map(labelOf).join(', ');
  const count = state.alarms.length;
  if (count === 0) return strings.none;
  if (naive) return fill(count === 1 ? strings.naiveOne : strings.naiveMany, { count, names });
  const head = fill(count === 1 ? strings.alarmsOne : strings.alarmsMany, { count, names });
  const hidden = state.suppressed.length;
  if (hidden === 0) return head;
  const tail = fill(hidden === 1 ? strings.suppressedOne : strings.suppressedMany, {
    count: hidden,
  });
  return `${head} ${tail}`;
}
