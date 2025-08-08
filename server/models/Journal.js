import mongoose from 'mongoose';

const journalSchema = new mongoose.Schema({
  title: String,
  content: {
    type: String,
    required: true
  },
  entryDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Journal', journalSchema);
