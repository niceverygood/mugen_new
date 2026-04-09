import { useCallback, useRef, useState, useEffect } from 'react';
import StructuralCanvas from '../components/canvas/StructuralCanvas';
import LayerSwitcher from '../components/panels/LayerSwitcher';
import GeneratePanel from '../components/panels/GeneratePanel';
import ToolPanel from '../components/panels/ToolPanel';
import { useEditorStore } from '../store/editorStore';
import { uploadDXF, parseDXFFile, exportDXF as apiExport } from '../lib/api';
import { extractAxes, parseDXF as clientParseDXF } from '@mugen/shared';

type TabId = 'layers' | 'generate' | 'tools';

export default function Editor() {
  const { dxfData, setDxfData, setGridAxes, generatedLayers, structuralElements, fileName } = useEditorStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('layers');
  const [uploading, setUploading] = useState(false);

  // Auto-load test file if ?test=1 in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test')) {
      parseDXFFile('test.dxf').then(data => {
        setDxfData(data, 'test.dxf');
        const axes = extractAxes(data.entities);
        if (axes.hAxes.length >= 2 && axes.vAxes.length >= 2) {
          setGridAxes(axes);
        }
      }).catch(console.error);
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Upload to server
      const { filename } = await uploadDXF(file);
      // Parse
      const data = await parseDXFFile(filename);
      setDxfData(data, file.name);
      // Auto-detect grid
      const axes = extractAxes(data.entities);
      if (axes.hAxes.length >= 2 && axes.vAxes.length >= 2) {
        setGridAxes(axes);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      // Fallback: client-side parsing
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = clientParseDXF(ev.target?.result as string);
          setDxfData(data, file.name);
          const axes2 = extractAxes(data.entities);
          if (axes2.hAxes.length >= 2 && axes2.vAxes.length >= 2) {
            setGridAxes(axes2);
          }
        } catch (e2) { console.error('Client parse failed:', e2); }
      };
      reader.readAsText(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [setDxfData, setGridAxes]);

  const handleExport = useCallback(async () => {
    // Combine auto-generated layers + manually drawn structural elements
    const exportLayers: Record<string, any[]> = { ...generatedLayers };

    // Add manual structural elements grouped by layer name
    const layerNameMap: Record<string, string> = {
      foundation: '구조계획_기초',
      stud_1f: '구조계획_1층스터드',
      stud_2f: '구조계획_2층스터드',
      floor_2f: '구조계획_2층바닥',
      ceiling: '구조계획_천장',
      roof: '구조계획_지붕',
    };

    Object.entries(structuralElements).forEach(([lt, elements]) => {
      if (!elements.length) return;
      const layerName = layerNameMap[lt] || `구조계획_${lt}`;
      exportLayers[layerName] = elements.map(el => ({
        ...el.entity,
        layer: layerName,
      }));
    });

    const hasContent = Object.values(exportLayers).some(arr => arr.length > 0);
    if (!hasContent) {
      alert('내보낼 구조 요소가 없습니다. 먼저 구조계획을 그려주세요.');
      return;
    }

    try {
      const blob = await apiExport(exportLayers, dxfData?.entities);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `structural_${(fileName || 'plan').replace('.dxf', '')}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }, [generatedLayers, structuralElements, dxfData, fileName]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'layers', label: '레이어' },
    { id: 'generate', label: '자동생성' },
    { id: 'tools', label: '도구' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        background: '#161b22', borderBottom: '1px solid #21262d',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#58a6ff' }}>MUGEN</span>
        <span style={{ fontSize: 11, color: '#484f58' }}>구조계획 툴</span>
        <div style={{ flex: 1 }} />

        <input ref={fileRef} type="file" accept=".dxf" onChange={handleFileUpload}
          style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '5px 14px', background: '#238636', border: 'none',
            borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500,
          }}>
          {uploading ? '업로드 중...' : 'DXF 열기'}
        </button>

        {(Object.keys(generatedLayers).length > 0 || Object.values(structuralElements).some(arr => arr.length > 0)) && (
          <button onClick={handleExport}
            style={{
              padding: '5px 14px', background: '#1f6feb', border: 'none',
              borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500,
            }}>
            DXF 내보내기
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{
          width: 260, background: '#0d1117', borderRight: '1px solid #21262d',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #21262d' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '8px 4px', fontSize: 11, border: 'none', cursor: 'pointer',
                  background: activeTab === tab.id ? '#161b22' : 'transparent',
                  color: activeTab === tab.id ? '#c9d1d9' : '#484f58',
                  borderBottom: activeTab === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {activeTab === 'layers' && <LayerSwitcher />}
            {activeTab === 'generate' && <GeneratePanel />}
            {activeTab === 'tools' && <ToolPanel />}
          </div>
        </div>

        {/* Canvas */}
        <StructuralCanvas />
      </div>
    </div>
  );
}
