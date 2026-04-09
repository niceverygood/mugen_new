import type { DXFData, GeneratedLayers, Preset, GenSettings } from '@mugen/shared';

const BASE = '/api';

export async function uploadDXF(file: File): Promise<{ filename: string; originalName: string; size: number }> {
  const fd = new FormData();
  fd.append('dxf', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function parseDXFFile(filename: string): Promise<DXFData> {
  const res = await fetch(`${BASE}/parse/${filename}`);
  if (!res.ok) throw new Error('Parse failed');
  return res.json();
}

export async function generateStructural(dxfData: DXFData, preset: Preset, settings: GenSettings): Promise<GeneratedLayers> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dxfData, preset, settings }),
  });
  if (!res.ok) throw new Error('Generation failed');
  const data = await res.json();
  return data.layers;
}

export async function exportDXF(layers: GeneratedLayers, originalEntities?: any[]): Promise<Blob> {
  const res = await fetch(`${BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layers, originalEntities }),
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}
