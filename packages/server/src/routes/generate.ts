import { Router } from 'express';
import type { DXFData, Preset, GenSettings } from '@mugen/shared';
import { autoGenerate } from '../services/auto-generator.js';

export const generateRouter: ReturnType<typeof Router> = Router();

generateRouter.post('/generate', (req, res) => {
  const { dxfData, preset, settings } = req.body as {
    dxfData: DXFData;
    preset: Preset;
    settings: GenSettings;
  };

  if (!dxfData || !preset || !settings) {
    res.status(400).json({ error: 'Missing dxfData, preset, or settings' });
    return;
  }

  const layers = autoGenerate(dxfData, preset, settings);
  res.json({ layers });
});
