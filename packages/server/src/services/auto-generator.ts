import type {
  DXFEntity, DXFData, Preset, GenSettings,
  HAxis, VAxis, Extents, GeneratedLayers, Opening,
} from '@mugen/shared';
import { getBounds, extractAxes, syntheticAxes, detectOpenings } from '@mugen/shared';

function extents(hAxes: HAxis[], vAxes: VAxis[]): Extents {
  return {
    xMin: Math.min(...vAxes.map(a => a.x)),
    xMax: Math.max(...vAxes.map(a => a.x)),
    yMin: Math.min(...hAxes.map(a => a.y)),
    yMax: Math.max(...hAxes.map(a => a.y)),
  };
}

// ---- 기초 (Foundation) ----
function genFoundation(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const ov = 450, ft = preset.wallType === 'Wood' ? 200 : 175;
  const fs = preset.wallType === 'Wood' ? 400 : preset.wallType === 'LGS' ? 350 : 500;
  const el: any[] = [];

  el.push({ type: 'LWPOLYLINE', layer: '기초_외주', flags: 1, color: 30,
    vertices: [{ x: xMin - ov, y: yMin - ov }, { x: xMax + ov, y: yMin - ov }, { x: xMax + ov, y: yMax + ov }, { x: xMin - ov, y: yMax + ov }] });
  el.push({ type: 'LWPOLYLINE', layer: '기초_내부', flags: 1, color: 30,
    vertices: [{ x: xMin - ov + fs, y: yMin - ov + fs }, { x: xMax + ov - fs, y: yMin - ov + fs }, { x: xMax + ov - fs, y: yMax + ov - fs }, { x: xMin - ov + fs, y: yMax + ov - fs }] });

  hAxes.forEach(a => {
    if (a.isExterior) {
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y, x2: xMax + ov, y2: a.y });
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y - ft, x2: xMax + ov, y2: a.y - ft });
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: xMin - ov, y1: a.y + ft, x2: xMax + ov, y2: a.y + ft });
    } else {
      el.push({ type: 'LINE', layer: '기초_내부보', color: 8, x1: xMin, y1: a.y, x2: xMax, y2: a.y });
    }
  });
  vAxes.forEach(a => {
    if (a.isExterior) {
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x, y1: yMin - ov, x2: a.x, y2: yMax + ov });
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x - ft, y1: yMin - ov, x2: a.x - ft, y2: yMax + ov });
      el.push({ type: 'LINE', layer: '기초_보', color: 30, x1: a.x + ft, y1: yMin - ov, x2: a.x + ft, y2: yMax + ov });
    } else {
      el.push({ type: 'LINE', layer: '기초_내부보', color: 8, x1: a.x, y1: yMin, x2: a.x, y2: yMax });
    }
  });

  hAxes.forEach(h => vAxes.forEach(v => {
    if (!h.isExterior && !v.isExterior) return;
    const s = fs / 2;
    el.push({ type: 'LWPOLYLINE', layer: '기초_독립기초', flags: 1, color: 10,
      vertices: [{ x: v.x - s, y: h.y - s }, { x: v.x + s, y: h.y - s }, { x: v.x + s, y: h.y + s }, { x: v.x - s, y: h.y + s }] });
    el.push({ type: 'LINE', layer: '기초_독립기초', color: 10, x1: v.x - s, y1: h.y - s, x2: v.x + s, y2: h.y + s });
    el.push({ type: 'LINE', layer: '기초_독립기초', color: 10, x1: v.x + s, y1: h.y - s, x2: v.x - s, y2: h.y + s });
  }));
  return el;
}

