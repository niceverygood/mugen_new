import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { SnapResult } from './useSnap';
import type { StructuralElement, DXFVertex } from '@mugen/shared';

interface DrawState {
  type: string;
  points: { x: number; y: number }[];
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function addEl(layer: string, entity: any): StructuralElement {
  return { id: uid(), layerType: useEditorStore.getState().activeStructuralLayer!, entity: { ...entity, layer } };
}

export function useDrawingTools(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasToWorld: (cx: number, cy: number) => { x: number; y: number },
  snap: (wx: number, wy: number) => SnapResult,
) {
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 });
  const [snappedPos, setSnappedPos] = useState<SnapResult>({ x: 0, y: 0, snappedX: false, snappedY: false });
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const store = useEditorStore.getState();
    const { tool, pan, activeStructuralLayer, drawColor } = store;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawWp = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const sp = snap(rawWp.x, rawWp.y);
    const wp = { x: sp.x, y: sp.y };
    const color = drawColor;
    const lyr = activeStructuralLayer || 'foundation';

    // Pan
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      panRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }

    if (!activeStructuralLayer && tool !== 'select') return;

    // ---- Line / Wall ----
    if (tool === 'line' || tool === 'wall') {
      if (!drawState) {
        setDrawState({ type: tool, points: [wp] });
      } else {
        const p0 = drawState.points[0];
        let x2 = wp.x, y2 = wp.y;
        if (tool === 'wall' || drawState.type === 'wall') {
          const dx = Math.abs(wp.x - p0.x), dy = Math.abs(wp.y - p0.y);
          if (dx > dy) y2 = p0.y; else x2 = p0.x;
        }
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr, x1: p0.x, y1: p0.y, x2, y2, color } });
        setDrawState(null);
      }
    }
    // ---- Rect ----
    else if (tool === 'rect') {
      if (!drawState) {
        setDrawState({ type: 'rect', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LWPOLYLINE', layer: lyr, flags: 1, color,
            vertices: [{ x: p0.x, y: p0.y }, { x: wp.x, y: p0.y }, { x: wp.x, y: wp.y }, { x: p0.x, y: wp.y }] } });
        setDrawState(null);
      }
    }
    // ---- Circle ----
    else if (tool === 'circle') {
      if (!drawState) {
        setDrawState({ type: 'circle', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const r = Math.round(Math.hypot(wp.x - p0.x, wp.y - p0.y));
        if (r > 0) {
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'CIRCLE', layer: lyr, x: p0.x, y: p0.y, r, color } });
        }
        setDrawState(null);
      }
    }
    // ---- Arc ----
    else if (tool === 'arc') {
      if (!drawState) {
        setDrawState({ type: 'arc', points: [wp] }); // center
      } else if (drawState.points.length === 1) {
        setDrawState({ ...drawState, points: [...drawState.points, wp] }); // start angle point
      } else {
        const center = drawState.points[0];
        const startPt = drawState.points[1];
        const r = Math.round(Math.hypot(startPt.x - center.x, startPt.y - center.y));
        const sa = Math.atan2(startPt.y - center.y, startPt.x - center.x) * 180 / Math.PI;
        const ea = Math.atan2(wp.y - center.y, wp.x - center.x) * 180 / Math.PI;
        if (r > 0) {
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'ARC', layer: lyr, x: center.x, y: center.y, r, sa, ea, color } });
        }
        setDrawState(null);
      }
    }
    // ---- Polyline ----
    else if (tool === 'polyline') {
      if (!drawState) {
        setDrawState({ type: 'polyline', points: [wp] });
      } else {
        setDrawState({ ...drawState, points: [...drawState.points, wp] });
      }
    }
    // ---- Double Wall (벽두께 평행선) ----
    else if (tool === 'dwall') {
      if (!drawState) {
        setDrawState({ type: 'dwall', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const dx = Math.abs(wp.x - p0.x), dy = Math.abs(wp.y - p0.y);
        const wt = store.preset.wallType === 'Wood' ? 105 : 75;
        const hw = wt / 2;
        // Constrain to H/V
        if (dx > dy) {
          const y = p0.y;
          const x1 = Math.min(p0.x, wp.x), x2 = Math.max(p0.x, wp.x);
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1, y1: y - hw, x2, y2: y - hw, color } });
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1, y1: y + hw, x2, y2: y + hw, color } });
        } else {
          const x = p0.x;
          const y1 = Math.min(p0.y, wp.y), y2 = Math.max(p0.y, wp.y);
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: x - hw, y1, x2: x - hw, y2, color } });
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: x + hw, y1, x2: x + hw, y2, color } });
        }
        setDrawState(null);
      }
    }
    // ---- Stud Array (스터드 연속배치) ----
    else if (tool === 'studs') {
      if (!drawState) {
        setDrawState({ type: 'studs', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const sp = store.preset.stud || 455;
        const wt = store.preset.wallType === 'Wood' ? 105 : 75;
        const hw = wt / 2;
        const dx = Math.abs(wp.x - p0.x), dy = Math.abs(wp.y - p0.y);
        if (dx > dy) {
          // Horizontal wall: studs are vertical ticks
          const y = p0.y;
          const xStart = Math.min(p0.x, wp.x), xEnd = Math.max(p0.x, wp.x);
          // Top/bottom plates
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: xStart, y1: y - hw, x2: xEnd, y2: y - hw, color } });
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: xStart, y1: y + hw, x2: xEnd, y2: y + hw, color } });
          // Studs at spacing
          for (let x = xStart; x <= xEnd; x += sp) {
            store.addStructuralElement({ id: uid(), layerType: lyr,
              entity: { type: 'LINE', layer: lyr, x1: x, y1: y - hw, x2: x, y2: y + hw, color } });
          }
          // End stud
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: xEnd, y1: y - hw, x2: xEnd, y2: y + hw, color } });
        } else {
          // Vertical wall
          const x = p0.x;
          const yStart = Math.min(p0.y, wp.y), yEnd = Math.max(p0.y, wp.y);
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: x - hw, y1: yStart, x2: x - hw, y2: yEnd, color } });
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: x + hw, y1: yStart, x2: x + hw, y2: yEnd, color } });
          for (let y = yStart; y <= yEnd; y += sp) {
            store.addStructuralElement({ id: uid(), layerType: lyr,
              entity: { type: 'LINE', layer: lyr, x1: x - hw, y1: y, x2: x + hw, y2: y, color } });
          }
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr, x1: x - hw, y1: yEnd, x2: x + hw, y2: yEnd, color } });
        }
        setDrawState(null);
      }
    }
    // ---- Joist Array (장선 연속배치) ----
    else if (tool === 'joists') {
      if (!drawState) {
        setDrawState({ type: 'joists', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const sp = store.preset.stud || 455;
        const x1 = Math.min(p0.x, wp.x), x2 = Math.max(p0.x, wp.x);
        const y1 = Math.min(p0.y, wp.y), y2 = Math.max(p0.y, wp.y);
        const W = x2 - x1, H = y2 - y1;
        // Perimeter
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LWPOLYLINE', layer: lyr, flags: 1, color,
            vertices: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] } });
        // Joists perpendicular to longer span
        if (W >= H) {
          for (let y = y1 + sp; y < y2; y += sp)
            store.addStructuralElement({ id: uid(), layerType: lyr,
              entity: { type: 'LINE', layer: lyr, x1, y1: y, x2, y2: y, color } });
        } else {
          for (let x = x1 + sp; x < x2; x += sp)
            store.addStructuralElement({ id: uid(), layerType: lyr,
              entity: { type: 'LINE', layer: lyr, x1: x, y1, x2: x, y2, color } });
        }
        setDrawState(null);
      }
    }
    // ---- X-Cross (점검구/독립기초 표시) ----
    else if (tool === 'xcross') {
      if (!drawState) {
        setDrawState({ type: 'xcross', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        // Rect + X
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LWPOLYLINE', layer: lyr, flags: 1, color,
            vertices: [{ x: p0.x, y: p0.y }, { x: wp.x, y: p0.y }, { x: wp.x, y: wp.y }, { x: p0.x, y: wp.y }] } });
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr, x1: p0.x, y1: p0.y, x2: wp.x, y2: wp.y, color } });
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr, x1: wp.x, y1: p0.y, x2: p0.x, y2: wp.y, color } });
        setDrawState(null);
      }
    }
    // ---- Anchor Bolt symbol (앵커볼트) ----
    else if (tool === 'bolt') {
      const r = 50; // 50mm radius circle
      store.addStructuralElement({ id: uid(), layerType: lyr,
        entity: { type: 'CIRCLE', layer: lyr, x: wp.x, y: wp.y, r, color } });
      // Small cross inside
      store.addStructuralElement({ id: uid(), layerType: lyr,
        entity: { type: 'LINE', layer: lyr, x1: wp.x - r * 0.7, y1: wp.y, x2: wp.x + r * 0.7, y2: wp.y, color } });
      store.addStructuralElement({ id: uid(), layerType: lyr,
        entity: { type: 'LINE', layer: lyr, x1: wp.x, y1: wp.y - r * 0.7, x2: wp.x, y2: wp.y + r * 0.7, color } });
    }
    // ---- Hardware symbol (금물 마크) ----
    else if (tool === 'hardware') {
      const s = 80;
      // Triangle mark
      store.addStructuralElement({ id: uid(), layerType: lyr,
        entity: { type: 'LWPOLYLINE', layer: lyr, flags: 1, color,
          vertices: [{ x: wp.x, y: wp.y + s }, { x: wp.x - s * 0.866, y: wp.y - s * 0.5 }, { x: wp.x + s * 0.866, y: wp.y - s * 0.5 }] } });
    }
    // ---- Dimension ----
    else if (tool === 'dimension') {
      if (!drawState) {
        setDrawState({ type: 'dimension', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const dist = Math.round(Math.hypot(wp.x - p0.x, wp.y - p0.y));
        const mx = (p0.x + wp.x) / 2, my = (p0.y + wp.y) / 2;
        // End ticks
        const dx = wp.x - p0.x, dy = wp.y - p0.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len * 100, ny = dx / len * 100; // perpendicular
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr + '_dim', x1: p0.x + nx, y1: p0.y + ny, x2: p0.x - nx, y2: p0.y - ny, color } });
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr + '_dim', x1: p0.x, y1: p0.y, x2: wp.x, y2: wp.y, color } });
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'LINE', layer: lyr + '_dim', x1: wp.x + nx, y1: wp.y + ny, x2: wp.x - nx, y2: wp.y - ny, color } });
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'TEXT', layer: lyr + '_dim', x: mx, y: my + 150, text: `${dist}`, color } });
        setDrawState(null);
      }
    }
    // ---- Text ----
    else if (tool === 'text') {
      const text = prompt('텍스트 입력:');
      if (text) {
        store.addStructuralElement({ id: uid(), layerType: lyr,
          entity: { type: 'TEXT', layer: lyr, x: wp.x, y: wp.y, text, color } });
      }
    }
    // ---- Label (텍스트 + 지시선) ----
    else if (tool === 'label') {
      if (!drawState) {
        setDrawState({ type: 'label', points: [wp] }); // point to label
      } else {
        const p0 = drawState.points[0]; // target point
        const text = prompt('라벨 텍스트:');
        if (text) {
          // Leader line
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr + '_anno', x1: p0.x, y1: p0.y, x2: wp.x, y2: wp.y, color } });
          // Horizontal tail
          const tailLen = 500;
          const dir = wp.x >= p0.x ? 1 : -1;
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'LINE', layer: lyr + '_anno', x1: wp.x, y1: wp.y, x2: wp.x + tailLen * dir, y2: wp.y, color } });
          // Text above tail
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'TEXT', layer: lyr + '_anno', x: wp.x + 50 * dir, y: wp.y + 100, text, color } });
          // Arrow at start (small circle)
          store.addStructuralElement({ id: uid(), layerType: lyr,
            entity: { type: 'CIRCLE', layer: lyr + '_anno', x: p0.x, y: p0.y, r: 30, color } });
        }
        setDrawState(null);
      }
    }
  }, [drawState, canvasToWorld, snap, canvasRef]);

  // Double-click to finish polyline
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const store = useEditorStore.getState();
    if (!drawState || drawState.type !== 'polyline') return;
    if (drawState.points.length < 2 || !store.activeStructuralLayer) { setDrawState(null); return; }
    store.addStructuralElement({ id: uid(), layerType: store.activeStructuralLayer,
      entity: { type: 'LWPOLYLINE', layer: store.activeStructuralLayer, flags: 0, color: store.drawColor,
        vertices: drawState.points as DXFVertex[] } });
    setDrawState(null);
  }, [drawState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawWp = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    setWorldPos(rawWp);
    setSnappedPos(snap(rawWp.x, rawWp.y));
    if (isPanning && panRef.current) {
      useEditorStore.getState().setPan({
        x: panRef.current.px + e.clientX - panRef.current.mx,
        y: panRef.current.py + e.clientY - panRef.current.my,
      });
    }
  }, [isPanning, canvasToWorld, snap, canvasRef]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); panRef.current = null; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); useEditorStore.getState().setZoom(z => z * (e.deltaY > 0 ? 0.88 : 1.13)); };
    parent.addEventListener('wheel', onWheel, { passive: false });
    return () => parent.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  const handleRightClick = useCallback((e: React.MouseEvent) => { e.preventDefault(); setDrawState(null); }, []);

  const drawingPreview = drawState ? { type: drawState.type, points: drawState.points, cursor: snappedPos } : null;

  return { worldPos, snappedPos, drawingPreview, isPanning, setDrawState,
    handleMouseDown, handleMouseMove, handleMouseUp, handleRightClick, handleDoubleClick };
}
