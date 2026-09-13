const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots and underscores'],
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    fullName: { type: String, trim: true, default: '' },
    bio: { type: String, maxlength: 150, default: '' },
    profilePic: { type: String, default: '/assets/default-avatar.svg' },

    isPrivate: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isBusiness: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOTP: { type: String, select: false },
    twoFactorOTPExpires: { type: Date, select: false },

    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    closeFriends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Pending follow requests received (for private accounts)
    followRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Archived (soft-deleted from feed, visible only to owner) posts/stories
    archivedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    // Saved-post collections, e.g. { name: 'Recipes', posts: [...] }
    collections: [
      {
        name: { type: String, required: true },
        posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
      }
    ],

    cart: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
      }
    ],

    refreshToken: { type: String, select: false }
  },
  { timestamps: true }
);

// Hash the password whenever it is created or modified
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak sensitive fields even if accidentally selected
userSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorOTP;
  delete obj.twoFactorOTPExpires;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
