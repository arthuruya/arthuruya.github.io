import { describe as suite, expect, it } from 'vitest';
import {
  computeAlarms,
  computeNaiveAlarms,
  describe,
  nodeStates,
  parseGraph,
  type SummaryStrings,
} from '../../src/lib/noc.ts';
import { layoutGraph } from '../../src/lib/noc-layout.ts';
import raw from '../../src/content/diagrams/noc.json';

const graph = parseGraph(raw);

suite('the shipped graph', () => {
  it('parses, and every label exists in both languages', () => {
    expect(graph.nodes).toHaveLength(8);
    for (const n of raw.nodes) {
      expect(n.label.en).toBeTruthy();
      expect(n.label.id).toBeTruthy();
    }
  });

  it('example names real nodes', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const id of raw.example) expect(ids.has(id)).toBe(true);
  });
});

suite('computeAlarms', () => {
  it('nothing down: no alarm, nothing suppressed', () => {
    expect(computeAlarms(graph, [])).toEqual({ alarms: [], suppressed: [] });
  });

  it('a leaf down: one alarm, zero suppressed', () => {
    expect(computeAlarms(graph, ['access-point'])).toEqual({
      alarms: ['access-point'],
      suppressed: [],
    });
  });

  it('the cellular modem down: one alarm, two suppressed', () => {
    expect(computeAlarms(graph, ['cellular-modem'])).toEqual({
      alarms: ['cellular-modem'],
      suppressed: ['datalogger', 'station-data'],
    });
  });

  it('the root down: one alarm, all others suppressed', () => {
    const r = computeAlarms(graph, ['uplink']);
    expect(r.alarms).toEqual(['uplink']);
    expect(r.suppressed).toHaveLength(graph.nodes.length - 1);
  });

  it('a down node under a down ancestor is suppressed, not an alarm', () => {
    const r = computeAlarms(graph, ['router', 'access-switch']);
    expect(r.alarms).toEqual(['router']);
    expect(r.suppressed).toEqual(['core-switch', 'access-switch', 'access-point']);
  });

  it('two independent failures in two chains: two alarms', () => {
    const r = computeAlarms(graph, ['access-switch', 'datalogger']);
    expect(r.alarms).toEqual(['access-switch', 'datalogger']);
    expect(r.suppressed).toEqual(['access-point', 'station-data']);
  });

  it('accepts a Set and rejects an unknown id', () => {
    expect(computeAlarms(graph, new Set(['router'])).alarms).toEqual(['router']);
    expect(() => computeAlarms(graph, ['nope'])).toThrow(/unknown node "nope"/);
  });
});

suite('computeNaiveAlarms', () => {
  it('every affected node alarms', () => {
    expect(computeNaiveAlarms(graph, ['cellular-modem'])).toEqual([
      'cellular-modem',
      'datalogger',
      'station-data',
    ]);
    expect(computeNaiveAlarms(graph, ['uplink'])).toHaveLength(graph.nodes.length);
    expect(computeNaiveAlarms(graph, [])).toEqual([]);
  });

  it('is never smaller than the dependency-aware count', () => {
    for (const n of graph.nodes) {
      expect(computeNaiveAlarms(graph, [n.id]).length).toBeGreaterThanOrEqual(
        computeAlarms(graph, [n.id]).alarms.length,
      );
    }
  });
});

suite('nodeStates', () => {
  it('maps alarm, suppressed and ok', () => {
    const s = nodeStates(graph, ['cellular-modem'], false);
    expect(s.get('cellular-modem')).toBe('alarm');
    expect(s.get('datalogger')).toBe('suppressed');
    expect(s.get('router')).toBe('ok');
  });

  it('naive mode shows no suppressed node', () => {
    const s = nodeStates(graph, ['cellular-modem'], true);
    expect([...s.values()].filter((v) => v === 'alarm')).toHaveLength(3);
    expect([...s.values()]).not.toContain('suppressed');
  });
});

suite('parseGraph', () => {
  const node = (id: string, dependsOn: string[] = []) => ({ id, dependsOn });

  it('throws on a cycle', () => {
    expect(() => parseGraph({ nodes: [node('a', ['b']), node('b', ['a'])] })).toThrow(/cycle/);
    expect(() =>
      parseGraph({ nodes: [node('a', ['c']), node('b', ['a']), node('c', ['b'])] }),
    ).toThrow(/cycle/);
  });

  it('throws on a self dependency, an unknown dependency, a duplicate id and an empty graph', () => {
    expect(() => parseGraph({ nodes: [node('a', ['a'])] })).toThrow(/itself/);
    expect(() => parseGraph({ nodes: [node('a', ['x'])] })).toThrow(/unknown node "x"/);
    expect(() => parseGraph({ nodes: [node('a'), node('a')] })).toThrow(/duplicate/);
    expect(() => parseGraph({ nodes: [] })).toThrow(/no nodes/);
  });

  it('computeAlarms also refuses a cycle that skipped parseGraph', () => {
    const cyclic = { nodes: [node('a', ['b']), node('b', ['a'])] };
    expect(() => computeAlarms(cyclic, [])).toThrow(/cycle/);
  });
});

suite('describe', () => {
  const strings: SummaryStrings = {
    none: 'No alarms.',
    alarmsOne: '1 alarm: {names}.',
    alarmsMany: '{count} alarms: {names}.',
    suppressedOne: '1 check suppressed.',
    suppressedMany: '{count} checks suppressed.',
    naiveOne: '1 alarm without dependencies: {names}.',
    naiveMany: '{count} alarms without dependencies: {names}.',
  };
  const labelOf = (id: string) => id.toUpperCase();

  it('reads the example from the plan', () => {
    expect(describe(strings, labelOf, computeAlarms(graph, ['cellular-modem']), false)).toBe(
      '1 alarm: CELLULAR-MODEM. 2 checks suppressed.',
    );
  });

  it('handles none, one suppressed, several alarms and naive mode', () => {
    expect(describe(strings, labelOf, computeAlarms(graph, []), false)).toBe('No alarms.');
    expect(describe(strings, labelOf, computeAlarms(graph, ['datalogger']), false)).toBe(
      '1 alarm: DATALOGGER. 1 check suppressed.',
    );
    expect(
      describe(strings, labelOf, computeAlarms(graph, ['access-switch', 'datalogger']), false),
    ).toBe('2 alarms: ACCESS-SWITCH, DATALOGGER. 2 checks suppressed.');
    expect(
      describe(
        strings,
        labelOf,
        { alarms: computeNaiveAlarms(graph, ['datalogger']), suppressed: [] },
        true,
      ),
    ).toBe('2 alarms without dependencies: DATALOGGER, STATION-DATA.');
  });
});

suite('layoutGraph', () => {
  const { places, cols, rows } = layoutGraph(graph);

  it('puts each node one column right of its deepest dependency', () => {
    expect(cols).toBe(5);
    expect(places.get('uplink')!.col).toBe(0);
    expect(places.get('access-point')!.col).toBe(4);
    expect(places.get('station-data')!.col).toBe(3);
  });

  it('gives each chain its own row and centres the shared uplink between them', () => {
    expect(rows).toBe(2);
    expect(places.get('router')!.row).toBe(0);
    expect(places.get('access-point')!.row).toBe(0);
    expect(places.get('cellular-modem')!.row).toBe(1);
    expect(places.get('uplink')!.row).toBe(0.5);
  });

  it('never puts two nodes in the same cell', () => {
    const cells = [...places.values()].map((p) => `${p.col}:${p.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });
});
