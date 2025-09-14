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
app.use(cors());                 // configure origin if your client is elsewhere
app.use(express.json());         // JSON bodies

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

    res.json({ ok: true, url: `/api/features/photo/raw?ts=${Date.now()}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

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

app.get('/api/features/photo/meta', async (_req, res) => {
  try {
    const doc = await PhotoDoc.findById('photo').select('_id updatedAt').lean();
    res.json({ exists: !!doc, updatedAt: doc?.updatedAt ?? null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== generic CRUD helper ==========
// Allows optional whitelist+coercion per resource and supports PATCH.
function mountCrud(path, Model, options = {}) {
  const {
    sanitizeCreate, // (body) => doc
    sanitizeUpdate, // (body) => $set doc
  } = options;

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
      const doc = sanitizeCreate ? sanitizeCreate(req.body) : req.body;
      const item = new Model(doc);
      await item.save();
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Update (PUT: idempotent, but we still do $set to avoid replacement)
  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      const $set = sanitizeUpdate ? sanitizeUpdate(req.body) : req.body;
      const updated = await Model.findByIdAndUpdate(
        req.params.id,
        { $set },
        { new: true, runValidators: true }
      );
      if (!updated) return res.sendStatus(404);
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Partial update (PATCH)
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try {
      const $set = sanitizeUpdate ? sanitizeUpdate(req.body) : req.body;
      const updated = await Model.findByIdAndUpdate(
        req.params.id,
        { $set },
        { new: true, runValidators: true }
      );
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
// Basic models that don't need special coercion/whitelisting:
mountCrud('events',  Event);
mountCrud('journal', Journal);
mountCrud('jobs',    Job);
mountCrud('notes',   Note);

// Goals: whitelist + coerce dueDate (Date) and target (Number)
const pick = (obj, keys) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([k]) => keys.includes(k)));

function coerceGoal(body) {
  const allowed = pick(body, ['title', 'dueDate', 'completed', 'target']);
  if ('dueDate' in allowed && allowed.dueDate) {
    const d = new Date(allowed.dueDate);
    if (!isNaN(d)) allowed.dueDate = d;
    else delete allowed.dueDate;
  }
  if ('target' in allowed) {
    if (allowed.target === null || allowed.target === '' || typeof allowed.target === 'undefined') {
      allowed.target = null;
    } else {
      const n = Number(allowed.target);
      if (Number.isNaN(n)) delete allowed.target;
      else allowed.target = n;
    }
  }
  if ('completed' in allowed) {
    allowed.completed = !!allowed.completed;
  }
  if ('title' in allowed && typeof allowed.title === 'string') {
    allowed.title = allowed.title.trim();
  }
  return allowed;
}

mountCrud('goals', Goal, {
  sanitizeCreate: coerceGoal,
  sanitizeUpdate: coerceGoal,
});

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
