import type { DXFEntity, HAxis, VAxis, Axes, Bounds, Opening } from './types.js';
import { getBounds } from './dxf-parser.js';

const EXCLUDE_KW = ['寸法','DIM','TEXT','注記','HATCH','家具','FURNITURE','設備','PLUMBING','ELECTRIC','ANNO','VIEWPORT','DEFPOINTS','TITLE'];
const WALL_KW = ['壁','WALL','外壁','内壁','通り芯','軸','AXIS','CENTER','柱','COLUMN','GRID','STRUCT'];
const OPEN_KW = ['窓','WINDOW','ドア','DOOR','建具','開口','WIN','DR'];

function isStructural(layer: string) {
  const u = layer.toUpperCase();
  return !EXCLUDE_KW.some(k => u.includes(k));
}

function isWallLayer(layer: string) {
  const u = layer.toUpperCase();
  return WALL_KW.some(k => u.includes(k));
}

export function extractAxes(entities: DXFEntity[]): Axes {
  const bounds = getBounds(entities);
  const bW = bounds.x1 - bounds.x0, bH = bounds.y1 - bounds.y0;
  const scale = Math.max(bW, bH);
  const minLen = Math.max(2000, scale * 0.25);
  const merge = Math.max(500, scale * 0.03);

  const proc = (ents: DXFEntity[], hC: HAxis[], vC: VAxis[]) => {
    ents.forEach((e: any) => {
      const lines: [number, number, number, number][] = [];
      if (e.type === 'LINE') lines.push([e.x1, e.y1, e.x2, e.y2]);
      else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices)
        for (let i = 0; i < e.vertices.length - 1; i++)
          lines.push([e.vertices[i].x, e.vertices[i].y, e.vertices[i + 1].x, e.vertices[i + 1].y]);
      lines.forEach(([x1, y1, x2, y2]) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < minLen) return;
        const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
        if (dy / len < 0.08) hC.push({ y: (y1 + y2) / 2, x0: Math.min(x1, x2), x1: Math.max(x1, x2), len });
        else if (dx / len < 0.08) vC.push({ x: (x1 + x2) / 2, y0: Math.min(y1, y2), y1: Math.max(y1, y2), len });
      });
    });
  };

  const dedup = <T extends { len: number }>(arr: T[], key: keyof T, m: number): T[] => {
    if (!arr.length) return [];
    const s = [...arr].sort((a, b) => (a[key] as number) - (b[key] as number));
    const r = [s[0]];
    s.slice(1).forEach(l => {
      const p = r[r.length - 1];
      if (Math.abs((l[key] as number) - (p[key] as number)) > m) r.push(l);
      else if (l.len > p.len) r[r.length - 1] = l;
    });
    return r;
  };

  for (const filter of [
    (e: any) => isWallLayer(e.layer || ''),
    (e: any) => isStructural(e.layer || ''),
    () => true,
  ]) {
    const hC: HAxis[] = [], vC: VAxis[] = [];
    proc(entities.filter(filter), hC, vC);
    let h = dedup(hC, 'y', merge), v = dedup(vC, 'x', merge);
    if (h.length >= 2 && v.length >= 2) {
      if (h.length > 10) { h.sort((a, b) => b.len - a.len); h = h.slice(0, 8); h.sort((a, b) => a.y - b.y); }
      if (v.length > 10) { v.sort((a, b) => b.len - a.len); v = v.slice(0, 8); v.sort((a, b) => a.x - b.x); }
      h[0].isExterior = true; h[h.length - 1].isExterior = true;
      v[0].isExterior = true; v[v.length - 1].isExterior = true;
      return { hAxes: h, vAxes: v };
    }
  }
  return { hAxes: [], vAxes: [] };
}

export function syntheticAxes(bounds: Bounds, floors = 2): Axes {
  const { x0, y0, x1, y1 } = bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, W = (x1 - x0) * 0.78, H = (y1 - y0) * 0.78;
  return {
    hAxes: [
      { y: cy - H / 2, x0: cx - W / 2, x1: cx + W / 2, len: W, isExterior: true },
      ...(floors >= 2 ? [{ y: cy, x0: cx - W / 2, x1: cx + W / 2, len: W }] : []),
      { y: cy + H / 2, x0: cx - W / 2, x1: cx + W / 2, len: W, isExterior: true },
    ],
    vAxes: [
      { x: cx - W / 2, y0: cy - H / 2, y1: cy + H / 2, len: H, isExterior: true },
      { x: cx - W / 6, y0: cy - H / 2, y1: cy + H / 2, len: H },
      { x: cx + W / 6, y0: cy - H / 2, y1: cy + H / 2, len: H },
      { x: cx + W / 2, y0: cy - H / 2, y1: cy + H / 2, len: H, isExterior: true },
    ],
  };
}

export function detectOpenings(entities: DXFEntity[], hAxes: HAxis[], vAxes: VAxis[], tol = 300) {
  const hO = new Map<number, Opening[]>();
  const vO = new Map<number, Opening[]>();

  entities.forEach((e: any) => {
    if (e.type === 'ARC' && e.r > 200 && e.r < 1500) {
      hAxes.forEach((a, i) => {
        if (Math.abs(e.y - a.y) < tol && e.x >= a.x0 - tol && e.x <= a.x1 + tol) {
          if (!hO.has(i)) hO.set(i, []);
          hO.get(i)!.push({ pos: e.x, width: e.r, type: 'door' });
        }
      });
      vAxes.forEach((a, i) => {
        if (Math.abs(e.x - a.x) < tol && e.y >= a.y0 - tol && e.y <= a.y1 + tol) {
          if (!vO.has(i)) vO.set(i, []);
          vO.get(i)!.push({ pos: e.y, width: e.r, type: 'door' });
        }
      });
    }
  });

  entities.filter((e: any) => OPEN_KW.some(k => (e.layer || '').toUpperCase().includes(k))).forEach((e: any) => {
    let cx: number, cy: number, w: number;
    if (e.type === 'LINE') {
      cx = ((e.x1 || 0) + (e.x2 || 0)) / 2; cy = ((e.y1 || 0) + (e.y2 || 0)) / 2;
      w = Math.hypot((e.x2 || 0) - (e.x1 || 0), (e.y2 || 0) - (e.y1 || 0));
    } else if (e.vertices?.length >= 2) {
      const xs = e.vertices.map((v: any) => v.x), ys = e.vertices.map((v: any) => v.y);
      cx = (Math.min(...xs) + Math.max(...xs)) / 2; cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      w = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    } else return;
    if (w < 300 || w > 3000) return;
    hAxes.forEach((a, i) => { if (Math.abs(cy - a.y) < tol) { if (!hO.has(i)) hO.set(i, []); hO.get(i)!.push({ pos: cx, width: w, type: 'window' }); } });
    vAxes.forEach((a, i) => { if (Math.abs(cx - a.x) < tol) { if (!vO.has(i)) vO.set(i, []); vO.get(i)!.push({ pos: cy, width: w, type: 'window' }); } });
  });

  const dd = (arr: Opening[]) => {
    if (arr.length < 2) return arr;
    arr.sort((a, b) => a.pos - b.pos);
    const r = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      const p = r[r.length - 1];
      if (arr[i].pos - p.pos < p.width) { if (arr[i].width > p.width) r[r.length - 1] = arr[i]; }
      else r.push(arr[i]);
    }
    return r;
  };
  hO.forEach((v, k) => hO.set(k, dd(v)));
  vO.forEach((v, k) => vO.set(k, dd(v)));
  return { hOpenings: hO, vOpenings: vO };
}
