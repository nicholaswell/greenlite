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

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Helper to mount CRUD for a single model
function mountCrud(path, Model) {
  // List all
  app.get(`/api/${path}`, async (req, res) => {
    const items = await Model.find().sort({ createdAt: -1 });
    res.json(items);
  });
  // Create new
  app.post(`/api/${path}`, async (req, res) => {
    const item = new Model(req.body);
    await item.save();
    res.status(201).json(item);
  });
  // Update existing
  app.put(`/api/${path}/:id`, async (req, res) => {
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  });
  // Delete
  app.delete(`/api/${path}/:id`, async (req, res) => {
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.sendStatus(404);
    res.sendStatus(204);
  });
}

// Mount for each resource
mountCrud('events',   Event);
mountCrud('journal',  Journal);
mountCrud('goals',    Goal);
mountCrud('jobs',     Job);
mountCrud('notes',    Note);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
