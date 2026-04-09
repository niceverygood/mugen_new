import type { DXFEntity, GeneratedLayers } from '@mugen/shared';

export function exportDXF(generatedLayers: GeneratedLayers, originalEntities: DXFEntity[] = []): string {
  const allLayers = new Set<string>();
  const allEntities: DXFEntity[] = [...originalEntities, ...Object.values(generatedLayers).flat()];
  allEntities.forEach((e: any) => { if (e.layer) allLayers.add(e.layer); });

  // Header
  let d = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n';

  // Tables - Layer definitions
  d += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n' + allLayers.size + '\n';
  allLayers.forEach(name => {
    d += `0\nLAYER\n2\n${name}\n70\n0\n62\n7\n6\nCONTINUOUS\n`;
  });
  d += '0\nENDTAB\n0\nENDSEC\n';

  // Entities
  d += '0\nSECTION\n2\nENTITIES\n';

  allEntities.forEach((e: any) => {
    const lyr = e.layer || '0';
    const col = e.color ? `\n62\n${e.color}` : '';

    if (e.type === 'LINE') {
      d += `0\nLINE\n8\n${lyr}${col}\n10\n${(e.x1 || 0).toFixed(2)}\n20\n${(e.y1 || 0).toFixed(2)}\n30\n0\n11\n${(e.x2 || 0).toFixed(2)}\n21\n${(e.y2 || 0).toFixed(2)}\n31\n0\n`;
    } else if (e.type === 'LWPOLYLINE' && e.vertices) {
      d += `0\nLWPOLYLINE\n8\n${lyr}${col}\n90\n${e.vertices.length}\n70\n${e.flags || 0}\n`;
      e.vertices.forEach((v: { x: number; y: number }) => {
        d += `10\n${v.x.toFixed(2)}\n20\n${v.y.toFixed(2)}\n`;
      });
    } else if (e.type === 'CIRCLE') {
      d += `0\nCIRCLE\n8\n${lyr}${col}\n10\n${(e.x || 0).toFixed(2)}\n20\n${(e.y || 0).toFixed(2)}\n30\n0\n40\n${(e.r || 50).toFixed(2)}\n`;
    } else if (e.type === 'ARC') {
      d += `0\nARC\n8\n${lyr}${col}\n10\n${(e.x || 0).toFixed(2)}\n20\n${(e.y || 0).toFixed(2)}\n30\n0\n40\n${(e.r || 50).toFixed(2)}\n50\n${(e.sa || 0).toFixed(2)}\n51\n${(e.ea || 360).toFixed(2)}\n`;
    } else if (e.type === 'TEXT' || e.type === 'MTEXT') {
      d += `0\nTEXT\n8\n${lyr}${col}\n10\n${(e.x || 0).toFixed(2)}\n20\n${(e.y || 0).toFixed(2)}\n30\n0\n40\n100\n1\n${e.text || ''}\n`;
    }
  });

  d += '0\nENDSEC\n0\nEOF\n';
  return d;
}
