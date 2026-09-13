const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 2000 },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    images: [{ type: String, required: true }],
    category: { type: String, default: 'general', index: true },
    inventory: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Posts this product is tagged on (for shoppable posts)
    taggedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
