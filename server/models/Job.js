import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  company: String,
  link: String,
  appliedDate: {
    type: Date,
    default: Date.now
  },
  responded: {
    type: Boolean,
    default: false
  },
  followUpSent: {
    type: Boolean,
    default: false
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.model('Job', jobSchema);
