const mongoose = require('mongoose');
const { EVENT_TYPES } = require('../events/eventTypes');

/**
 * Append-only audit trail. One document per domain event.
 * Written by the activity-log event handler, never by controllers directly.
 */
const activityLogSchema = new mongoose.Schema(
  {
    event: { type: String, enum: Object.values(EVENT_TYPES), required: true, index: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    // Event-specific details, e.g. { from: 'open', to: 'resolved' } or changed fields
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ ticket: 1, createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
