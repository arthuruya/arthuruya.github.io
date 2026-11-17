/**
 * The Drift Field: DOM glue around the pure functions in this folder (RENCANA Phase 4).
 * Plain TypeScript, no dependencies. Mounts on `#drift-field` (HeroChart.astro), which
 * already holds the static SVG chart; on any failure the canvas is removed and that static
 * chart stays (4.5 "Failure").
 *
 * Layers: one visible canvas, plus two offscreen ones: the trail layer (opaque, faded each
 * frame with --paper) and the land layer (drawn once). The visible canvas composites them and
 * draws buoys on top, so buoys stay crisp while trails fade.
 */
import {
  ADVECTION_SCALE,
  ALPHA_MAX,
  ALPHA_MIN,
  BUOY_MAX,
  BUOY_RADIUS_PX,
  BUOY_TRAIL,
  GOVERNOR_FRAMES,
  GOVERNOR_MS,
  GOVERNOR_SHED,
  LIFE_MAX_FRAMES,
  LIFE_MIN_FRAMES,
  MARKER_PAD,
  MAX_FRAME_SECONDS,
  NARROW_PX,
  PARTICLE_AREA_DIVISOR,
  PARTICLE_FLOOR,
  PARTICLE_MAX,
  PARTICLE_MAX_NARROW,
  PARTICLE_MIN,
  STILL_BUOY_SECONDS,
  STILL_SEED,
  STILL_STEPS,
  STILL_STREAMLINES,
  TAP_MAX_MOVE_PX,
  TAP_MAX_MS,
  TIME_SCALE,
  TRAIL_FADE,
} from './config.ts';
import {
  compassPoint,
  newSample,
  sampleField,
  validateMeta,
  type Compass,
  type Field,
  type SnapshotMeta,
} from './field.ts';
import { fieldVelocity, rk4Step, type Step, type Velocity } from './integrate.ts';
import { makeView, type View } from './projection.ts';
import { MAKASSAR_STRAIT, UNTIA, type LonLat } from '../markers.ts';

/** Strings from the dictionary, handed over as JSON in `data-strings` (RENCANA rule 9). */
export interface HeroStrings {
  dropAt: string; // "Drop a buoy at {place}"
  droppedAt: string; // "Buoy dropped at {place}."
  droppedHere: string; // "Buoy dropped."
  drifts: string; // "It drifts {dir}."
  onLand: string; // "That spot is land, so the buoy stays put."
  compass: Record<Compass, string>;
  places: { untia: string; strait: string };
  captions: { untia: string; strait: string };
}

/** chart.json, as written by `scripts/build-chart` (RENCANA 4.2). Rings are [lon, lat][]. */
export interface ChartFile {
  version: 1;
  land: [number, number][][];
  /** depth in metres to rings; drawn as faint contour lines */
  depth?: Record<string, [number, number][][]>;
}

type Rgb = string;
interface Colours {
  paper: Rgb;
  paper2: Rgb;
  ink: Rgb;
  contour: Rgb;
  yellow: Rgb;
}

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Seeded PRNG (mulberry32), for the reduced-motion still frame. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const particleCount = (areaPx: number, widthPx: number): number => {
  const n = Math.min(
    PARTICLE_MAX,
    Math.max(PARTICLE_MIN, Math.round(areaPx / PARTICLE_AREA_DIVISOR)),
  );
  return widthPx < NARROW_PX ? Math.min(n, PARTICLE_MAX_NARROW) : n;
};

interface Buoy {
  lon: number;
  lat: number;
  /** positions oldest to newest, lon/lat pairs, at most BUOY_TRAIL */
  trail: number[];
  stopped: boolean;
  /** frames since it stopped, for the dot-pulse */
  pulse: number;
}

class DriftField {
  private readonly root: HTMLElement;
  private readonly strings: HeroStrings;
  private readonly field: Field;
  private readonly chart: ChartFile | null;
  private readonly vel: Velocity;

  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private trail = document.createElement('canvas');
  private tctx = this.trail.getContext('2d')!;
  private land = document.createElement('canvas');
  private lctx = this.land.getContext('2d')!;

  private view!: View;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private colours!: Colours;

  private n = 0;
  private lon = new Float64Array(0);
  private lat = new Float64Array(0);
  private px = new Float32Array(0);
  private py = new Float32Array(0);
  private age = new Int16Array(0);
  private life = new Int16Array(0);
  private tint = new Float32Array(0);

