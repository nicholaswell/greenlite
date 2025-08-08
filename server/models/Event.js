import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  start: {
    type: Date,
    required: true
  },
  end: Date
}, {
  timestamps: true
});

export default mongoose.model('Event', eventSchema);
