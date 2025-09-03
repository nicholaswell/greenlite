// server/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import Event   from './models/Event.js';
import Journal from './models/Journal.js';
import Goal    from './models/Goal.js';
import Job     from './models/Job.js';
import Note    from './models/Note.js';

import WeeklyFeature from './models/WeeklyFeature.js';
import { currentWeekKey } from './utils/weekKey.js';

import multer from 'multer';

const { Schema, model, models } = mongoose;

dotenv.config();

const app = express();

// --- middleware ---
app.use(cors());                 // if your client is on another origin, configure: cors({ origin: 'http://localhost:5173' })
app.use(express.json());         // for JSON bodies on CRUD + features PUT

// --- DB connect ---
mongoose
  .connect(process.env.MONGODB_URI, { dbName: process.env.MONGO_DB || undefined })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// --- tiny model for ONE stored photo (binary) ---
const PhotoSchema = new Schema(
  {
    _id: { type: String },       // always "photo"
    data: Buffer,                // image bytes
    contentType: String,         // "image/jpeg", etc.
  },
  { collection: 'features_binary', timestamps: true }
);
const PhotoDoc = models.PhotoDoc || model('PhotoDoc', PhotoSchema);

// --- multer for uploads (memory storage) ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB; adjust if needed
});

// ========== ONE-PHOTO endpoints ==========

// POST /api/features/photo  (form-data; field name: "photo")
// Upload/replace the single stored photo
app.post('/api/features/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    await PhotoDoc.findByIdAndUpdate(
      'photo',
      {
        _id: 'photo',
        data: req.file.buffer,
        contentType: req.file.mimetype || 'application/octet-stream',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // return a cache-busted URL you can put directly into <img src="...">
    res.json({ ok: true, url: `/api/features/photo/raw?ts=${Date.now()}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/features/photo/raw
// Serve the raw image bytes (for <img src> / lightbox)
app.get('/api/features/photo/raw', async (_req, res) => {
  try {
    const doc = await PhotoDoc.findById('photo').lean();
    if (!doc || !doc.data) return res.status(404).send('No photo');
    res.set('Content-Type', doc.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'no-store'); // always fetch latest
    const buf = Buffer.from(doc.data.buffer || doc.data);
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
});

// GET /api/features/photo/meta
// Quick existence/updatedAt check (optional helper)
app.get('/api/features/photo/meta', async (_req, res) => {
  try {
    const doc = await PhotoDoc.findById('photo').select('_id updatedAt').lean();
    res.json({ exists: !!doc, updatedAt: doc?.updatedAt ?? null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== generic CRUD helper ==========
function mountCrud(path, Model) {
  // List all
  app.get(`/api/${path}`, async (_req, res) => {
    try {
      const items = await Model.find().sort({ createdAt: -1 });
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // Create
  app.post(`/api/${path}`, async (req, res) => {
    try {
      const item = new Model(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  // Update
  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.sendStatus(404);
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  // Delete
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted) return res.sendStatus(404);
      res.sendStatus(204);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
}

// --- Mount your existing resources ---
mountCrud('events',  Event);
mountCrud('journal', Journal);
mountCrud('goals',   Goal);
mountCrud('jobs',    Job);
mountCrud('notes',   Note);

// --- Weekly Features (custom endpoints) ---

// GET current week for a kind (recipe|photo|song|watch|read)
app.get('/api/features/:kind/current', async (req, res) => {
  try {
    const { kind } = req.params;
    const week = currentWeekKey();
    const doc = await WeeklyFeature.findOne({ kind, week }).lean();
    res.json(doc || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT upsert current week for a kind
// body: { payload: {...} }
app.put('/api/features/:kind/current', async (req, res) => {
  try {
    const { kind } = req.params;
    const { payload = {} } = req.body || {};
    const week = currentWeekKey();

    const updated = await WeeklyFeature.findOneAndUpdate(
      { kind, week },
      { $set: { payload } },
      { upsert: true, new: true }
    ).lean();

    res.json(updated);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Duplicate (kind, week)' });
    res.status(500).json({ error: e.message });
  }
});

// OPTIONAL: recent history for a kind
// /api/features/:kind/history?limit=10
app.get('/api/features/:kind/history', async (req, res) => {
  try {
    const { kind } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const docs = await WeeklyFeature.find({ kind })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- start server ---
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
