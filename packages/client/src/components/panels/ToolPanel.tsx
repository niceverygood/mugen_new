import { useEditorStore } from '../../store/editorStore';
import { STRUCTURAL_LAYERS, ACI } from '@mugen/shared';

const TOOL_GROUPS = [
  {
    name: '내비게이션',
    tools: [
      { id: 'pan', label: '이동', icon: '🖐', key: 'M' },
      { id: 'select', label: '선택', icon: '👆', key: 'V' },
    ],
  },
  {
    name: '기본 도형',
    tools: [
      { id: 'line', label: '직선', icon: '╱', key: 'L', desc: '두 점 사이 자유 직선' },
      { id: 'rect', label: '사각형', icon: '▭', key: 'R', desc: '대각선 두 점으로 사각형' },
      { id: 'circle', label: '원', icon: '○', key: 'C', desc: '중심 + 반지름 점 (기둥/볼트)' },
      { id: 'arc', label: '호', icon: '◠', key: 'A', desc: '중심→시작점→끝점 (개구부 표시)' },
      { id: 'polyline', label: '연속선', icon: '⏤', key: 'P', desc: '연속 폴리라인 (더블클릭 완료)' },
    ],
  },
  {
    name: '구조 전용',
    tools: [
      { id: 'wall', label: '단일벽', icon: '│', key: 'W', desc: '수직/수평 자동보정 단일선' },
      { id: 'dwall', label: '이중벽', icon: '║', key: 'E', desc: '벽두께 자동 적용 평행선 (Wood:105mm)' },
      { id: 'studs', label: '스터드', icon: '┃┃', key: 'S', desc: '벽체+스터드 일괄배치 (프리셋 간격)' },
      { id: 'joists', label: '장선', icon: '≡', key: 'J', desc: '영역 내 장선 자동배치' },
      { id: 'xcross', label: 'X마크', icon: '☒', key: 'X', desc: '사각+대각선 (점검구/독립기초)' },
    ],
  },
  {
    name: '심볼',
    tools: [
      { id: 'bolt', label: '볼트', icon: '⊕', key: 'B', desc: '앵커볼트 심볼 (원+십자)' },
      { id: 'hardware', label: '금물', icon: '△', key: 'H', desc: '금물 마크 (삼각형)' },
    ],
  },
  {
    name: '주석',
    tools: [
      { id: 'dimension', label: '치수', icon: '↔', key: 'D', desc: '두 점 사이 치수선+거리표시' },
      { id: 'text', label: '텍스트', icon: 'T', key: 'T', desc: '텍스트 배치' },
      { id: 'label', label: '라벨', icon: '⤷', key: 'G', desc: '지시선+라벨 텍스트' },
    ],
  },
];

// Build key→toolId map
const KEY_MAP: Record<string, string> = {};
TOOL_GROUPS.forEach(g => g.tools.forEach(t => { if (t.key) KEY_MAP[t.key.toLowerCase()] = t.id; }));

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

