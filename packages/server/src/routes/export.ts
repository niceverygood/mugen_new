import { Router } from 'express';
import type { GeneratedLayers, DXFEntity } from '@mugen/shared';
import { exportDXF } from '../services/dxf-exporter.js';

export const exportRouter = Router();

exportRouter.post('/export', (req, res) => {
  const { layers, originalEntities } = req.body as {
    layers: GeneratedLayers;
    originalEntities?: DXFEntity[];
  };

  if (!layers) {
    res.status(400).json({ error: 'Missing layers' });
    return;
  }

  const dxfString = exportDXF(layers, originalEntities || []);

  res.setHeader('Content-Type', 'application/dxf');
  res.setHeader('Content-Disposition', 'attachment; filename="structural_plan.dxf"');
  res.send(dxfString);
});
