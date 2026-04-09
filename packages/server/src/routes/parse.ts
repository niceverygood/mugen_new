import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import iconv from 'iconv-lite';
import { parseDXF } from '@mugen/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

export const parseRouter = Router();

parseRouter.get('/parse/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const buf = fs.readFileSync(filePath);

  // Try UTF-8 first, fallback to Shift_JIS (JW CAD default)
  let text = buf.toString('utf-8');
  if (text.includes('\ufffd') || text.includes('\u0000')) {
    text = iconv.decode(buf, 'Shift_JIS');
  }

  const dxfData = parseDXF(text);
  res.json(dxfData);
});
