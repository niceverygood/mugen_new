import { create } from 'zustand';
import type { DXFData, GeneratedLayers, StructuralLayerType, StructuralElement, HistoryEntry, Axes } from '@mugen/shared';
import { STRUCTURAL_LAYER_ORDER } from '@mugen/shared';

interface EditorState {
  // DXF data
  dxfData: DXFData | null;
  fileName: string;

  // Layers
  visibleLayers: Set<string>;

  // View
  zoom: number;
  pan: { x: number; y: number };
  tool: string;

  // Grid
  gridAxes: Axes | null;
  showGrid: boolean;

  // Structural planning
  activeStructuralLayer: StructuralLayerType | null;
  generatedLayers: GeneratedLayers;
  genVisible: Record<string, boolean>;
  structuralElements: Record<StructuralLayerType, StructuralElement[]>;
  structuralLayerVisible: Record<StructuralLayerType, boolean>;

  // Settings
  genSettings: { floors: number; roofType: string };
  preset: { id: number; name: string; stud: number; wallType: string };

  // History
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Generation state
  isGenerating: boolean;

  // Selection
  selectedElementId: string | null;
  selectedLayerType: StructuralLayerType | null;

  // Drawing color
  drawColor: number; // ACI color index

  // Overlay
  overlayOpacity: number;