  private buoys: Buoy[] = [];
  private clock = 0; // model seconds of field time
  private raf = 0;
  private last = 0;
  private running = false;
  private visible = true;
  private tabVisible = !document.hidden;
  private frameTimes: number[] = [];
  private draws = 0;
  private reduced = false;
  private seq = 0;

  private live!: HTMLElement;
  private markerEls: { el: HTMLElement; at: LonLat }[] = [];
  private scratch = newSample();
  private step: Step = { lon: 0, lat: 0, land: false };

  constructor(root: HTMLElement, strings: HeroStrings, field: Field, chart: ChartFile | null) {
    this.root = root;
    this.strings = strings;
    this.field = field;
    this.chart = chart;
    this.vel = fieldVelocity(field);
  }

  /** Split in two tasks with a yield between, so no single task nears 50 ms on a slow phone. */
  async mount(): Promise<void> {
    const { root, canvas } = this;
    canvas.className = 'drift-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.draws = '0';
    root.append(canvas);
    root.dataset.live = 'true';
    this.buildControls();
    this.resize();
    this.reduced = prefersReducedMotion();
    await new Promise<void>((done) => setTimeout(done, 0));
    this.allocate(particleCount(this.w * this.h, this.w));

    new ResizeObserver(() => {
      // the first callback fires on observe(); skip it so a still frame is drawn once
      const r = root.getBoundingClientRect();
      if (Math.round(r.width) === this.w && Math.round(r.height) === this.h) return;
      this.resize();
      this.refresh();
    }).observe(root);
    new IntersectionObserver((entries) => {
      this.visible = entries[entries.length - 1].isIntersecting;
      this.syncLoop();
    }).observe(root);
    document.addEventListener('visibilitychange', () => {
      this.tabVisible = !document.hidden;
      this.syncLoop();
    });
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', () => {
      this.reduced = mq.matches;
      this.refresh();
    });
    // The theme: data-theme on <html> (manual) or the system preference.
    new MutationObserver(() => this.themeChanged()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () =>
      this.themeChanged(),
    );

    this.bindPointer();
    this.refresh();
  }

  /** (Re)draw whatever the current motion preference calls for. */
  private refresh(): void {
    this.stopLoop();
    this.paintBase(!this.reduced);
    if (this.reduced) {
      this.drawStill();
    } else {
      this.syncLoop();
    }
  }

  // ---------- layout and layers ----------

  private resize(): void {
    const r = this.root.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.canvas, this.trail, this.land]) {
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
    }
    this.canvas.style.inlineSize = '100%';
    this.canvas.style.blockSize = '100%';
    this.view = makeView(
      this.field.meta.bbox,
      [MAKASSAR_STRAIT, UNTIA],
      this.w,
      this.h,
      MARKER_PAD,
    );
    this.readColours();
    this.drawLand();
    this.placeMarkers();
    // Fewer particles on a smaller box; never grow back (the governor only sheds).
    if (this.n > 0) {
      const want = particleCount(this.w * this.h, this.w);
      if (want < this.n) this.allocate(want);
    }
    // buoys were placed in lon/lat, so they survive a resize untouched
  }

  private readColours(): void {
    const cs = getComputedStyle(this.root);
    const get = (name: string) => cs.getPropertyValue(name).trim();
    this.colours = {
      paper: get('--paper'),
      paper2: get('--paper-2'),
      ink: get('--ink'),
      contour: get('--contour'),
      yellow: get('--mark-yellow'),
    };
  }

  private themeChanged(): void {
    // Not cached across themes: read again, repaint the layers, redraw the still if needed.
    this.readColours();
    this.drawLand();
    this.refresh();
  }

  /** Fill the trail layer with --paper (start of a run, theme change, resize). */
  private paintBase(andCompose = true): void {
    const t = this.tctx;
    t.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    t.globalAlpha = 1;
    t.fillStyle = this.colours.paper;
    t.fillRect(0, 0, this.w, this.h);
    if (andCompose) this.compose();
  }

  /** Land is drawn once to its own layer and composited; never per frame. */
  private drawLand(): void {
    const c = this.lctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = this.colours.paper2;
    c.strokeStyle = this.colours.contour;
    c.lineWidth = 1;
    c.lineJoin = 'round';
    if (this.chart) {
      if (this.chart.depth) {
        c.save();
        c.globalAlpha = 0.45;
        c.beginPath();
        for (const rings of Object.values(this.chart.depth)) this.tracePath(c, rings, false);
        c.stroke();
        c.restore();
      }
      c.beginPath();
      this.tracePath(c, this.chart.land, true);
      c.fill('evenodd');
      c.stroke();
    } else {
      // No chart.json yet: show the model's own land mask as cells.
      const { meta, data } = this.field;
      const cw = meta.dlon * this.view.k * this.view.scale;
      const ch = meta.dlat * this.view.scale;
      c.beginPath();
      for (let j = 0; j < meta.ny; j++) {
        for (let i = 0; i < meta.nx; i++) {
          if (data[(j * meta.nx + i) * 2] !== meta.fill) continue;
          const p = this.view.toPx(meta.bbox.lon0 + i * meta.dlon, meta.bbox.lat0 + j * meta.dlat);
          c.rect(p.x - cw / 2, p.y - ch / 2, cw, ch);
        }
      }
      c.fill();
    }
  }

  private tracePath(
    c: CanvasRenderingContext2D,
    rings: [number, number][][],
    close: boolean,
  ): void {
    for (const ring of rings) {
      ring.forEach(([lo, la], i) => {
        const p = this.view.toPx(lo, la);
        if (i === 0) c.moveTo(p.x, p.y);
        else c.lineTo(p.x, p.y);
      });
      if (close) c.closePath();
    }
  }

  private compose(): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.drawImage(this.trail, 0, 0);
    c.drawImage(this.land, 0, 0);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBuoys(c);
    this.draws++;
    this.canvas.dataset.draws = String(this.draws);
  }

  // ---------- particles ----------

  private allocate(n: number): void {
    const keep = Math.min(n, this.n);
    const grow = <T extends Float64Array | Float32Array | Int16Array>(
      old: T,
      Ctor: new (len: number) => T,
    ): T => {
      const next = new Ctor(n);
      next.set(old.subarray(0, keep));
      return next;
    };
    this.lon = grow(this.lon, Float64Array);
    this.lat = grow(this.lat, Float64Array);
    this.px = grow(this.px, Float32Array);
    this.py = grow(this.py, Float32Array);
    this.age = grow(this.age, Int16Array);
    this.life = grow(this.life, Int16Array);
    this.tint = grow(this.tint, Float32Array);
    for (let i = keep; i < n; i++) this.spawn(i, true);
    this.n = n;
  }

  private spawn(i: number, scatterAge: boolean, rnd: () => number = Math.random): void {
    const v = this.view;
    for (let tries = 0; tries < 10; tries++) {
      const p = v.toLonLat(rnd() * this.w, rnd() * this.h);
      sampleField(this.field, p.lon, p.lat, this.clock, this.scratch);
      if (this.scratch.land) continue;
      this.lon[i] = p.lon;
      this.lat[i] = p.lat;
      break;
    }
    const life = LIFE_MIN_FRAMES + Math.floor(rnd() * (LIFE_MAX_FRAMES - LIFE_MIN_FRAMES));
    this.life[i] = life;
    this.age[i] = scatterAge ? Math.floor(rnd() * life) : 0;
    this.tint[i] = ALPHA_MIN + rnd() * (ALPHA_MAX - ALPHA_MIN);
    const q = v.toPx(this.lon[i], this.lat[i]);
    this.px[i] = q.x;
    this.py[i] = q.y;
  }

  private tick = (now: number): void => {
    this.raf = 0;
    if (!this.running) return;
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - this.last) / 1000));
    const frameMs = now - this.last;
    this.last = now;
    this.govern(frameMs);
    this.clock += dt * TIME_SCALE;
    const h = dt * ADVECTION_SCALE;
    const dtField = dt * TIME_SCALE;
    const v = this.view;
    const k = v.k * v.scale;
    const t = this.tctx;
    t.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    t.globalAlpha = TRAIL_FADE;
    t.fillStyle = this.colours.paper;
    t.fillRect(0, 0, this.w, this.h);
    t.globalAlpha = 1;
    t.lineWidth = 1;
    t.strokeStyle = this.colours.ink;

    const buckets: number[][] = [[], [], [], [], [], [], [], []];
    for (let i = 0; i < this.n; i++) {
      rk4Step(this.vel, this.lon[i], this.lat[i], this.clock, h, this.step, dtField);
      this.age[i]++;
      const out = this.step.land || this.age[i] >= this.life[i];
      const nx = (this.step.lon - v.lonC) * k + this.w / 2;
      const ny = this.h / 2 - (this.step.lat - v.latC) * v.scale;
      const off = nx < -4 || nx > this.w + 4 || ny < -4 || ny > this.h + 4;
      if (!out && !off) {
        const a = this.age[i] / this.life[i];
        const fade = Math.min(1, a * 6, (1 - a) * 6);
        const alpha = this.tint[i] * fade;
        const b = Math.min(7, Math.floor((alpha / ALPHA_MAX) * 8));
        buckets[b].push(this.px[i], this.py[i], nx, ny);
        this.lon[i] = this.step.lon;
        this.lat[i] = this.step.lat;
        this.px[i] = nx;
        this.py[i] = ny;
      } else {
        this.spawn(i, false);
      }
    }
    for (let b = 0; b < 8; b++) {
      const seg = buckets[b];
      if (seg.length === 0) continue;
      t.globalAlpha = ((b + 1) / 8) * ALPHA_MAX;
      t.beginPath();
      for (let s = 0; s < seg.length; s += 4) {
        t.moveTo(seg[s], seg[s + 1]);
        t.lineTo(seg[s + 2], seg[s + 3]);
      }
      t.stroke();
    }
    t.globalAlpha = 1;

    this.advanceBuoys(h, dtField);
    this.compose();
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Governor (4.5): average over 30 frames; over 20 ms, shed 20 %; never grows back. */
  private govern(frameMs: number): void {
    if (frameMs <= 0 || frameMs > 1000) return;
    this.frameTimes.push(frameMs);
    if (this.frameTimes.length < GOVERNOR_FRAMES) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > GOVERNOR_MS && this.n > PARTICLE_FLOOR) {
      this.n = Math.max(PARTICLE_FLOOR, Math.round(this.n * (1 - GOVERNOR_SHED)));
    }
  }

  // ---------- loop lifecycle ----------

  private syncLoop(): void {
    const should = !this.reduced && this.visible && this.tabVisible;
    if (should && !this.running) {
      this.running = true;
      this.last = performance.now(); // resume without a jump
      this.frameTimes.length = 0;
      this.raf = requestAnimationFrame(this.tick);
    } else if (!should) {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ---------- reduced motion ----------

  /** One static frame: seeded streamlines through field step 0, then any buoy traces. */
  private drawStill(): void {
    const rnd = mulberry32(STILL_SEED);
    const t = this.tctx;
    const v = this.view;
    const h = ADVECTION_SCALE / 60;
    const s: Step = { lon: 0, lat: 0, land: false };
    t.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    t.lineWidth = 1;
    t.strokeStyle = this.colours.ink;
    t.globalAlpha = 0.4;
    t.beginPath();
    for (let n = 0; n < STILL_STREAMLINES; n++) {
      let p = v.toLonLat(rnd() * this.w, rnd() * this.h);
      let first = true;
      for (let k = 0; k < STILL_STEPS; k++) {
        // time stays at step 0: the still frame is one instant
        rk4Step(this.vel, p.lon, p.lat, 0, h, s, 0);
        if (s.land) break;
        const a = v.toPx(p.lon, p.lat);
        const b = v.toPx(s.lon, s.lat);
        if (first) {
          t.moveTo(a.x, a.y);
          first = false;
        }
        t.lineTo(b.x, b.y);
        p = { lon: s.lon, lat: s.lat };
      }
    }
    t.stroke();
    t.globalAlpha = 1;
    this.compose();
  }

  private traceBuoy(b: Buoy): void {
    const h = ADVECTION_SCALE / 60;
    const steps = STILL_BUOY_SECONDS * 60;
    for (let i = 0; i < steps; i++) {
      rk4Step(this.vel, b.lon, b.lat, 0, h, this.step, 0);
      if (this.step.land) {
        b.stopped = true;
        break;
      }
      b.lon = this.step.lon;
      b.lat = this.step.lat;
      this.pushTrail(b);
    }
  }

  // ---------- buoys ----------

  private pushTrail(b: Buoy): void {
    b.trail.push(b.lon, b.lat);
    if (b.trail.length > BUOY_TRAIL * 2) b.trail.splice(0, 2);
  }

  private advanceBuoys(h: number, dtField: number): void {
    for (const b of this.buoys) {
      if (b.stopped) {
        b.pulse++;
        continue;
      }
      rk4Step(this.vel, b.lon, b.lat, this.clock, h, this.step, dtField);
      if (this.step.land) {
        b.stopped = true;
        continue;
      }
      b.lon = this.step.lon;
      b.lat = this.step.lat;
      this.pushTrail(b);
    }
  }

  private drawBuoys(c: CanvasRenderingContext2D): void {
    const v = this.view;
    for (const b of this.buoys) {
      c.beginPath();
      c.lineWidth = 1.5;
      c.strokeStyle = this.colours.ink;
      c.globalAlpha = 0.6;
      for (let i = 0; i < b.trail.length; i += 2) {
        const p = v.toPx(b.trail[i], b.trail[i + 1]);
        if (i === 0) c.moveTo(p.x, p.y);
        else c.lineTo(p.x, p.y);
      }
      c.stroke();
      c.globalAlpha = 1;
      const p = v.toPx(b.lon, b.lat);
      if (b.stopped && !this.reduced) {
        // a short dot-pulse at the stopping point
        const r = BUOY_RADIUS_PX + 6 * Math.abs(Math.sin(b.pulse / 14));
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.lineWidth = 1;
        c.strokeStyle = this.colours.yellow;
        c.globalAlpha = Math.max(0, 1 - b.pulse / 120);
        c.stroke();
        c.globalAlpha = 1;
      }
      c.beginPath();
      c.arc(p.x, p.y, BUOY_RADIUS_PX / 2, 0, Math.PI * 2);
      c.fillStyle = this.colours.ink;
      c.fill();
      c.beginPath();
      c.arc(p.x, p.y, BUOY_RADIUS_PX, 0, Math.PI * 2);
      c.lineWidth = 2;
      c.strokeStyle = this.colours.yellow;
      c.stroke();
    }
  }

  /** Drop a buoy at lon/lat; `place` names it for the live region (marker drops). */
  private drop(at: LonLat, place?: string): void {
    sampleField(this.field, at.lon, at.lat, this.clock, this.scratch);
    const land = this.scratch.land;
    const b: Buoy = { lon: at.lon, lat: at.lat, trail: [], stopped: land, pulse: 0 };
    if (!land) this.pushTrail(b);
    this.buoys.push(b);
    if (this.buoys.length > BUOY_MAX) this.buoys.shift();
    if (this.reduced) {
      if (!land) this.traceBuoy(b);
      this.paintBase(false);
      this.drawStill();
    }
    const head = place
      ? this.strings.droppedAt.replace('{place}', place)
      : this.strings.droppedHere;
    const tail = land
      ? this.strings.onLand
      : this.strings.drifts.replace(
          '{dir}',
          this.strings.compass[compassPoint(this.scratch.u, this.scratch.v)],
        );
    // A changing string each time, so assistive tech announces repeat drops too.
    this.live.textContent = `${head} ${tail}${++this.seq % 2 ? '' : ' '}`;
  }

  // ---------- controls ----------

  private buildControls(): void {
    const s = this.strings;
    this.live = document.createElement('div');
    this.live.className = 'visually-hidden';
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('role', 'status');

    const bar = document.createElement('div');
    bar.className = 'drop-bar';
    const places: [string, LonLat][] = [
      [s.places.untia, UNTIA],
      [s.places.strait, MAKASSAR_STRAIT],
    ];
    for (const [name, at] of places) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drop-btn';
      btn.textContent = s.dropAt.replace('{place}', name);
      btn.addEventListener('click', () => this.drop(at, name));
      bar.append(btn);
    }

    const defs: [string, LonLat, string][] = [
      [s.places.strait, MAKASSAR_STRAIT, s.captions.strait],
      [s.places.untia, UNTIA, s.captions.untia],
    ];
    defs.forEach(([name, at, caption], idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'marker-pin';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'marker-btn';
      const id = `drift-cap-${idx}`;
      btn.setAttribute('aria-describedby', id);
      btn.setAttribute('aria-pressed', 'false');
      const NS = 'http://www.w3.org/2000/svg';
      const dot = document.createElementNS(NS, 'svg');
      dot.setAttribute('class', 'marker-dot');
      dot.setAttribute('viewBox', '0 0 12 12');
      dot.setAttribute('aria-hidden', 'true');
      dot.setAttribute('focusable', 'false');
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', '6');
      circle.setAttribute('cy', '6');
      circle.setAttribute('r', '5');
      dot.append(circle);
      const label = document.createElement('span');
      label.className = 'marker-label';
      label.textContent = name;
      btn.append(dot, label);
      const cap = document.createElement('span');
      cap.className = 'marker-caption';
      cap.id = id;
      cap.textContent = caption;
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
      });
      wrap.append(btn, cap);
      this.root.append(wrap);
      this.markerEls.push({ el: wrap, at });
    });
    this.root.append(bar, this.live);
  }

  private placeMarkers(): void {
    for (const m of this.markerEls) {
      const p = this.view.toPx(m.at.lon, m.at.lat);
      m.el.style.left = `${(100 * p.x) / this.w}%`;
      m.el.style.top = `${(100 * p.y) / this.h}%`;
    }
  }

  private bindPointer(): void {
    let down: { x: number; y: number; t: number; id: number } | null = null;
    this.root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    this.root.addEventListener('pointerup', (e) => {
      const d = down;
      down = null;
      if (!d || d.id !== e.pointerId) return;
      const quick = performance.now() - d.t < TAP_MAX_MS;
      const still = Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_MAX_MOVE_PX;
      if (!quick || !still) return;
      const r = this.root.getBoundingClientRect();
      this.drop(this.view.toLonLat(e.clientX - r.left, e.clientY - r.top));
    });
    this.root.addEventListener('pointercancel', () => {
      down = null;
    });
  }
}

