import type { DXFData, DXFEntity, Bounds } from './types.js';

interface CodePair {
  c: number;
  v: string;
}

export function parseDXF(text: string): DXFData {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const codes: CodePair[] = [];

  for (let i = 0; i + 1 < raw.length; i += 2) {
    const c = parseInt(raw[i].trim());
    if (!isNaN(c)) codes.push({ c, v: raw[i + 1].trim() });
  }

  const entities: DXFEntity[] = [];
  const layerSet = new Set<string>();
  const rn = (v: string) => parseFloat(v) || 0;

  let idx = 0;
  while (idx < codes.length && !(codes[idx].c === 2 && codes[idx].v === 'ENTITIES')) idx++;
  idx++;

  let poly: any = null;

  while (idx < codes.length) {
    if (codes[idx].c !== 0) { idx++; continue; }
    const type = codes[idx].v;
    if (type === 'ENDSEC' || type === 'EOF') break;
    idx++;

    if (type === 'SEQEND') {
      if (poly) { entities.push(poly); poly = null; }
      continue;
    }

    const e: any = { type, layer: '0' };
    const verts: Array<{ x: number; y: number }> = [];
    let vx: number = 0;
    let hasVx = false;

    while (idx < codes.length && codes[idx].c !== 0) {
      const { c, v } = codes[idx++];
      switch (c) {
        case 8:  e.layer = v; layerSet.add(v); break;
        case 62: e.color = parseInt(v); break;
        case 10:
          if (type === 'LINE') e.x1 = rn(v);
          else if (type === 'LWPOLYLINE') { vx = rn(v); hasVx = true; }
          else e.x = rn(v);
          break;
        case 20:
          if (type === 'LINE') e.y1 = rn(v);
          else if (type === 'LWPOLYLINE' && hasVx) { verts.push({ x: vx, y: rn(v) }); hasVx = false; }
          else e.y = rn(v);
          break;
        case 11: e.x2 = rn(v); break;
        case 21: e.y2 = rn(v); break;
        case 40: if (e.r === undefined) e.r = rn(v); break;
        case 50: e.sa = rn(v); break;
        case 51: e.ea = rn(v); break;
        case 1:  e.text = v; break;
        case 3:  e.text = (e.text || '') + v; break;
        case 70: e.flags = parseInt(v); break;
      }
    }

    if (verts.length) e.vertices = verts;

    if (type === 'POLYLINE') {
      poly = { ...e, vertices: [] };
    } else if (type === 'VERTEX' && poly) {
      if (e.x !== undefined) poly.vertices.push({ x: e.x, y: e.y });
    } else {
      entities.push(e as DXFEntity);
    }
  }

  if (poly) entities.push(poly);

  return { entities, layers: [...layerSet] };
}

export function getBounds(entities: DXFEntity[]): Bounds {
  // Collect all coordinate points (skip TEXT/MTEXT for bounds to avoid title block distortion)
  const xs: number[] = [];
  const ys: number[] = [];

  entities.forEach((e: any) => {
    switch (e.type) {
      case 'LINE':
        xs.push(e.x1, e.x2);
        ys.push(e.y1, e.y2);
        break;
      case 'CIRCLE':
      case 'ARC':
        if (e.r) {
          xs.push(e.x - e.r, e.x + e.r);
          ys.push(e.y - e.r, e.y + e.r);
        }
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE':
        e.vertices?.forEach((v: { x: number; y: number }) => { xs.push(v.x); ys.push(v.y); });
        break;
      // Skip TEXT/MTEXT - they often sit in title blocks far from the drawing
    }
  });

  if (!xs.length) return { x0: 0, y0: 0, x1: 10000, y1: 10000 };

  // Use IQR-based bounds to ignore outliers (title blocks, annotations far from drawing)
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);

  const q1x = xs[Math.floor(xs.length * 0.25)];
  const q3x = xs[Math.floor(xs.length * 0.75)];
  const iqrX = Math.max(q3x - q1x, 1);
  const q1y = ys[Math.floor(ys.length * 0.25)];
  const q3y = ys[Math.floor(ys.length * 0.75)];
  const iqrY = Math.max(q3y - q1y, 1);

  // Filter to within 1.5x IQR of quartiles (standard outlier detection)
  const fxs = xs.filter(x => x >= q1x - 1.5 * iqrX && x <= q3x + 1.5 * iqrX);
  const fys = ys.filter(y => y >= q1y - 1.5 * iqrY && y <= q3y + 1.5 * iqrY);

  const x0 = fxs.length ? fxs[0] : xs[0];
  const x1 = fxs.length ? fxs[fxs.length - 1] : xs[xs.length - 1];
  const y0 = fys.length ? fys[0] : ys[0];
  const y1 = fys.length ? fys[fys.length - 1] : ys[ys.length - 1];

  const pad = Math.max((x1 - x0) * 0.08, (y1 - y0) * 0.08, 500);
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