// ---- 스터드 (Studs) ----
function genStuds(hAxes: HAxis[], vAxes: VAxis[], preset: Preset, hO: Map<number, Opening[]>, vO: Map<number, Opening[]>, floor = 1): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, wt = preset.wallType === 'Wood' ? 105 : 75;
  const color = floor === 1 ? 3 : 4;
  const el: any[] = [];

  const stud = (x1: number, y1: number, x2: number, y2: number, layer?: string) =>
    el.push({ type: 'LINE', layer: layer || `${floor}층_스터드`, color, x1, y1, x2, y2 });
  const plate = (x1: number, y1: number, x2: number, y2: number) =>
    el.push({ type: 'LINE', layer: `${floor}층_상하판`, color, x1, y1, x2, y2 });

  hAxes.forEach((a, idx) => {
    const ext = !!a.isExterior;
    const lyr = ext ? `${floor}층_스터드` : `${floor}층_내벽`;
    plate(xMin, a.y - wt / 2, xMax, a.y - wt / 2);
    plate(xMin, a.y + wt / 2, xMax, a.y + wt / 2);
    if (ext) plate(xMin, a.y - wt / 2 + 3, xMax, a.y - wt / 2 + 3);
    stud(xMin, a.y - wt / 2, xMin, a.y + wt / 2, lyr);
    stud(xMax, a.y - wt / 2, xMax, a.y + wt / 2, lyr);

    const openings = hO.get(idx) || [];
    for (let x = xMin + sp; x < xMax; x += sp) {
      if (!openings.some(o => x > o.pos - o.width / 2 && x < o.pos + o.width / 2))
        stud(x, a.y - wt / 2, x, a.y + wt / 2, lyr);
    }

    openings.forEach(o => {
      const L = o.pos - o.width / 2, R = o.pos + o.width / 2;
      stud(L, a.y - wt / 2, L, a.y + wt / 2, `${floor}층_개구부`);
      stud(R, a.y - wt / 2, R, a.y + wt / 2, `${floor}층_개구부`);
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: L, y1: a.y - wt / 4, x2: R, y2: a.y - wt / 4 });
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: L, y1: a.y + wt / 4, x2: R, y2: a.y + wt / 4 });
    });

    if (ext) {
      const br = sp * 10;
      for (let x = xMin; x < xMax - br / 2; x += br)
        el.push({ type: 'LINE', layer: `${floor}층_가새`, color: 6, x1: x, y1: a.y - wt / 2, x2: x + br, y2: a.y + wt / 2 });
    }
  });

  vAxes.forEach((a, idx) => {
    const ext = !!a.isExterior;
    const lyr = ext ? `${floor}층_스터드` : `${floor}층_내벽`;
    plate(a.x - wt / 2, yMin, a.x - wt / 2, yMax);
    plate(a.x + wt / 2, yMin, a.x + wt / 2, yMax);
    if (ext) plate(a.x - wt / 2 + 3, yMin, a.x - wt / 2 + 3, yMax);
    stud(a.x - wt / 2, yMin, a.x + wt / 2, yMin, lyr);
    stud(a.x - wt / 2, yMax, a.x + wt / 2, yMax, lyr);

    const openings = vO.get(idx) || [];
    for (let y = yMin + sp; y < yMax; y += sp) {
      if (!openings.some(o => y > o.pos - o.width / 2 && y < o.pos + o.width / 2))
        stud(a.x - wt / 2, y, a.x + wt / 2, y, lyr);
    }

    openings.forEach(o => {
      const B = o.pos - o.width / 2, T = o.pos + o.width / 2;
      stud(a.x - wt / 2, B, a.x + wt / 2, B, `${floor}층_개구부`);
      stud(a.x - wt / 2, T, a.x + wt / 2, T, `${floor}층_개구부`);
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: a.x - wt / 4, y1: B, x2: a.x - wt / 4, y2: T });
      el.push({ type: 'LINE', layer: `${floor}층_개구부`, color: 2, x1: a.x + wt / 4, y1: B, x2: a.x + wt / 4, y2: T });
    });

    if (ext) {
      const br = sp * 10;
      for (let y = yMin; y < yMax - br / 2; y += br)
        el.push({ type: 'LINE', layer: `${floor}층_가새`, color: 6, x1: a.x - wt / 2, y1: y, x2: a.x + wt / 2, y2: y + br });
    }
  });

  hAxes.filter(h => h.isExterior).forEach(h => {
    vAxes.filter(v => v.isExterior).forEach(v => {
      const s = wt / 2;
      stud(v.x - s, h.y - s, v.x - s, h.y + s); stud(v.x + s, h.y - s, v.x + s, h.y + s);
      stud(v.x - s, h.y - s, v.x + s, h.y - s); stud(v.x - s, h.y + s, v.x + s, h.y + s);
    });
  });

  return el;
}

