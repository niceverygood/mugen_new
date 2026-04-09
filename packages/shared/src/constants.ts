import type { GenerateLayerConfig, StructuralLayerType } from './types.js';

// ACI (AutoCAD Color Index) map
export const ACI: Record<number, string> = {
  1: '#FF2020', 2: '#FFFF00', 3: '#00D000', 4: '#00CCCC',
  5: '#2020FF', 6: '#CC00CC', 7: '#C8C8C8', 8: '#808080',
  9: '#9E9E9E', 10: '#FF6060',
  30: '#FF8000', 40: '#FFBF00', 130: '#00FFCC', 140: '#0099FF', 200: '#CC00FF',
};

export const aciToHex = (n: number): string | null =>
  n === 7 ? '#BBBBBB' : ACI[n] || null;

// Structural layer configuration (6 types for structural planning)
export const STRUCTURAL_LAYERS: Record<StructuralLayerType, GenerateLayerConfig> = {
  foundation: { color: '#FF6B35', label: '기초 (Foundation)', labelJa: '基礎' },
  roof:       { color: '#E8C547', label: '지붕 (Roof)', labelJa: '屋根' },
  stud_1f:    { color: '#2F81F7', label: '1층 스터드 (1F Stud)', labelJa: '1階スタッド' },
  stud_2f:    { color: '#1A7F37', label: '2층 스터드 (2F Stud)', labelJa: '2階スタッド' },
  floor_2f:   { color: '#8957E5', label: '2층 바닥 (2F Floor)', labelJa: '2階床' },
  ceiling:    { color: '#BF4B8A', label: '천장 (Ceiling)', labelJa: '天井' },
};

export const STRUCTURAL_LAYER_ORDER: StructuralLayerType[] = [
  'foundation', 'stud_1f', 'floor_2f', 'stud_2f', 'ceiling', 'roof',
];

// Generated sub-layer name → structural layer type mapping
export const GEN_LAYER_TO_STRUCTURAL: Record<string, StructuralLayerType> = {
  '기초': 'foundation',
  '토대': 'foundation',
  '1층_스터드': 'stud_1f',
  '2층_바닥': 'floor_2f',
  '2층_스터드': 'stud_2f',
  '1층_지붕': 'roof',
  '천정': 'ceiling',
  '지붕벽': 'roof',
  '지붕': 'roof',
};

// Legacy gen layer config (for auto-generator compatibility)
export const GEN_LAYER_CFG: Record<string, { color: string; label: string }> = {
  '기초':       { color: '#d4720a', label: '기초 (Foundation)' },
  '토대':       { color: '#b5860a', label: '토대 (Sill Plate)' },
  '1층_스터드': { color: '#2f81f7', label: '1층 스터드 (1F Stud)' },
  '2층_바닥':   { color: '#8957e5', label: '2층 바닥 (2F Floor)' },
  '2층_스터드': { color: '#1a7f37', label: '2층 스터드 (2F Stud)' },
  '1층_지붕':   { color: '#9e6a03', label: '1층 지붕 (1F Roof)' },
  '천정':       { color: '#bf4b8a', label: '천정 (Ceiling)' },
  '지붕벽':     { color: '#3fb950', label: '지붕벽 (Parapet)' },
  '지붕':       { color: '#e3b341', label: '지붕 (Roof)' },
};

export const LAYER_ORDER = [
  '기초', '토대', '1층_스터드', '2층_바닥', '2층_스터드',
  '1층_지붕', '천정', '지붕벽', '지붕',
] as const;

export const PALETTE = [
  '#2f81f7', '#f78166', '#3fb950', '#e3b341', '#bc8cff',
  '#ff8cc8', '#20d6b5', '#79c0ff', '#ffa657', '#7ee787',
];