// ---------- boot ----------

async function loadField(base: string): Promise<Field> {
  const [mRes, bRes] = await Promise.all([
    fetch(`${base}snapshot.json`, { priority: 'low' } as RequestInit),
    fetch(`${base}snapshot.bin`, { priority: 'low' } as RequestInit),
  ]);
  if (!mRes.ok || !bRes.ok)
    throw new Error(`snapshot fetch failed (${mRes.status}, ${bRes.status})`);
  const meta: unknown = await mRes.json();
  const errs = validateMeta(meta);
  if (errs.length) throw new Error(`snapshot.json invalid: ${errs.join('; ')}`);
  const buf = await bRes.arrayBuffer();
  if (buf.byteLength % 2 !== 0) throw new Error('snapshot.bin has an odd byte length');
  const m = meta as SnapshotMeta;
  // Int16 little-endian. Every browser host is little-endian; if one is not, swap.
  const data = new Int16Array(buf);
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) {
    const view = new DataView(buf);
    for (let i = 0; i < data.length; i++) data[i] = view.getInt16(2 * i, true);
  }
  // The value limits (speed, fill share, size) are enforced at build by `check:snapshot`;
  // scanning 700 000 values again here would cost a long task on a slow phone.
  if (data.length !== m.nx * m.ny * m.steps * 2) {
    throw new Error(
      `snapshot.bin holds ${data.length} values, expected ${m.nx * m.ny * m.steps * 2}`,
    );
  }
  return { meta: m, data };
}

async function loadChart(url: string): Promise<ChartFile | null> {
  try {
    const res = await fetch(url, { priority: 'low' } as RequestInit);
    if (!res.ok) return null;
    const c = (await res.json()) as ChartFile;
    return c.version === 1 && Array.isArray(c.land) ? c : null;
  } catch {
    return null;
  }
}

export async function boot(root: HTMLElement): Promise<void> {
  try {
    const strings = JSON.parse(root.dataset.strings ?? '') as HeroStrings;
    const base = root.dataset.dataBase ?? '/data/';
    const [field, chart] = await Promise.all([loadField(base), loadChart(`${base}chart.json`)]);
    await new DriftField(root, strings, field, chart).mount();
  } catch (e) {
    root.querySelector('canvas.drift-canvas')?.remove();
    delete root.dataset.live;
    console.warn(
      'Drift Field not started, showing the static chart:',
      e instanceof Error ? e.message : e,
    );
  }
}
