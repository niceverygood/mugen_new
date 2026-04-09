import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { parseRouter } from './routes/parse.js';
import { generateRouter } from './routes/generate.js';
import { exportRouter } from './routes/export.js';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', uploadRouter);
app.use('/api', parseRouter);
app.use('/api', generateRouter);
app.use('/api', exportRouter);

app.listen(PORT, () => {
  console.log(`[mugen-server] running on http://localhost:${PORT}`);
});
