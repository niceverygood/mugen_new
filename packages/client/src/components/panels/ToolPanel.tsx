import { useEditorStore } from '../../store/editorStore';
import { STRUCTURAL_LAYERS, ACI } from '@mugen/shared';

// Common ACI colors for structural drawing
const COLOR_PRESETS = [
  { aci: 1, name: '빨강', hex: '#FF2020' },
  { aci: 2, name: '노랑', hex: '#FFFF00' },
  { aci: 3, name: '초록', hex: '#00D000' },
  { aci: 4, name: '시안', hex: '#00CCCC' },
  { aci: 5, name: '파랑', hex: '#2020FF' },
  { aci: 6, name: '마젠타', hex: '#CC00CC' },
  { aci: 7, name: '흰색', hex: '#C8C8C8' },
  { aci: 8, name: '회색', hex: '#808080' },
  { aci: 30, name: '주황', hex: '#FF8000' },
  { aci: 40, name: '금색', hex: '#FFBF00' },
];

const TOOLS = [
  { id: 'pan', label: '이동', icon: '🖐', group: 'nav' },
  { id: 'select', label: '선택', icon: '👆', group: 'nav' },
  { id: 'wall', label: '벽체', icon: '🧱', group: 'draw', desc: '수평/수직 벽체 (자동 수직/수평 보정)' },
  { id: 'line', label: '선', icon: '📏', group: 'draw', desc: '자유 직선' },
  { id: 'rect', label: '사각', icon: '⬜', group: 'draw', desc: '사각형 (기초/점검구 등)' },
  { id: 'polyline', label: '연속선', icon: '📐', group: 'draw', desc: '연속 폴리라인 (더블클릭으로 완료)' },
  { id: 'dimension', label: '치수', icon: '↔️', group: 'anno', desc: '두 점 사이 치수선' },
  { id: 'text', label: '텍스트', icon: '🔤', group: 'anno', desc: '텍스트 배치' },
] as const;

