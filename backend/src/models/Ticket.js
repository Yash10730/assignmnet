const mongoose = require('mongoose');
const {
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_CATEGORY,
  PRIORITY_RANK,
} = require('../config/constants');

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 150 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    category: {
      type: String,
      enum: Object.values(TICKET_CATEGORY),
      default: TICKET_CATEGORY.GENERAL,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
      index: true,
    },
    // Derived numeric value used for sorting by priority
    priorityRank: { type: Number, default: PRIORITY_RANK.medium },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commentCount: { type: Number, default: 0 },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for the most common admin filters + sorting
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ createdBy: 1, createdAt: -1 });

ticketSchema.pre('save', function syncDerivedFields(next) {
  if (this.isNew || this.isModified('priority')) {
    this.priorityRank = PRIORITY_RANK[this.priority];
  }
  if (!this.isNew && this.isModified('status')) {
    if (this.status === TICKET_STATUS.RESOLVED) this.resolvedAt = new Date();
    if (this.status === TICKET_STATUS.CLOSED) this.closedAt = new Date();
    if (this.status === TICKET_STATUS.OPEN || this.status === TICKET_STATUS.IN_PROGRESS) {
      this.resolvedAt = null;
    }
  }
  next();
});

ticketSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.priorityRank;
    return ret;
  },
});

module.exports = mongoose.model('Ticket', ticketSchema);
