import { useEditorStore } from '../../store/editorStore';
import { generateStructural } from '../../lib/api';
import { GEN_LAYER_CFG, LAYER_ORDER } from '@mugen/shared';

export default function GeneratePanel() {
  const {
    dxfData, preset, genSettings, setGenSettings, setPreset,
    setGeneratedLayers, isGenerating, setIsGenerating,
    generatedLayers, genVisible, toggleGenLayer,
  } = useEditorStore();

  const handleGenerate = async () => {
    if (!dxfData) return;
    setIsGenerating(true);
    try {
      const layers = await generateStructural(dxfData, preset, genSettings);
      setGeneratedLayers(layers);
    } catch (e) {
      console.error('Generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasGen = Object.keys(generatedLayers).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600 }}>자동 생성 설정</div>

      {/* Preset */}
      <div>
        <label style={{ fontSize: 10, color: '#484f58' }}>벽체 타입</label>
        <select
          value={preset.wallType}
          onChange={e => setPreset({ ...preset, wallType: e.target.value })}
          style={{ width: '100%', padding: '4px 8px', background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', borderRadius: 4, fontSize: 12 }}
        >
          <option value="Wood">Wood (목조)</option>
          <option value="LGS">LGS (경량철골)</option>
          <option value="RC">RC (철근콘크리트)</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: 10, color: '#484f58' }}>스터드 간격</label>
        <select
          value={preset.stud}
          onChange={e => setPreset({ ...preset, stud: parseInt(e.target.value) })}
          style={{ width: '100%', padding: '4px 8px', background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', borderRadius: 4, fontSize: 12 }}
        >
          <option value={303}>303mm</option>
          <option value={455}>455mm</option>
          <option value={910}>910mm</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: '#484f58' }}>층수</label>
          <select
            value={genSettings.floors}
            onChange={e => setGenSettings({ ...genSettings, floors: parseInt(e.target.value) })}
            style={{ width: '100%', padding: '4px 8px', background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', borderRadius: 4, fontSize: 12 }}
          >
            <option value={1}>1층</option>
            <option value={2}>2층</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: '#484f58' }}>지붕 형태</label>
          <select
            value={genSettings.roofType}
            onChange={e => setGenSettings({ ...genSettings, roofType: e.target.value })}
            style={{ width: '100%', padding: '4px 8px', background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', borderRadius: 4, fontSize: 12 }}
          >
            <option value="gabled">박공 (Gabled)</option>
            <option value="hip">모임 (Hip)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!dxfData || isGenerating}
        style={{
          padding: '8px 16px', background: isGenerating ? '#21262d' : '#238636',
          border: 'none', borderRadius: 6, color: '#fff', fontSize: 12,
          cursor: !dxfData || isGenerating ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {isGenerating ? '생성 중...' : '전체 자동 생성'}
      </button>

      {/* Generated layer toggles */}
      {hasGen && (
        <div style={{ borderTop: '1px solid #21262d', paddingTop: 8 }}>
          <div style={{ fontSize: 10, color: '#484f58', marginBottom: 4 }}>생성된 레이어</div>
          {LAYER_ORDER.map(name => {
            if (!generatedLayers[name]) return null;
            const cfg = GEN_LAYER_CFG[name];
            return (
              <div key={name} onClick={() => toggleGenLayer(name)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: genVisible[name] ? cfg.color : '#21262d',
                }} />
                <span style={{ fontSize: 11, color: genVisible[name] ? '#c9d1d9' : '#484f58' }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 9, color: '#484f58', marginLeft: 'auto' }}>
                  {generatedLayers[name].length}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
