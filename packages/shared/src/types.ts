// ---- DXF Entity Types ----
export interface DXFVertex {
  x: number;
  y: number;
}

export interface DXFBaseEntity {
  type: string;
  layer: string;
  color?: number;
}

export interface DXFLine extends DXFBaseEntity {
  type: 'LINE';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DXFCircle extends DXFBaseEntity {
  type: 'CIRCLE';
  x: number;
  y: number;
  r: number;
}

export interface DXFArc extends DXFBaseEntity {
  type: 'ARC';
  x: number;
  y: number;
  r: number;
  sa: number;
  ea: number;
}

export interface DXFLWPolyline extends DXFBaseEntity {
  type: 'LWPOLYLINE' | 'POLYLINE';
  vertices: DXFVertex[];
  flags?: number;
}

export interface DXFText extends DXFBaseEntity {
  type: 'TEXT' | 'MTEXT';
  x: number;
  y: number;
  text: string;
}

export type DXFEntity = DXFLine | DXFCircle | DXFArc | DXFLWPolyline | DXFText | DXFBaseEntity;

export interface DXFData {
  entities: DXFEntity[];
  layers: string[];
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// ---- Structural Planning Types ----
export type StructuralLayerType =
  | 'foundation'   // 기초
  | 'roof'         // 지붕
  | 'stud_1f'      // 1층 스터드
  | 'stud_2f'      // 2층 스터드
  | 'floor_2f'     // 2층 바닥
  | 'ceiling';     // 천장

export interface Preset {
  id: number;
  name: string;
  stud: number;       // spacing in mm (303, 455, 910)
  wallType: string;   // "Wood" | "LGS" | "RC"
  notes?: string;
}

export interface GenSettings {
  floors: number;     // 1 or 2
  roofType: string;   // "gabled" | "hip"
}

export interface HAxis {
  y: number;
  x0: number;
  x1: number;
  len: number;
  isExterior?: boolean;
}

export interface VAxis {
  x: number;
  y0: number;
  y1: number;
  len: number;
  isExterior?: boolean;
}

export interface Axes {
  hAxes: HAxis[];
  vAxes: VAxis[];
}

export interface Opening {
  pos: number;
  width: number;
  type: 'door' | 'window' | 'unknown';
}

export interface Extents {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type GeneratedLayers = Record<string, DXFEntity[]>;

export interface StructuralError {
  id?: number;
  msg: string;
  level: 'error' | 'warn';
}

export interface GenerateLayerConfig {
  color: string;
  label: string;
  labelJa: string;
}

// ---- Structural Element (user-placed) ----
export interface StructuralElement {
  id: string;
  layerType: StructuralLayerType;
  entity: DXFEntity;
  metadata?: Record<string, any>;
}

// ---- History ----
export interface HistoryEntry {
  type: 'add' | 'remove' | 'modify' | 'auto-generate';
  layerType: StructuralLayerType;
  elements: StructuralElement[];
  previousElements?: StructuralElement[];
}
