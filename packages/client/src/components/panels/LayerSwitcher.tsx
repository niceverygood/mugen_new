import { useEditorStore } from '../../store/editorStore';
import { STRUCTURAL_LAYERS, STRUCTURAL_LAYER_ORDER } from '@mugen/shared';
import type { StructuralLayerType } from '@mugen/shared';

export default function LayerSwitcher() {
  const {
    activeStructuralLayer, setActiveStructuralLayer,
    structuralLayerVisible, toggleStructuralLayerVisible,
    structuralElements, generatedLayers,
    genSettings,
  } = useEditorStore();

  const layers = STRUCTURAL_LAYER_ORDER.filter(lt => {
    if (genSettings.floors < 2 && (lt === 'stud_2f' || lt === 'floor_2f')) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 11, color: '#8b949e', padding: '4px 0', fontWeight: 600 }}>
        구조 레이어
      </div>
      {layers.map(lt => {
        const cfg = STRUCTURAL_LAYERS[lt];
        const isActive = activeStructuralLayer === lt;
        const isVisible = structuralLayerVisible[lt];
        const count = structuralElements[lt].length;
        const hasGen = Object.keys(generatedLayers).length > 0;

        return (
          <div key={lt} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
            background: isActive ? '#1f3354' : 'transparent',
            border: isActive ? '1px solid #2f81f7' : '1px solid transparent',
          }}>
            {/* Visibility toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleStructuralLayerVisible(lt); }}
              style={{
                width: 16, height: 16, borderRadius: 3, border: 'none', cursor: 'pointer',
                background: isVisible ? cfg.color : '#21262d',
                opacity: isVisible ? 1 : 0.4,
              }}
            />
            {/* Layer select */}
            <div
              onClick={() => setActiveStructuralLayer(isActive ? null : lt)}
              style={{ flex: 1, fontSize: 12, color: isActive ? '#c9d1d9' : '#8b949e' }}
            >
              {cfg.label}
            </div>
            {count > 0 && (
              <span style={{ fontSize: 9, color: '#484f58', background: '#21262d', padding: '1px 5px', borderRadius: 8 }}>
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
