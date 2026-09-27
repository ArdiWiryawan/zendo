// Generates the Zendo launcher icons as real PNG files, with no image
// dependency: a minimal zlib-based PNG encoder lives below.
//
// Why this exists
// ---------------
// The "maskable" icons used to be byte-identical copies of the "any" icons
// (md5 dd5ae40d... / e3824873...). Android crops a `purpose: "maskable"` icon
// to a shape of its choosing and only guarantees the centre 80% circle
// survives. The old artwork drew a dark disc at r=214.72 on a 512 canvas,
// while the safe-zone radius is 512 * 0.8 / 2 = 204.8. The disc rim therefore
// sat 9.9px inside the crop zone and got shaved, which is what made the mark
// look partly missing once installed.
//
// So there are now two distinct artworks:
//   icon-*      the full mark, disc centred. Used where no crop happens.
//   maskable-*  full-bleed background, no disc edge at all, and the artwork
//               pulled well inside the safe zone so any mask shape works.
//
// Everything is derived from one geometry table so the two sizes cannot drift.
//
// Usage: node tools/icons/generate.mjs

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------- geometry

// Colours are the literal values the current art uses. Both happen to match
// the manifest: background #0F100F, gold #C0A16A.
const BG = [0x0f, 0x10, 0x0f];
const GOLD = [0xc0, 0xa1, 0x6a];

// Artwork measured off the shipped icon-512.png, in units of a 512 canvas,
// then normalised to a 0..1 fraction so any size is a plain multiply.
//   arc   mid radius 122.8, stroke 21.5, spans 309 deg and opens toward +x
//   dot   radius 15 at the centre
//   disc  radius 214.72 (only used by the "any" icon)
const ART = {
  arcMid: 122.8 / 512,
  arcStroke: 21.5 / 512,
  arcStartDeg: 25.5,
  arcSweepDeg: 309,
  dotRadius: 15 / 512,
  discRadius: 214.72 / 512,
};

const TAU = Math.PI * 2;
const deg2rad = (d) => (d * Math.PI) / 180;

// Front-to-back alpha compositing of `src` over `dst`.
function over(dst, src, a) {
  return [
    Math.round(src[0] * a + dst[0] * (1 - a)),
    Math.round(src[1] * a + dst[1] * (1 - a)),
    Math.round(src[2] * a + dst[2] * (1 - a)),
  ];
}

// Coverage of a shape at one pixel, sampled on a small subgrid. Returns 0..1.
function coverage(px, py, size, test, samples = 4) {
  let hits = 0;
  for (let sy = 0; sy < samples; sy++) {
    for (let sx = 0; sx < samples; sx++) {
      const x = px + (sx + 0.5) / samples;
      const y = py + (sy + 0.5) / samples;
      if (test(x, y)) hits++;
    }
  }
  return hits / (samples * samples);
}

// ---------------------------------------------------------------- renderer

/**
 * Renders one icon.
 * `maskable` drops the disc and shrinks the mark into the safe zone.
 */
function render(size, { maskable }) {
  const centre = size / 2;

  // The maskable variant keeps the artwork inside the 80% safe circle by
  // scaling it to 60% of the canvas, which leaves ~36% of clear background
  // between the arc's outer edge and the crop line.
  const scale = maskable ? 0.6 : 1;

  const arcMid = ART.arcMid * size;
  const arcStroke = ART.arcStroke * size;
  const dotRadius = ART.dotRadius * size;
  const discRadius = ART.discRadius * size;

  // Angle 0 points along +x and y grows downward, matching the measured
  // geometry (the arc opening faces +x).
  const a0 = deg2rad(ART.arcStartDeg);
  const arcR = arcMid * scale; // mid radius after the maskable scale-down
  const halfStroke = (arcStroke * scale) / 2;
  const dotR = dotRadius * scale;
  const discR = discRadius * scale;

  const sweep = deg2rad(ART.arcSweepDeg);
  const insideDisc = (x, y) => Math.hypot(x - centre, y - centre) <= discR;
  // A point is on the arc when it is within half the stroke of the arc's
  // centre line and inside the swept angle range. Scaling the artwork about
  // the centre preserves angles, so one test covers both variants.
  const onArc = (x, y) => {
    const r = Math.hypot(x - centre, y - centre);
    if (Math.abs(r - arcR) > halfStroke) return false;
    let rel = (Math.atan2(y - centre, x - centre) - a0) % TAU;
    if (rel < 0) rel += TAU;
    return rel <= sweep;
  };
  const onDot = (x, y) => Math.hypot(x - centre, y - centre) <= dotR;

  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Background: full-bleed in both variants.
      let rgb = BG;

      if (!maskable) {
        // The "any" icon draws its disc on top of the background.
        const a = coverage(x, y, size, insideDisc);
        if (a > 0) rgb = over(rgb, [23, 25, 23], a);
      }

      const aArc = coverage(x, y, size, onArc, 6);
      if (aArc > 0) rgb = over(rgb, GOLD, aArc);

      const aDot = coverage(x, y, size, onDot, 6);
      if (aDot > 0) rgb = over(rgb, GOLD, aDot);

      const i = (y * size + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

// ------------------------------------------------------------ PNG encoding

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (0 = None) per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- ICO output

// `public/favicon.ico` was a PNG renamed to .ico (it began 89 50 4E 47, the
// PNG magic). Browsers mostly tolerate that, but the extension promises an
// ICO container and some crawlers reject the mismatch. This writes a real
// multi-size ICO using PNG-compressed entries, which every current browser
// accepts.
function encodeICO(entries) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dirEntries = [];
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // 0 means 256
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; // palette size
    e[3] = 0; // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    dirEntries.push(e);
    offset += png.length;
  }

  return Buffer.concat([
    dir,
    ...dirEntries,
    ...entries.map((e) => e.png),
  ]);
}

const icoSizes = [16, 32, 48];
const ico = encodeICO(
  icoSizes.map((size) => ({
    size,
    png: encodePNG(size, render(size, { maskable: false })),
  }))
);
writeFileSync("public/favicon.ico", ico);
console.log(`public/favicon.ico  ${icoSizes.join("/")}  ${ico.length} bytes`);

// ------------------------------------------------------------------ output

const TARGETS = [
  ["public/icons/icon-192.png", 192, { maskable: false }],
  ["public/icons/icon-512.png", 512, { maskable: false }],
  ["public/icons/maskable-192.png", 192, { maskable: true }],
  ["public/icons/maskable-512.png", 512, { maskable: true }],
];

for (const [path, size, opts] of TARGETS) {
  mkdirSync(dirname(path), { recursive: true });
  const png = encodePNG(size, render(size, opts));
  writeFileSync(path, png);
  console.log(`${path}  ${size}x${size}  ${png.length} bytes`);
}