// ---- 2층 바닥 ----
function genFloor2F(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, W = xMax - xMin, H = yMax - yMin;
  const el: any[] = [];
  ([[xMin, yMin, xMax, yMin], [xMax, yMin, xMax, yMax], [xMax, yMax, xMin, yMax], [xMin, yMax, xMin, yMin]] as number[][])
    .forEach(([x1, y1, x2, y2]) => el.push({ type: 'LINE', layer: '2층_바닥_주변보', color: 5, x1, y1, x2, y2 }));
  if (W >= H) { for (let y = yMin + sp; y < yMax; y += sp) el.push({ type: 'LINE', layer: '2층_바닥_장선', color: 5, x1: xMin, y1: y, x2: xMax, y2: y }); }
  else { for (let x = xMin + sp; x < xMax; x += sp) el.push({ type: 'LINE', layer: '2층_바닥_장선', color: 5, x1: x, y1: yMin, x2: x, y2: yMax }); }
  hAxes.filter(a => !a.isExterior).forEach(a => {
    el.push({ type: 'LINE', layer: '2층_바닥_이중장선', color: 4, x1: xMin, y1: a.y - 30, x2: xMax, y2: a.y - 30 });
    el.push({ type: 'LINE', layer: '2층_바닥_이중장선', color: 4, x1: xMin, y1: a.y + 30, x2: xMax, y2: a.y + 30 });
  });
  for (let x = xMin + 2730; x < xMax; x += 2730) el.push({ type: 'LINE', layer: '2층_바닥_가로막이', color: 8, x1: x, y1: yMin, x2: x, y2: yMax });
  return el;
}

// ---- 천정 ----
function genCeiling(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, W = xMax - xMin, H = yMax - yMin;
  const el: any[] = [];
  ([[xMin, yMin, xMax, yMin], [xMax, yMin, xMax, yMax], [xMax, yMax, xMin, yMax], [xMin, yMax, xMin, yMin]] as number[][])
    .forEach(([x1, y1, x2, y2]) => el.push({ type: 'LINE', layer: '천정_주변', color: 6, x1, y1, x2, y2 }));
  if (W < H) { for (let y = yMin + sp; y < yMax; y += sp) el.push({ type: 'LINE', layer: '천정_장선', color: 6, x1: xMin, y1: y, x2: xMax, y2: y }); }
  else { for (let x = xMin + sp; x < xMax; x += sp) el.push({ type: 'LINE', layer: '천정_장선', color: 6, x1: x, y1: yMin, x2: x, y2: yMax }); }
  const hx = (xMin + xMax) / 2, hy = (yMin + yMax) / 2, hs = 600;
  el.push({ type: 'LWPOLYLINE', layer: '천정_점검구', flags: 1, color: 2, vertices: [{ x: hx - hs, y: hy - hs }, { x: hx + hs, y: hy - hs }, { x: hx + hs, y: hy + hs }, { x: hx - hs, y: hy + hs }] });
  el.push({ type: 'LINE', layer: '천정_점검구', color: 2, x1: hx - hs, y1: hy - hs, x2: hx + hs, y2: hy + hs });
  el.push({ type: 'LINE', layer: '천정_점검구', color: 2, x1: hx + hs, y1: hy - hs, x2: hx - hs, y2: hy + hs });
  return el;
}