  // Actions
  setDxfData: (data: DXFData, fileName: string) => void;
  setVisibleLayers: (layers: Set<string>) => void;
  toggleLayer: (layer: string) => void;
  setZoom: (fn: (z: number) => number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  snapEnabled: boolean;
  snapDistance: number;
  setSnapEnabled: (v: boolean) => void;
  setDrawColor: (c: number) => void;
  selectElement: (id: string | null, layerType: StructuralLayerType | null) => void;
  deleteSelectedElement: () => void;
  moveSelectedElement: (dx: number, dy: number) => void;
  updateSelectedElementColor: (color: number) => void;
  setTool: (tool: string) => void;
  setGridAxes: (axes: Axes | null) => void;
  setShowGrid: (v: boolean) => void;
  setActiveStructuralLayer: (layer: StructuralLayerType | null) => void;
  setGeneratedLayers: (layers: GeneratedLayers) => void;
  toggleGenLayer: (layer: string) => void;
  toggleStructuralLayerVisible: (layer: StructuralLayerType) => void;
  setGenSettings: (settings: { floors: number; roofType: string }) => void;
  setPreset: (preset: { id: number; name: string; stud: number; wallType: string }) => void;
  setIsGenerating: (v: boolean) => void;
  setOverlayOpacity: (v: number) => void;
  addStructuralElement: (el: StructuralElement) => void;
  removeStructuralElement: (layerType: StructuralLayerType, id: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const initStructuralElements = (): Record<StructuralLayerType, StructuralElement[]> => ({
  foundation: [], roof: [], stud_1f: [], stud_2f: [], floor_2f: [], ceiling: [],
});

const initStructuralVisible = (): Record<StructuralLayerType, boolean> => ({
  foundation: true, roof: true, stud_1f: true, stud_2f: true, floor_2f: true, ceiling: true,
});

export const useEditorStore = create<EditorState>((set, get) => ({
  dxfData: null,
  fileName: '',
  visibleLayers: new Set<string>(),
  zoom: 1,
  pan: { x: 0, y: 0 },
  tool: 'pan',
  gridAxes: null,
  showGrid: true,
  activeStructuralLayer: null,
  generatedLayers: {},
  genVisible: {},
  structuralElements: initStructuralElements(),
  structuralLayerVisible: initStructuralVisible(),
  genSettings: { floors: 2, roofType: 'gabled' },
  preset: { id: 1, name: 'Default Wood', stud: 455, wallType: 'Wood' },
  undoStack: [],
  redoStack: [],
  isGenerating: false,
  selectedElementId: null,
  selectedLayerType: null,
  drawColor: 1, // ACI Red
  overlayOpacity: 0.25,
  snapEnabled: true,
  snapDistance: 200,

  setDxfData: (data, fileName) => set({
    dxfData: data,
    fileName,
    visibleLayers: new Set(data.layers),
    zoom: 1,
    pan: { x: 0, y: 0 },
    generatedLayers: {},
    genVisible: {},
    structuralElements: initStructuralElements(),
    undoStack: [],
    redoStack: [],
    gridAxes: null,
  }),

  setVisibleLayers: (layers) => set({ visibleLayers: layers }),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.visibleLayers);
    next.has(layer) ? next.delete(layer) : next.add(layer);
    return { visibleLayers: next };
  }),
  setZoom: (fn) => set((s) => ({ zoom: Math.max(0.05, Math.min(40, fn(s.zoom))) })),
  setPan: (pan) => set({ pan }),
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setDrawColor: (c) => set({ drawColor: c }),

  selectElement: (id, layerType) => set({ selectedElementId: id, selectedLayerType: layerType }),

  deleteSelectedElement: () => {
    const s = get();
    if (!s.selectedElementId || !s.selectedLayerType) return;
    s.removeStructuralElement(s.selectedLayerType, s.selectedElementId);
    set({ selectedElementId: null, selectedLayerType: null });
  },

  moveSelectedElement: (dx, dy) => {
    const s = get();
    if (!s.selectedElementId || !s.selectedLayerType) return;
    const elements = s.structuralElements[s.selectedLayerType];
    const updated = elements.map(el => {
      if (el.id !== s.selectedElementId) return el;
      const e = { ...el.entity } as any;
      if (e.type === 'LINE') { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; }
      else if (e.type === 'CIRCLE' || e.type === 'ARC' || e.type === 'TEXT' || e.type === 'MTEXT') { e.x += dx; e.y += dy; }
      else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices) {
        e.vertices = e.vertices.map((v: any) => ({ x: v.x + dx, y: v.y + dy }));
      }
      return { ...el, entity: e };
    });
    set({ structuralElements: { ...s.structuralElements, [s.selectedLayerType]: updated } });
  },

  updateSelectedElementColor: (color) => {
    const s = get();
    if (!s.selectedElementId || !s.selectedLayerType) return;
    const elements = s.structuralElements[s.selectedLayerType];
    const updated = elements.map(el => {
      if (el.id !== s.selectedElementId) return el;
      return { ...el, entity: { ...el.entity, color } as any };
    });
    set({ structuralElements: { ...s.structuralElements, [s.selectedLayerType]: updated } });
  },
  setTool: (tool) => set({ tool }),
  setGridAxes: (axes) => set({ gridAxes: axes }),
  setShowGrid: (v) => set({ showGrid: v }),
  setActiveStructuralLayer: (layer) => set({ activeStructuralLayer: layer }),

  setGeneratedLayers: (layers) => {
    const genVisible: Record<string, boolean> = {};
    Object.keys(layers).forEach(k => genVisible[k] = true);
    set({ generatedLayers: layers, genVisible });
  },

  toggleGenLayer: (layer) => set((s) => ({
    genVisible: { ...s.genVisible, [layer]: !s.genVisible[layer] },
  })),

  toggleStructuralLayerVisible: (layer) => set((s) => ({
    structuralLayerVisible: { ...s.structuralLayerVisible, [layer]: !s.structuralLayerVisible[layer] },
  })),

  setGenSettings: (settings) => set({ genSettings: settings }),
  setPreset: (preset) => set({ preset }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setOverlayOpacity: (v) => set({ overlayOpacity: v }),

  addStructuralElement: (el) => {
    const s = get();
    const prev = [...s.structuralElements[el.layerType]];
    set({
      structuralElements: {
        ...s.structuralElements,
        [el.layerType]: [...prev, el],
      },
      undoStack: [...s.undoStack, { type: 'add', layerType: el.layerType, elements: [el], previousElements: prev }],
      redoStack: [],
    });
  },

  removeStructuralElement: (layerType, id) => {
    const s = get();
    const prev = [...s.structuralElements[layerType]];
    const next = prev.filter(e => e.id !== id);
    set({
      structuralElements: { ...s.structuralElements, [layerType]: next },
      undoStack: [...s.undoStack, { type: 'remove', layerType, elements: prev.filter(e => e.id === id), previousElements: prev }],
      redoStack: [],
    });
  },

  undo: () => {
    const s = get();
    if (!s.undoStack.length) return;
    const entry = s.undoStack[s.undoStack.length - 1];
    set({
      structuralElements: {
        ...s.structuralElements,
        [entry.layerType]: entry.previousElements || [],
      },
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, entry],
    });
  },

  redo: () => {
    const s = get();
    if (!s.redoStack.length) return;
    const entry = s.redoStack[s.redoStack.length - 1];
    const current = [...s.structuralElements[entry.layerType]];
    if (entry.type === 'add') {
      set({
        structuralElements: {
          ...s.structuralElements,
          [entry.layerType]: [...current, ...entry.elements],
        },
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, { ...entry, previousElements: current }],
      });
    } else {
      const ids = new Set(entry.elements.map(e => e.id));
      set({
        structuralElements: {
          ...s.structuralElements,
          [entry.layerType]: current.filter(e => !ids.has(e.id)),
        },
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, { ...entry, previousElements: current }],
      });
    }
  },

  // Expose for debugging
  _init: () => { (window as any).__editorStore = useEditorStore; },

  reset: () => set({
    dxfData: null,
    fileName: '',
    visibleLayers: new Set<string>(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    tool: 'pan',
    gridAxes: null,
    activeStructuralLayer: null,
    generatedLayers: {},
    genVisible: {},
    structuralElements: initStructuralElements(),
    structuralLayerVisible: initStructuralVisible(),
    undoStack: [],
    redoStack: [],
    isGenerating: false,
  }),
}));
