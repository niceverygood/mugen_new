import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { SnapResult } from './useSnap';
import type { StructuralElement, DXFVertex } from '@mugen/shared';

interface DrawState {
  type: 'line' | 'rect' | 'wall' | 'polyline' | 'dimension';
  points: { x: number; y: number }[];
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
    const { tool, pan, activeStructuralLayer } = store;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawWp = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const sp = snap(rawWp.x, rawWp.y);
    const wp = { x: sp.x, y: sp.y };

    // Middle mouse button or pan tool = always pan
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      panRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }

    // Drawing tools require an active structural layer
    if (!activeStructuralLayer && tool !== 'select') {
      return;
    }

    const color = store.drawColor;

    if (tool === 'line' || tool === 'wall') {
      if (!drawState) {
        setDrawState({ type: tool, points: [wp] });
      } else {
        const p0 = drawState.points[0];
        let x2 = wp.x, y2 = wp.y;

        if (tool === 'wall' || drawState.type === 'wall') {
          const dx = Math.abs(wp.x - p0.x);
          const dy = Math.abs(wp.y - p0.y);
          if (dx > dy) { y2 = p0.y; }
          else { x2 = p0.x; }
        }

        const el: StructuralElement = {
          id: uid(),
          layerType: activeStructuralLayer!,
          entity: { type: 'LINE', layer: activeStructuralLayer!, x1: p0.x, y1: p0.y, x2, y2, color },
        };
        store.addStructuralElement(el);
        setDrawState(null);
      }
    } else if (tool === 'rect') {
      if (!drawState) {
        setDrawState({ type: 'rect', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const el: StructuralElement = {
          id: uid(),
          layerType: activeStructuralLayer!,
          entity: {
            type: 'LWPOLYLINE', layer: activeStructuralLayer!, flags: 1, color,
            vertices: [
              { x: p0.x, y: p0.y }, { x: wp.x, y: p0.y },
              { x: wp.x, y: wp.y }, { x: p0.x, y: wp.y },
            ],
          },
        };
        store.addStructuralElement(el);
        setDrawState(null);
      }
    } else if (tool === 'polyline') {
      if (!drawState) {
        setDrawState({ type: 'polyline', points: [wp] });
      } else {
        // Add point; double-click to finish handled separately
        setDrawState({ ...drawState, points: [...drawState.points, wp] });
      }
    } else if (tool === 'dimension') {
      if (!drawState) {
        setDrawState({ type: 'dimension', points: [wp] });
      } else {
        const p0 = drawState.points[0];
        const dist = Math.round(Math.hypot(wp.x - p0.x, wp.y - p0.y));
        const mx = (p0.x + wp.x) / 2, my = (p0.y + wp.y) / 2;

        store.addStructuralElement({
          id: uid(), layerType: activeStructuralLayer!,
          entity: { type: 'LINE', layer: activeStructuralLayer! + '_dim', x1: p0.x, y1: p0.y, x2: wp.x, y2: wp.y, color },
        });
        store.addStructuralElement({
          id: uid(), layerType: activeStructuralLayer!,
          entity: { type: 'TEXT', layer: activeStructuralLayer! + '_dim', x: mx, y: my + 100, text: `${dist}`, color },
        });
        setDrawState(null);
      }
    } else if (tool === 'text') {
      const text = prompt('텍스트 입력:');
      if (text && activeStructuralLayer) {
        store.addStructuralElement({
          id: uid(), layerType: activeStructuralLayer,
          entity: { type: 'TEXT', layer: activeStructuralLayer, x: wp.x, y: wp.y, text, color },
        });
      }
    }
  }, [drawState, canvasToWorld, snap, canvasRef]);

  // Double-click to finish polyline
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const store = useEditorStore.getState();
    if (!drawState || drawState.type !== 'polyline') return;
    if (drawState.points.length < 2) { setDrawState(null); return; }
    if (!store.activeStructuralLayer) return;

    const el: StructuralElement = {
      id: uid(),
      layerType: store.activeStructuralLayer,
      entity: {
        type: 'LWPOLYLINE', layer: store.activeStructuralLayer, flags: 0,
        color: store.drawColor,
        vertices: drawState.points as DXFVertex[],
      },
    };
    store.addStructuralElement(el);
    setDrawState(null);
  }, [drawState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawWp = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    setWorldPos(rawWp);

    const sp = snap(rawWp.x, rawWp.y);
    setSnappedPos(sp);

    if (isPanning && panRef.current) {
      useEditorStore.getState().setPan({
        x: panRef.current.px + e.clientX - panRef.current.mx,
        y: panRef.current.py + e.clientY - panRef.current.my,
      });
    }
  }, [isPanning, canvasToWorld, snap, canvasRef]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panRef.current = null;
  }, []);

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      useEditorStore.getState().setZoom(z => z * (e.deltaY > 0 ? 0.88 : 1.13));
    };
    parent.addEventListener('wheel', onWheel, { passive: false });
    return () => parent.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDrawState(null);
  }, []);

  // Compute drawing preview data for canvas
  const drawingPreview = drawState ? {
    type: drawState.type,
    points: drawState.points,
    cursor: snappedPos,
  } : null;

  return {
    worldPos, snappedPos, drawingPreview, isPanning,
    setDrawState,
    handleMouseDown, handleMouseMove, handleMouseUp, handleRightClick, handleDoubleClick,
  };
}