// ---- 지붕 ----
function genRoof(hAxes: HAxis[], vAxes: VAxis[], preset: Preset, roofType: string): DXFEntity[] {
  const { xMin, xMax, yMin, yMax } = extents(hAxes, vAxes);
  const sp = preset.stud, ov = 600;
  const el: any[] = [];
  const ridgeX = (xMin + xMax) / 2;
  el.push({ type: 'LWPOLYLINE', layer: '지붕_처마선', flags: 1, color: 2,
    vertices: [{ x: xMin - ov, y: yMin - ov }, { x: xMax + ov, y: yMin - ov }, { x: xMax + ov, y: yMax + ov }, { x: xMin - ov, y: yMax + ov }] });

  if (roofType === 'gabled') {
    el.push({ type: 'LINE', layer: '지붕_용마루', color: 1, x1: ridgeX, y1: yMin - ov, x2: ridgeX, y2: yMax + ov });
    for (let y = yMin - ov + sp; y < yMax + ov; y += sp) {
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMin - ov, y2: y });
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMax + ov, y2: y });
    }
    for (let y = yMin + sp * 3; y < yMax; y += sp * 3)
      el.push({ type: 'LINE', layer: '지붕_칼라타이', color: 8, x1: ridgeX - 600, y1: y, x2: ridgeX + 600, y2: y });
  } else {
    const rL = (yMax - yMin) * 0.6, rY0 = (yMin + yMax) / 2 - rL / 2, rY1 = (yMin + yMax) / 2 + rL / 2;
    el.push({ type: 'LINE', layer: '지붕_용마루', color: 1, x1: ridgeX, y1: rY0, x2: ridgeX, y2: rY1 });
    ([[xMin - ov, yMin - ov], [xMax + ov, yMin - ov], [xMax + ov, yMax + ov], [xMin - ov, yMax + ov]] as number[][])
      .forEach(([cx, cy], i) => el.push({ type: 'LINE', layer: '지붕_귀서까래', color: 1, x1: cx, y1: cy, x2: ridgeX, y2: i < 2 ? rY0 : rY1 }));
    for (let y = rY0 + sp; y < rY1; y += sp) {
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMin - ov, y2: y });
      el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: y, x2: xMax + ov, y2: y });
    }
    [rY0, rY1].forEach((ry, s) => {
      const base = s === 0 ? yMin - ov : yMax + ov;
      for (let x = xMin - ov + sp * 2; x < xMax + ov; x += sp * 2)
        el.push({ type: 'LINE', layer: '지붕_서까래', color: 2, x1: ridgeX, y1: ry, x2: x, y2: base });
    });
  }
  return el;
}

// ============================================================
// MASTER AUTO-GENERATE
// ============================================================
export function autoGenerate(dxfData: DXFData, preset: Preset, settings: GenSettings): GeneratedLayers {
  let { hAxes, vAxes } = extractAxes(dxfData.entities);
  if (hAxes.length < 2 || vAxes.length < 2) {
    const bounds = getBounds(dxfData.entities);
    ({ hAxes, vAxes } = syntheticAxes(bounds, settings.floors));
  }

  const { hOpenings, vOpenings } = detectOpenings(dxfData.entities, hAxes, vAxes);

  const layers: GeneratedLayers = {};
  layers['기초'] = genFoundation(hAxes, vAxes, preset);
  layers['1층_스터드'] = genStuds(hAxes, vAxes, preset, hOpenings, vOpenings, 1);
  if (settings.floors >= 2) {
    layers['2층_바닥'] = genFloor2F(hAxes, vAxes, preset);
    layers['2층_스터드'] = genStuds(hAxes, vAxes, preset, hOpenings, vOpenings, 2);
  }
  layers['천정'] = genCeiling(hAxes, vAxes, preset);
  layers['지붕'] = genRoof(hAxes, vAxes, preset, settings.roofType);
  return layers;
}

// Individual layer generation exports
export { genFoundation, genStuds, genFloor2F, genCeiling, genRoof };
