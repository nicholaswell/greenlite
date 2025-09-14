import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dueDate: Date,
    completed: { type: Boolean, default: false },
    target: { type: Number, min: 0, default: null }, // ← add this
  },
  { timestamps: true, strict: true }
);

// Avoid OverwriteModelError in dev/hot-reload:
export default mongoose.models.Goal || mongoose.model('Goal', goalSchema);
