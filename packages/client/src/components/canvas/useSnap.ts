import { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snapType?: 'axis' | 'intersection' | 'grid';
}

export function useSnap() {
  const { gridAxes, snapEnabled, snapDistance } = useEditorStore();

  const snap = useCallback((wx: number, wy: number): SnapResult => {
    if (!snapEnabled || !gridAxes) return { x: wx, y: wy, snappedX: false, snappedY: false };

    let sx = wx, sy = wy;
    let snappedX = false, snappedY = false;
    let snapType: SnapResult['snapType'];
    const sd = snapDistance;

    // Snap to vertical axes (snap X)
    for (const a of gridAxes.vAxes) {
      if (Math.abs(wx - a.x) < sd) {
        sx = a.x;
        snappedX = true;
        break;
      }
    }

    // Snap to horizontal axes (snap Y)
    for (const a of gridAxes.hAxes) {
      if (Math.abs(wy - a.y) < sd) {
        sy = a.y;
        snappedY = true;
        break;
      }
    }

    if (snappedX && snappedY) snapType = 'intersection';
    else if (snappedX || snappedY) snapType = 'axis';

    // Snap to module grid (455mm, 910mm) if not snapped to axes
    const moduleSize = 455;
    if (!snappedX) {
      const nearestX = Math.round(wx / moduleSize) * moduleSize;
      if (Math.abs(wx - nearestX) < sd / 2) {
        sx = nearestX;
        snappedX = true;
        snapType = 'grid';
      }
    }
    if (!snappedY) {
      const nearestY = Math.round(wy / moduleSize) * moduleSize;
      if (Math.abs(wy - nearestY) < sd / 2) {
        sy = nearestY;
        snappedY = true;
        snapType = 'grid';
      }
    }

    return { x: sx, y: sy, snappedX, snappedY, snapType };
  }, [gridAxes, snapEnabled, snapDistance]);

  return { snap };
}
