// server/routes/features.js
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const WeeklyFeature = require('../models/WeeklyFeature');
const { currentWeekKey } = require('../utils/weekKey');

const router = express.Router();

/* =========================
   Binary "single photo" storage
   ========================= */
// Minimal inline model for the one stored photo
// (separate from WeeklyFeature; this is raw bytes)
const PhotoSchema = new mongoose.Schema(
  {
    _id: { type: String },        // always "photo"
    data: Buffer,                 // image bytes
    contentType: String,          // e.g. "image/jpeg"
  },
  { collection: 'features_binary', timestamps: true }
);
const PhotoDoc = mongoose.models.PhotoDoc || mongoose.model('PhotoDoc', PhotoSchema);

// Multer in-memory upload (10 MB cap, tweak as you like)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/features/photo
 * Upload/replace the single stored photo.
 * Form field: "photo" (type=file)
 */
router.post('/photo', upload.single('photo'), async (req, res) => {
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

    // respond with a cache-busted URL you can drop straight into <img src="">
    res.json({ ok: true, url: `/api/features/photo/raw?ts=${Date.now()}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * GET /api/features/photo/raw
 * Returns the raw image bytes (use for <img src> / lightbox)
 */
router.get('/photo/raw', async (_req, res) => {
  try {
    const doc = await PhotoDoc.findById('photo').lean();
    if (!doc || !doc.data) return res.status(404).send('No photo');
    res.set('Content-Type', doc.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'no-store'); // always latest
    // doc.data can be a BSON Binary with .buffer; normalize to Buffer
    const buf = Buffer.from(doc.data.buffer || doc.data);
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
});

/**
 * GET /api/features/photo/meta
 * Tiny helper to check if the photo exists and when it was updated
 */
router.get('/photo/meta', async (_req, res) => {
  try {
    const doc = await PhotoDoc.findById('photo').select('_id updatedAt').lean();
    res.json({ exists: !!doc, updatedAt: doc?.updatedAt ?? null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* =========================
   Your existing weekly features
   ========================= */

/**
 * GET /api/features/:kind/current
 * Returns the current week's feature document (or null).
 */
router.get('/:kind/current', async (req, res) => {
  try {
    const { kind } = req.params;
    const week = currentWeekKey();
    const doc = await WeeklyFeature.findOne({ kind, week }).lean();
    res.json(doc || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/features/:kind/current
 * Upserts the current week's feature with the provided payload.
 * Body: { payload: {...} }
 */
router.put('/:kind/current', async (req, res) => {
  try {
    const { kind } = req.params;
    const week = currentWeekKey();
    const { payload = {} } = req.body || {};
    const updated = await WeeklyFeature.findOneAndUpdate(
      { kind, week },
      { $set: { payload } },
      { upsert: true, new: true }
    ).lean();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/features/:kind/history?limit=10
 * Optional: recent N weeks for that kind.
 */
router.get('/:kind/history', async (req, res) => {
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

module.exports = router;
