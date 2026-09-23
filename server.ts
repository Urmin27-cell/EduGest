import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_DEMO_DATABASE } from './src/demoData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'school_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database file if not present
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DEMO_DATABASE, null, 2), 'utf-8');
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading server DB:', err);
    return INITIAL_DEMO_DATABASE;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing server DB:', err);
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Gestion École - API Scolaire', timestamp: new Date() });
  });

  app.get('/api/data', (req, res) => {
    const db = readDb();
    res.json(db);
  });

  app.post('/api/data/sync', (req, res) => {
    const newData = req.body;
    if (newData && newData.settings) {
      writeDb(newData);
      res.json({ success: true, message: 'Base de données synchronisée sur le serveur.' });
    } else {
      res.status(400).json({ success: false, message: 'Données invalides.' });
    }
  });

  app.post('/api/backup/reset-demo', (req, res) => {
    writeDb(INITIAL_DEMO_DATABASE);
    res.json({ success: true, message: 'Réinitialisation des données de démonstration effectuée.' });
  });

  app.get('/api/backup/download', (req, res) => {
    const db = readDb();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_ecole_${Date.now()}.json`);
    res.send(JSON.stringify(db, null, 2));
  });

  // Vite Integration
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });
}

startServer();
