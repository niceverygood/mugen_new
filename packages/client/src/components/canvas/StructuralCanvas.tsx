import { useRef, useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useTransform } from './useTransform';
import { useDrawingTools } from './useDrawingTools';
import { useSnap } from './useSnap';
import { aciToHex, GEN_LAYER_CFG, LAYER_ORDER, PALETTE, STRUCTURAL_LAYERS } from '@mugen/shared';
import type { StructuralLayerType } from '@mugen/shared';

export default function StructuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dxfData, fileName, visibleLayers, zoom, pan, tool,
    generatedLayers, genVisible, activeStructuralLayer,
    gridAxes, showGrid, structuralElements, structuralLayerVisible,
    overlayOpacity, setZoom, setPan,
  } = useEditorStore();

  const layerColors = useMemo(() => {
    if (!dxfData) return {};
    return Object.fromEntries(dxfData.layers.map((l, i) => [l, PALETTE[i % PALETTE.length]]));
  }, [dxfData]);

  const generatedEntities = useMemo(
    () => Object.values(generatedLayers).flat(),
    [generatedLayers],
  );

  const { getTransform, canvasToWorld, transformRef } = useTransform(
    canvasRef, containerRef,
    dxfData?.entities || [],
    generatedEntities,
    zoom, pan,
  );

  const { snap } = useSnap();

  const {
    worldPos, snappedPos, drawingPreview, isPanning, setDrawState,
    handleMouseDown, handleMouseMove, handleMouseUp, handleRightClick, handleDoubleClick,
  } = useDrawingTools(canvasRef, canvasToWorld, snap);

  // Key events
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawState(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDrawState]);

  // Track container size for re-rendering
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        const w = Math.floor(width), h = Math.floor(height);
        if (w > 0 && h > 0) setCanvasSize(prev => (prev.w === w && prev.h === h) ? prev : { w, h });
      }
    };
    update();
    // Poll briefly to catch layout settling
    const id = setInterval(update, 200);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { clearInterval(id); ro.disconnect(); };
  }, []);

  // RENDER
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = canvasSize.w || Math.floor(container.getBoundingClientRect().width);
    const H = canvasSize.h || Math.floor(container.getBoundingClientRect().height);
    if (!W || !H) return;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    if (!dxfData || !dxfData.entities.length) {
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = '#484f58';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DXF 파일을 업로드하세요', W / 2, H / 2 - 10);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#30363d';
      ctx.fillText('의장도면 (.dxf)', W / 2, H / 2 + 14);
      ctx.textAlign = 'left';
      return;
    }

    const tf = getTransform();
    if (!tf) return;

    const { scale, ox, oy, bounds } = tf;
    const tx = (wx: number) => (wx - bounds.x0) * scale + ox;
    const ty = (wy: number) => -(wy - bounds.y0) * scale + oy;

    const drawEntity = (ctx: CanvasRenderingContext2D, e: any, color: string, lw: number, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      try {
        switch (e.type) {
          case 'LINE':
            ctx.moveTo(tx(e.x1), ty(e.y1));
            ctx.lineTo(tx(e.x2), ty(e.y2));
            ctx.stroke();
            break;
          case 'CIRCLE':
            if (e.r > 0) { ctx.arc(tx(e.x), ty(e.y), e.r * scale, 0, Math.PI * 2); ctx.stroke(); }
            break;
          case 'ARC':
            if (e.r > 0) {
              const sa = -e.sa * Math.PI / 180, ea = -e.ea * Math.PI / 180;
              ctx.arc(tx(e.x), ty(e.y), e.r * scale, sa, ea, sa > ea);
              ctx.stroke();
            }
            break;
          case 'LWPOLYLINE':
          case 'POLYLINE':
            if (!e.vertices || e.vertices.length < 2) break;
            ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
            for (let i = 1; i < e.vertices.length; i++)
              ctx.lineTo(tx(e.vertices[i].x), ty(e.vertices[i].y));
            if (e.flags & 1) ctx.closePath();
            ctx.stroke();
            break;
          case 'TEXT':
          case 'MTEXT':
            if (e.text && e.x !== undefined) {
              ctx.font = `${Math.max(7, 9)}px monospace`;
              ctx.globalAlpha = alpha * 0.5;
              ctx.fillText(e.text.replace(/\\[^;]+;/g, '').slice(0, 24), tx(e.x || 0), ty(e.y || 0));
            }
            break;
        }
      } catch { /* skip */ }
      ctx.globalAlpha = 1;
    };

    // Draw original DXF (dimmed when structural layers present)
    const hasGen = Object.keys(generatedLayers).length > 0;
    dxfData.entities.forEach(e => {
      if (!visibleLayers.has(e.layer)) return;
      const eAny = e as any;
      const color = eAny.color
        ? (aciToHex(eAny.color) || layerColors[e.layer] || '#4a9eff')
        : (layerColors[e.layer] || '#4a9eff');
      drawEntity(ctx, e, color, 0.7, hasGen ? overlayOpacity : 0.82);
    });

    // Draw grid axes
    if (gridAxes && showGrid) {
      ctx.setLineDash([8, 4]);
      gridAxes.hAxes.forEach((a, i) => {
        ctx.strokeStyle = a.isExterior ? '#ff6b6b' : '#4ecdc4';
        ctx.lineWidth = a.isExterior ? 1.0 : 0.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(tx(a.x0 - 500), ty(a.y));
        ctx.lineTo(tx(a.x1 + 500), ty(a.y));
        ctx.stroke();
        // Label
        ctx.font = '10px monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.globalAlpha = 0.7;
        ctx.fillText(`Y${i}`, tx(a.x0 - 800), ty(a.y) + 3);
      });
      gridAxes.vAxes.forEach((a, i) => {
        ctx.strokeStyle = a.isExterior ? '#ff6b6b' : '#4ecdc4';
        ctx.lineWidth = a.isExterior ? 1.0 : 0.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(tx(a.x), ty(a.y0 - 500));
        ctx.lineTo(tx(a.x), ty(a.y1 + 500));
        ctx.stroke();
        ctx.font = '10px monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.globalAlpha = 0.7;
        ctx.fillText(`X${i}`, tx(a.x) - 5, ty(a.y1 + 800));
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Draw generated layers
    LAYER_ORDER.forEach(layerName => {
      if (!generatedLayers[layerName]) return;
      if (!genVisible[layerName]) return;
      const cfg = GEN_LAYER_CFG[layerName];
      if (!cfg) return;
      const isActive = activeStructuralLayer !== null;
      const alpha = isActive ? 0.4 : 0.85;
      generatedLayers[layerName].forEach(e => drawEntity(ctx, e, cfg.color, 0.9, alpha));
    });

    // Draw manual structural elements
    Object.entries(structuralElements).forEach(([lt, elements]) => {
      const layerType = lt as StructuralLayerType;
      if (!structuralLayerVisible[layerType]) return;
      const cfg = STRUCTURAL_LAYERS[layerType];
      const isActive = activeStructuralLayer === layerType;
      const alpha = isActive ? 0.95 : (activeStructuralLayer !== null ? 0.25 : 0.8);
      const lw = isActive ? 2.0 : 1.0;
      elements.forEach(el => {
        const eColor = (el.entity as any).color ? (aciToHex((el.entity as any).color) || cfg.color) : cfg.color;
        drawEntity(ctx, el.entity, eColor, lw, alpha);
      });
    });

    // Snap indicator
    if (snappedPos.snappedX || snappedPos.snappedY) {
      const sx = tx(snappedPos.x), sy = ty(snappedPos.y);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.stroke();
      if (snappedPos.snappedX && snappedPos.snappedY) {
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy);
        ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Drawing preview
    const previewColor = activeStructuralLayer ? STRUCTURAL_LAYERS[activeStructuralLayer].color : '#2f81f7';
    if (drawingPreview) {
      ctx.strokeStyle = previewColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();

      const pts = drawingPreview.points;
      const cur = snappedPos;

      if (drawingPreview.type === 'rect' && pts.length > 0) {
        const x1s = tx(pts[0].x), y1s = ty(pts[0].y);
        const x2s = tx(cur.x), y2s = ty(cur.y);
        ctx.rect(Math.min(x1s, x2s), Math.min(y1s, y2s), Math.abs(x2s - x1s), Math.abs(y2s - y1s));
      } else if (drawingPreview.type === 'wall' && pts.length > 0) {
        // Constrained to H/V
        const p0 = pts[0];
        const dx = Math.abs(cur.x - p0.x), dy = Math.abs(cur.y - p0.y);
        const endX = dx > dy ? cur.x : p0.x;
        const endY = dx > dy ? p0.y : cur.y;
        ctx.moveTo(tx(p0.x), ty(p0.y));
        ctx.lineTo(tx(endX), ty(endY));
        // Show wall thickness (105mm)
        const wt = 105 / 2;
        if (dx > dy) {
          ctx.moveTo(tx(p0.x), ty(p0.y - wt));
          ctx.lineTo(tx(endX), ty(p0.y - wt));
          ctx.moveTo(tx(p0.x), ty(p0.y + wt));
          ctx.lineTo(tx(endX), ty(p0.y + wt));
        } else {
          ctx.moveTo(tx(p0.x - wt), ty(p0.y));
          ctx.lineTo(tx(p0.x - wt), ty(endY));
          ctx.moveTo(tx(p0.x + wt), ty(p0.y));
          ctx.lineTo(tx(p0.x + wt), ty(endY));
        }
      } else if (drawingPreview.type === 'circle' && pts.length > 0) {
        const r = Math.hypot(cur.x - pts[0].x, cur.y - pts[0].y);
        ctx.arc(tx(pts[0].x), ty(pts[0].y), r * scale, 0, Math.PI * 2);
        ctx.font = '10px monospace'; ctx.fillStyle = previewColor;
        ctx.fillText(`R=${Math.round(r)}`, tx(pts[0].x) + 8, ty(pts[0].y) - 8);
      } else if (drawingPreview.type === 'arc') {
        if (pts.length === 1) {
          // Show radius line
          const r = Math.hypot(cur.x - pts[0].x, cur.y - pts[0].y);
          ctx.arc(tx(pts[0].x), ty(pts[0].y), r * scale, 0, Math.PI * 2);
        } else if (pts.length === 2) {
          const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const sa = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
          const ea = Math.atan2(cur.y - pts[0].y, cur.x - pts[0].x);
          ctx.arc(tx(pts[0].x), ty(pts[0].y), r * scale, -sa, -ea, sa > ea);
        }
      } else if (drawingPreview.type === 'polyline') {
        if (pts.length > 0) {
          ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
          for (let i = 1; i < pts.length; i++) ctx.lineTo(tx(pts[i].x), ty(pts[i].y));
          ctx.lineTo(tx(cur.x), ty(cur.y));
        }
      } else if ((drawingPreview.type === 'xcross' || drawingPreview.type === 'joists') && pts.length > 0) {
        const x1s = tx(pts[0].x), y1s = ty(pts[0].y);
        const x2s = tx(cur.x), y2s = ty(cur.y);
        ctx.rect(Math.min(x1s, x2s), Math.min(y1s, y2s), Math.abs(x2s - x1s), Math.abs(y2s - y1s));
        if (drawingPreview.type === 'xcross') {
          ctx.moveTo(x1s, y1s); ctx.lineTo(x2s, y2s);
          ctx.moveTo(x2s, y1s); ctx.lineTo(x1s, y2s);
        }
      } else if ((drawingPreview.type === 'dwall' || drawingPreview.type === 'studs') && pts.length > 0) {
        const p0 = pts[0];
        const dx = Math.abs(cur.x - p0.x), dy = Math.abs(cur.y - p0.y);
        const hw = 52.5; // half wall thickness
        if (dx > dy) {
          ctx.moveTo(tx(p0.x), ty(p0.y - hw)); ctx.lineTo(tx(cur.x), ty(p0.y - hw));
          ctx.moveTo(tx(p0.x), ty(p0.y + hw)); ctx.lineTo(tx(cur.x), ty(p0.y + hw));
        } else {
          ctx.moveTo(tx(p0.x - hw), ty(p0.y)); ctx.lineTo(tx(p0.x - hw), ty(cur.y));
          ctx.moveTo(tx(p0.x + hw), ty(p0.y)); ctx.lineTo(tx(p0.x + hw), ty(cur.y));
        }
      } else if (drawingPreview.type === 'dimension' && pts.length > 0) {
        ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
        ctx.lineTo(tx(cur.x), ty(cur.y));
        const dist = Math.round(Math.hypot(cur.x - pts[0].x, cur.y - pts[0].y));
        ctx.font = '11px monospace'; ctx.fillStyle = previewColor;
        const mx = (tx(pts[0].x) + tx(cur.x)) / 2;
        const my = (ty(pts[0].y) + ty(cur.y)) / 2;
        ctx.fillText(`${dist}mm`, mx + 5, my - 5);
      } else if (drawingPreview.type === 'label' && pts.length > 0) {
        ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
        ctx.lineTo(tx(cur.x), ty(cur.y));
        ctx.arc(tx(pts[0].x), ty(pts[0].y), 4, 0, Math.PI * 2);
      } else if (pts.length > 0) {
        ctx.moveTo(tx(pts[0].x), ty(pts[0].y));
        ctx.lineTo(tx(cur.x), ty(cur.y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }, [dxfData, zoom, pan, visibleLayers, layerColors, generatedLayers, genVisible,
    activeStructuralLayer, gridAxes, showGrid, structuralElements, structuralLayerVisible,
    overlayOpacity, drawingPreview, snappedPos, worldPos, tool, getTransform, canvasSize]);

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onContextMenu={handleRightClick}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 44, right: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          ['+', () => setZoom(z => Math.min(40, z * 1.3))],
          ['\u2212', () => setZoom(z => Math.max(0.05, z * 0.77))],
          ['\u2299', () => { setZoom(() => 1); setPan({ x: 0, y: 0 }); }],
        ].map(([l, fn]) => (
          <button key={l as string} onClick={fn as () => void}
            style={{ width: 28, height: 28, background: '#161b22', border: '1px solid #21262d', color: '#8b949e', borderRadius: 5, cursor: 'pointer', fontSize: 14 }}>
            {l as string}
          </button>
        ))}
      </div>

      {/* Coords */}
      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
        <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#8b949e', border: '1px solid #21262d' }}>
          X: {snappedPos.x.toLocaleString()} / Y: {snappedPos.y.toLocaleString()} mm
          {(snappedPos.snappedX || snappedPos.snappedY) && ' [SNAP]'}
        </div>
        <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#8b949e', border: '1px solid #21262d' }}>
          {Math.round(zoom * 100)}%
        </div>
        {fileName && (
          <div style={{ background: 'rgba(22,27,34,0.93)', padding: '3px 10px', borderRadius: 4, fontSize: 10, color: '#58a6ff', border: '1px solid #21262d' }}>
            {fileName}
          </div>
        )}
      </div>
    </div>
  );
}
