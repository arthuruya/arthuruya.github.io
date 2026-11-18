// Minimal PNG tools, no dependency: decode an 8-bit RGB(A) non-interlaced PNG, and re-encode
// it as an indexed PNG. The share images are flat art with antialiased edges, so a palette
// of the 256 most common colours keeps them well under the 150 KB limit that a truecolour
// PNG from the browser (about 185 KB) does not meet.
import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body) >>> 0, 8 + data.length);
  return out;
}

/** -> { width, height, rgb: Uint8Array (3 bytes per pixel) } */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let o = 8;
  let hdr;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('latin1', o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') hdr = data;
    else if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const width = hdr.readUInt32BE(0);
  const height = hdr.readUInt32BE(4);
  const [depth, ctype, , , interlace] = [hdr[8], hdr[9], hdr[10], hdr[11], hdr[12]];
  const bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
  if (depth !== 8 || !bpp || interlace) throw new Error('only 8-bit RGB(A), non-interlaced');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 255;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = px[i * bpp];
    rgb[i * 3 + 1] = px[i * bpp + 1];
    rgb[i * 3 + 2] = px[i * bpp + 2];
  }
  return { width, height, rgb };
}

/** Palette of the `max` most common colours, and the index of every pixel. */
export function quantize({ width, height, rgb }, max = 256) {
  const count = new Map();
  for (let i = 0; i < width * height; i++) {
    const k = (rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2];
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  const palette = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
  const nearest = new Map(palette.map((k, i) => [k, i]));
  const index = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const k = (r << 16) | (g << 8) | b;
    let n = nearest.get(k);
    if (n === undefined) {
      let best = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const p = palette[j];
        const d = (r - (p >> 16)) ** 2 + (g - ((p >> 8) & 255)) ** 2 + (b - (p & 255)) ** 2;
        if (d < best) {
          best = d;
          n = j;
        }
      }
      nearest.set(k, n);
    }
    index[i] = n;
  }
  return { palette, index };
}

/** Indexed PNG; each row uses whichever of filters 0 to 4 has the smallest absolute sum. */
export function encodeIndexed({ width, height, palette, index }) {
  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach((k, i) => plte.set([k >> 16, (k >> 8) & 255, k & 255], i * 3));
  const rows = [];
  for (let y = 0; y < height; y++) {
    let best = null;
    for (let f = 0; f <= 4; f++) {
      const out = Buffer.alloc(width + 1);
      out[0] = f;
      let sum = 0;
      for (let x = 0; x < width; x++) {
        const a = x ? index[y * width + x - 1] : 0;
        const b = y ? index[(y - 1) * width + x] : 0;
        const c = x && y ? index[(y - 1) * width + x - 1] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
        const v = (index[y * width + x] - pred) & 255;
        out[x + 1] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (!best || sum < best.sum) best = { sum, out };
    }
    rows.push(best.out);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 3, 0, 0, 0], 8);
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function toIndexedPng(buf, max = 256) {
  const img = decodePng(buf);
  const { palette, index } = quantize(img, max);
  return encodeIndexed({ width: img.width, height: img.height, palette, index });
}
