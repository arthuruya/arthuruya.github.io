/**
 * Left-to-right layered layout for the NOC graph (RENCANA Phase 5). Pure: it returns a
 * column and a row for each node, in node units. The component multiplies by its sizes.
 *
 * Column = longest dependency path from a root. Row: a leaf takes the next free row, in
 * graph order; any other node sits at the mean row of the nodes that depend on it, so a
 * shared root ends up between its chains.
 */
import type { Graph, GraphNode } from './noc.ts';

export interface Place {
  col: number;
  row: number;
}

export interface Layout {
  places: Map<string, Place>;
  cols: number;
  rows: number;
}

export function layoutGraph(graph: Graph): Layout {
  const byId = new Map<string, GraphNode>(graph.nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
  for (const n of graph.nodes) for (const d of n.dependsOn) children.get(d)!.push(n.id);

  const colMemo = new Map<string, number>();
  const colOf = (id: string): number => {
    const known = colMemo.get(id);
    if (known !== undefined) return known;
    const deps = byId.get(id)!.dependsOn;
    const col = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(colOf));
    colMemo.set(id, col);
    return col;
  };

  let nextLeaf = 0;
  const rowMemo = new Map<string, number>();
  const rowOf = (id: string): number => {
    const known = rowMemo.get(id);
    if (known !== undefined) return known;
    const kids = children.get(id)!;
    let row: number;
    if (kids.length === 0) row = nextLeaf++;
    else {
      const rows = kids.map(rowOf);
      row = rows.reduce((a, b) => a + b, 0) / rows.length;
    }
    rowMemo.set(id, row);
    return row;
  };

  const places = new Map<string, Place>();
  for (const n of graph.nodes) places.set(n.id, { col: colOf(n.id), row: rowOf(n.id) });
  const cols = Math.max(...[...places.values()].map((p) => p.col)) + 1;
  return { places, cols, rows: Math.max(nextLeaf, 1) };
}
