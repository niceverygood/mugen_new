import { useCallback, useRef } from 'react';
import type { DXFEntity, Bounds } from '@mugen/shared';
import { getBounds } from '@mugen/shared';

export interface Transform {
  scale: number;
  ox: number;
  oy: number;
  bounds: Bounds;
}

export function useTransform(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  entities: DXFEntity[],
  generatedEntities: DXFEntity[],
  zoom: number,
  pan: { x: number; y: number },
) {
  const transformRef = useRef<Transform | null>(null);

  const getTransform = useCallback((): Transform | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !entities.length) return null;

    const W = canvas.width, H = canvas.height;
    const allEnt = [...entities, ...generatedEntities];
    const bounds = getBounds(allEnt.length ? allEnt : entities);
    const dw = bounds.x1 - bounds.x0, dh = bounds.y1 - bounds.y0;
    if (dw <= 0 || dh <= 0) return null;

    const scale = Math.min(W * 0.87 / dw, H * 0.87 / dh) * zoom;
    const ox = (W - dw * scale) / 2 + pan.x;
    const oy = H - (H - dh * scale) / 2 + pan.y;

    const t = { scale, ox, oy, bounds };
    transformRef.current = t;
    return t;
  }, [canvasRef, containerRef, entities, generatedEntities, zoom, pan]);

  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const t = transformRef.current;
    if (!t) return { x: 0, y: 0 };
    return {
      x: Math.round((cx - t.ox) / t.scale + t.bounds.x0),
      y: Math.round(-(cy - t.oy) / t.scale + t.bounds.y0),
    };
  }, []);

  return { getTransform, canvasToWorld, transformRef };
}