export default function ToolPanel() {
  const {
    tool, setTool, activeStructuralLayer,
    overlayOpacity, setOverlayOpacity,
    showGrid, setShowGrid,
    snapEnabled, setSnapEnabled,
    drawColor, setDrawColor,
    structuralElements, preset,
    undoStack, redoStack, undo, redo,
    selectedElementId, selectedLayerType,
    deleteSelectedElement, selectElement, updateSelectedElementColor,
  } = useEditorStore();

  const activeCount = activeStructuralLayer ? structuralElements[activeStructuralLayer].length : 0;
  const needsLayer = !activeStructuralLayer && tool !== 'pan' && tool !== 'select';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
      {TOOL_GROUPS.map(group => {
        const isNavGroup = group.name === '내비게이션';
        return (
          <div key={group.name}>
            <div style={{ color: '#8b949e', fontWeight: 600, marginBottom: 3 }}>{group.name}</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {group.tools.map(t => {
                const active = tool === t.id;
                const disabled = !isNavGroup && !activeStructuralLayer;
                return (
                  <button key={t.id} onClick={() => !disabled && setTool(t.id)}
                    title={disabled ? '⚠️ 좌측 레이어 탭에서 구조 레이어를 먼저 선택하세요' : (t.desc || t.label)}
                    style={{
                      padding: '4px 6px', fontSize: 10, minWidth: 42, textAlign: 'center',
                      background: active ? '#1f3354' : '#161b22',
                      border: active ? '1px solid #2f81f7' : '1px solid #21262d',
                      color: active ? '#58a6ff' : disabled ? '#30363d' : '#8b949e',
                      borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                    }}>
                    <div style={{ fontSize: 14, lineHeight: 1 }}>{t.icon}</div>
                    <div style={{ marginTop: 1 }}>{t.label} <span style={{ color: '#484f58', fontSize: 9 }}>{t.key}</span></div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {needsLayer && (
        <div style={{ fontSize: 10, color: '#f85149', padding: '4px 8px', background: '#1a0000', borderRadius: 4 }}>
          좌측에서 구조 레이어를 먼저 선택하세요
        </div>
      )}

      {/* Selected element info */}
      {selectedElementId && selectedLayerType && (() => {
        const el = structuralElements[selectedLayerType]?.find(e => e.id === selectedElementId);
        if (!el) return null;
        const e = el.entity as any;
        return (
          <div style={{ padding: '6px 8px', background: '#0a1929', borderRadius: 6, border: '1px solid #58a6ff' }}>
            <div style={{ color: '#58a6ff', fontWeight: 600, marginBottom: 4 }}>선택됨: {e.type}</div>
            <div style={{ fontSize: 9, color: '#8b949e', lineHeight: 1.6 }}>
              {e.type === 'LINE' && `(${Math.round(e.x1)}, ${Math.round(e.y1)}) → (${Math.round(e.x2)}, ${Math.round(e.y2)})`}
              {e.type === 'CIRCLE' && `중심: (${Math.round(e.x)}, ${Math.round(e.y)}) R=${Math.round(e.r)}`}
              {e.type === 'TEXT' && `"${e.text}" at (${Math.round(e.x)}, ${Math.round(e.y)})`}
              {e.type === 'LWPOLYLINE' && `${e.vertices?.length}점 폴리라인`}
              {e.type === 'ARC' && `중심: (${Math.round(e.x)}, ${Math.round(e.y)}) R=${Math.round(e.r)}`}
              <br />색상: ACI {e.color || '없음'}
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
              <button onClick={deleteSelectedElement}
                style={{ flex: 1, padding: '3px 6px', background: '#3d1114', border: '1px solid #f85149', color: '#f85149', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>
                삭제 (Del)
              </button>
              <button onClick={() => selectElement(null, null)}
                style={{ flex: 1, padding: '3px 6px', background: '#161b22', border: '1px solid #21262d', color: '#8b949e', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>
                선택해제
              </button>
            </div>
            <div style={{ fontSize: 9, color: '#484f58', marginTop: 3 }}>
              색상 변경:
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
              {COLOR_PRESETS.slice(0, 7).map(c => (
                <button key={c.aci} onClick={() => updateSelectedElementColor(c.aci)}
                  style={{ width: 18, height: 18, borderRadius: 2, background: c.hex, border: '1px solid #30363d', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ fontSize: 9, color: '#484f58', marginTop: 3 }}>
              ← → ↑ ↓ 방향키로 이동 (Shift=큰이동)
            </div>
          </div>
        );
      })()}

      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button onClick={undo} disabled={!undoStack.length}
          style={{ flex: 1, padding: '3px', background: '#161b22', border: '1px solid #21262d', color: undoStack.length ? '#c9d1d9' : '#30363d', borderRadius: 4, cursor: undoStack.length ? 'pointer' : 'default', fontSize: 10 }}>
          ↩ Undo ({undoStack.length})
        </button>
        <button onClick={redo} disabled={!redoStack.length}
          style={{ flex: 1, padding: '3px', background: '#161b22', border: '1px solid #21262d', color: redoStack.length ? '#c9d1d9' : '#30363d', borderRadius: 4, cursor: redoStack.length ? 'pointer' : 'default', fontSize: 10 }}>
          ↪ Redo ({redoStack.length})
        </button>
      </div>

      {/* Active layer info */}
      {activeStructuralLayer && (
        <div style={{ padding: '6px 8px', background: '#161b22', borderRadius: 6, border: `1px solid ${STRUCTURAL_LAYERS[activeStructuralLayer].color}40` }}>
          <div style={{ color: STRUCTURAL_LAYERS[activeStructuralLayer].color, fontWeight: 600 }}>
            활성: {STRUCTURAL_LAYERS[activeStructuralLayer].label}
          </div>
          <div style={{ color: '#8b949e', fontSize: 10 }}>요소: {activeCount}개 | 스터드간격: {preset.stud}mm | 벽: {preset.wallType}</div>
        </div>
      )}

      {/* Color picker */}
      <div>
        <div style={{ color: '#8b949e', fontWeight: 600, marginBottom: 3 }}>그리기 색상 (ACI: {drawColor})</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map(c => (
            <button key={c.aci} onClick={() => setDrawColor(c.aci)} title={`${c.name} (ACI ${c.aci})`}
              style={{
                width: 22, height: 22, borderRadius: 3, background: c.hex, border: drawColor === c.aci ? '2px solid #fff' : '1px solid #30363d',
                cursor: 'pointer', boxShadow: drawColor === c.aci ? '0 0 4px ' + c.hex : 'none',
              }} />
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#484f58', marginTop: 2 }}>DXF 내보내기 시 ACI 색상 유지됨</div>
      </div>

      {/* Settings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <input type="checkbox" checked={snapEnabled} onChange={() => setSnapEnabled(!snapEnabled)} style={{ width: 13, height: 13 }} />
          <span style={{ color: '#8b949e' }}>그리드 스냅 ({snapEnabled ? 'ON' : 'OFF'})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <input type="checkbox" checked={showGrid} onChange={() => setShowGrid(!showGrid)} style={{ width: 13, height: 13 }} />
          <span style={{ color: '#8b949e' }}>그리드 축 표시</span>
        </div>
        <div>
          <span style={{ color: '#484f58', fontSize: 10 }}>의장도 투명도: {Math.round(overlayOpacity * 100)}%</span>
          <input type="range" min={5} max={100} value={Math.round(overlayOpacity * 100)}
            onChange={e => setOverlayOpacity(parseInt(e.target.value) / 100)} style={{ width: '100%', height: 14 }} />
        </div>
      </div>

      {/* Help */}
      <div style={{ borderTop: '1px solid #21262d', paddingTop: 6, fontSize: 9, color: '#30363d', lineHeight: 1.6 }}>
        <div>Scroll=줌 | Ctrl+Z=실행취소</div>
        <div>ESC/우클릭=그리기취소</div>
        <div>더블클릭=연속선완료</div>
        <div>모든 요소는 DXF 벡터로 저장됩니다</div>
      </div>
    </div>
  );
}
