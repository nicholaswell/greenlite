import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    section: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#FEF3C7', // a light pastel by default
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model('Note', noteSchema);
