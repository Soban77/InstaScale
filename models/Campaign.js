const mongoose = require('mongoose');
const { Schema } = mongoose;

const campaignSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, maxlength: 150 },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true }, // creative being promoted
    objective: {
      type: String,
      enum: ['awareness', 'traffic', 'engagement', 'conversions'],
      default: 'awareness'
    },
    dailyBudgetCents: { type: Number, required: true, min: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    targeting: {
      minAge: { type: Number, default: 18 },
      maxAge: { type: Number, default: 65 },
      genders: [{ type: String, enum: ['all', 'male', 'female', 'other'], default: 'all' }],
      interests: [{ type: String }],
      locations: [{ type: String }]
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft'
    },
    // Simple mocked metrics - a real system would aggregate from an events pipeline
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      spendCents: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