export default function ToolPanel() {
  const {
    tool, setTool, activeStructuralLayer,
    overlayOpacity, setOverlayOpacity,
    showGrid, setShowGrid,
    snapEnabled, setSnapEnabled,
    drawColor, setDrawColor,
    structuralElements,
    undoStack, redoStack, undo, redo,
  } = useEditorStore();

  const activeCount = activeStructuralLayer ? structuralElements[activeStructuralLayer].length : 0;

  const btnStyle = (t: string) => ({
    flex: 1, padding: '6px 2px', fontSize: 10,
    background: tool === t ? '#1f3354' : '#161b22',
    border: tool === t ? '1px solid #2f81f7' : '1px solid #21262d',
    color: tool === t ? '#58a6ff' : '#8b949e',
    borderRadius: 4, cursor: 'pointer', textAlign: 'center' as const,
    minWidth: 0,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Navigation tools */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>내비게이션</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TOOLS.filter(t => t.group === 'nav').map(t => (
            <button key={t.id} onClick={() => setTool(t.id as any)} style={btnStyle(t.id)}>
              <div style={{ fontSize: 16 }}>{t.icon}</div>
              <div>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing tools */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>그리기 도구</div>
        {!activeStructuralLayer && (
          <div style={{ fontSize: 10, color: '#f85149', marginBottom: 4, padding: '4px 8px', background: '#1a0000', borderRadius: 4 }}>
            좌측에서 구조 레이어를 먼저 선택하세요
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TOOLS.filter(t => t.group === 'draw').map(t => (
            <button key={t.id} onClick={() => setTool(t.id as any)}
              disabled={!activeStructuralLayer}
              style={{ ...btnStyle(t.id), opacity: activeStructuralLayer ? 1 : 0.4 }}
              title={t.desc}>
              <div style={{ fontSize: 16 }}>{t.icon}</div>
              <div>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Annotation tools */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>주석 도구</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TOOLS.filter(t => t.group === 'anno').map(t => (
            <button key={t.id} onClick={() => setTool(t.id as any)}
              disabled={!activeStructuralLayer}
              style={{ ...btnStyle(t.id), opacity: activeStructuralLayer ? 1 : 0.4 }}
              title={t.desc}>
              <div style={{ fontSize: 16 }}>{t.icon}</div>
              <div>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={undo} disabled={!undoStack.length}
          style={{ flex: 1, padding: '4px', fontSize: 11, background: '#161b22', border: '1px solid #21262d', color: undoStack.length ? '#c9d1d9' : '#30363d', borderRadius: 4, cursor: undoStack.length ? 'pointer' : 'default' }}>
          ↩ Undo ({undoStack.length})
        </button>
        <button onClick={redo} disabled={!redoStack.length}
          style={{ flex: 1, padding: '4px', fontSize: 11, background: '#161b22', border: '1px solid #21262d', color: redoStack.length ? '#c9d1d9' : '#30363d', borderRadius: 4, cursor: redoStack.length ? 'pointer' : 'default' }}>
          ↪ Redo ({redoStack.length})
        </button>
      </div>

      {/* Active layer info */}
      {activeStructuralLayer && (
        <div style={{ padding: '8px', background: '#161b22', borderRadius: 6, border: `1px solid ${STRUCTURAL_LAYERS[activeStructuralLayer].color}40` }}>
          <div style={{ fontSize: 11, color: STRUCTURAL_LAYERS[activeStructuralLayer].color, fontWeight: 600, marginBottom: 4 }}>
            활성: {STRUCTURAL_LAYERS[activeStructuralLayer].label}
          </div>
          <div style={{ fontSize: 10, color: '#8b949e' }}>
            요소: {activeCount}개
          </div>
        </div>
      )}

      {/* Color picker */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>
          그리기 색상 (ACI: {drawColor})
        </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map(c => (
            <button
              key={c.aci}
              onClick={() => setDrawColor(c.aci)}
              title={`${c.name} (ACI ${c.aci})`}
              style={{
                width: 24, height: 24, borderRadius: 4,
                background: c.hex,
                border: drawColor === c.aci ? '2px solid #fff' : '1px solid #30363d',
                cursor: 'pointer',
                boxShadow: drawColor === c.aci ? '0 0 6px ' + c.hex : 'none',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#484f58', marginTop: 4 }}>
          선택한 색상이 DXF 내보내기 시 유지됩니다
        </div>
      </div>

      {/* Snap settings */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>스냅 설정</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <input type="checkbox" checked={snapEnabled} onChange={() => setSnapEnabled(!snapEnabled)} />
          <span style={{ fontSize: 11, color: '#8b949e' }}>그리드 스냅 ({snapEnabled ? 'ON' : 'OFF'})</span>
        </div>
      </div>

      {/* Display settings */}
      <div>
        <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, marginBottom: 4 }}>표시 설정</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)} />
          <span style={{ fontSize: 11, color: '#8b949e' }}>그리드 축 표시</span>
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#484f58' }}>의장도 투명도: {Math.round(overlayOpacity * 100)}%</label>
          <input
            type="range" min={5} max={100} value={Math.round(overlayOpacity * 100)}
            onChange={e => setOverlayOpacity(parseInt(e.target.value) / 100)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Shortcuts */}
      <div style={{ borderTop: '1px solid #21262d', paddingTop: 8, fontSize: 10, color: '#30363d', lineHeight: 1.5 }}>
        <div>Scroll = 줌</div>
        <div>Ctrl+Z = 실행취소</div>
        <div>Ctrl+Shift+Z = 재실행</div>
        <div>ESC / 우클릭 = 그리기 취소</div>
        <div>더블클릭 = 폴리라인 완료</div>
        <div>벽체도구 = 자동 수직/수평 보정</div>
      </div>
    </div>
  );
}
