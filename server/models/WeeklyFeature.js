// ES module version
import mongoose from 'mongoose';

const { Schema } = mongoose;

const WeeklyFeatureSchema = new Schema(
  {
    kind: { type: String, enum: ['recipe', 'photo', 'song', 'watch'], required: true },
    week: { type: String, required: true }, // e.g. "2025-W33" (ISO week)
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Enforce one doc per (kind, week)
WeeklyFeatureSchema.index({ kind: 1, week: 1 }, { unique: true });

const WeeklyFeature = mongoose.models.WeeklyFeature
  || mongoose.model('WeeklyFeature', WeeklyFeatureSchema);

export default WeeklyFeature;
