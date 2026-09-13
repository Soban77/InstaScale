const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

function signAccessToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
  });
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs
  };
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ message: `That ${field} is already taken.` });
    }

    const user = await User.create({ username, email, password, fullName });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.status(201).json({
      message: 'Account created successfully.',
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body; // identifier = username or email

    if (!identifier || !password) {
      return res.status(400).json({ message: 'identifier and password are required.' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect username/email or password.' });
    }

    // If 2FA is enabled, issue a short-lived OTP instead of logging in directly
    if (user.twoFactorEnabled) {
      const otp = String(crypto.randomInt(100000, 999999));
      user.twoFactorOTP = otp;
      user.twoFactorOTPExpires = Date.now() + 5 * 60 * 1000;
      await user.save();

      // In production this would be sent via SMS/email/push provider.
      console.log(`[DEV] 2FA OTP for ${user.username}: ${otp}`);

      return res.status(200).json({
        message: 'OTP sent. Please verify to complete login.',
        requires2FA: true,
        userId: user._id
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.status(200).json({
      message: 'Login successful.',
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/2fa/verify
async function verify2FA(req, res, next) {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId).select('+twoFactorOTP +twoFactorOTPExpires');

    if (!user || !user.twoFactorOTP) {
      return res.status(400).json({ message: 'No pending verification for this user.' });
    }
    if (user.twoFactorOTPExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please log in again.' });
    }
    if (user.twoFactorOTP !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP.' });
    }

    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpires = undefined;

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.status(200).json({
      message: '2FA verified. Login complete.',
      user: user.toPublicJSON(),
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required.' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token.' });
    }

    const accessToken = signAccessToken(user);
    res.cookie('accessToken', accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token.' });
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save();
    }
    res.clearCookie('accessToken');
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getCurrentUser(req, res) {
  res.status(200).json({ user: req.user.toPublicJSON() });
}

module.exports = { register, login, verify2FA, refresh, logout, getCurrentUser };
