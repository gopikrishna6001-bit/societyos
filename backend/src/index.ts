import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import residentsRouter from './routes/residents';
import maintenanceRouter from './routes/maintenance';
import noticesRouter from './routes/notices';
import complaintsRouter from './routes/complaints';
import statsRouter from './routes/stats';

const app = express();
const PORT = 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(limiter);

app.use('/api/residents', residentsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SocietyOS API is running' });
});

app.listen(PORT, () => {
  console.log(`SocietyOS backend running on http://localhost:${PORT}`);
});
