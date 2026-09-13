# InstaScale — Complete Implementation

A working implementation of all five modules in the PRD: **Auth & Account
Settings**, **Core Social & Discovery**, **Real-Time Communication**,
**Profile & Personalization**, and **Commerce & Admin**. Stack matches the
spec exactly: Node/Express + MongoDB/Mongoose backend, Socket.IO for
messaging/presence/WebRTC signaling, vanilla-JS SPA frontend, no build step.

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance:
  - Local: `mongodb://127.0.0.1:27017/instascale` (install MongoDB Community
    Server, or `docker run -d -p 27017:27017 mongo`)
  - Or a free MongoDB Atlas cluster

## 2. Setup

```bash
cd instascale
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your connection string
- `JWT_SECRET` / `REFRESH_TOKEN_SECRET` — long random strings, e.g.:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## 3. Run

```bash
npm run dev      # nodemon, auto-restart
# or
npm start
```

Open **http://localhost:5000**. One process serves the API, the SPA, and
the Socket.IO server together.

## 4. Try every module

1. **Auth**: register two accounts (use an incognito window for the
   second). To test 2FA, set `twoFactorEnabled: true` on a user directly in
   MongoDB, then log in again — the OTP is logged to the server console
   (`[DEV] 2FA OTP for ...`), since no SMS/email provider is wired up.
2. **Core Social**: post a photo/video (top-right **+**), post a story (tap
   the **+** on your own avatar ring — it expires in 24h automatically via
   a MongoDB TTL index), follow the other account from Search, like/comment.
3. **Real-Time Communication**: open the paper-plane icon to message the
   other account. Messages arrive instantly in both open tabs via
   Socket.IO. Tap the phone/camera icons in a chat to place a WebRTC
   audio/video call — grant mic/camera permission in both tabs (works over
   `localhost`; a real deployment needs HTTPS for `getUserMedia`). If two
   accounts aren't already connected (mutual follow), the first message
   creates a **message request** the recipient must accept.
4. **Profile & Personalization**: from your own profile, use the icon row
   for **Saved** (collections), **Archive** (posts you've hidden from your
   grid without deleting), **Edit profile**, and tap follower/following
   counts to see the list.
5. **Commerce**: products aren't seeded — create one via the API (see
   below), then browse `#/shop`, add to cart, and checkout (Stripe is
   mocked: an order is created as "paid" immediately, no real charge).
6. **Creator & Ads**: `#/creator/dashboard` shows engagement metrics for
   your own posts and lets you draft an ad campaign against a post ID.
7. **Admin**: promote a user with `node scripts/seed.js you@example.com`,
   then visit `#/admin` while logged in as that user to see the report
   queue and platform insights. File a report against a post via
   `POST /api/reports` to populate the queue.

## 5. Project structure

Matches the PRD's directory spec:

```
instascale/
├── config/          db.js, socket.js
├── controllers/     auth, user, post, story, message, shop, admin, creator
├── middleware/       auth (JWT + admin guard), upload (multer), errorHandler
├── models/           User, Post, Comment, Story, Conversation, Message,
│                      Product, Order, Campaign, Report
├── routes/
├── services/         ffmpegService (image thumbnails via sharp; video
│                      compression documented as a stub - see file),
│                      webrtcService (signaling contract; implementation
│                      lives in config/socket.js)
├── public/            vanilla-JS SPA (hash router, no build step)
│   ├── css/
│   └── js/
│       ├── app.js         router + bootstrap
│       ├── state.js       tiny observable store
│       ├── services/       api.js (REST), socket.js, webrtc.js
│       └── views/         one module per screen (18 views)
├── scripts/seed.js   promote a user to admin, for testing
├── server.js
└── package.json
```

## 6. API summary

### Auth & Users
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register, /login, /2fa/verify, /refresh, /logout | Full JWT lifecycle |
| GET | /api/auth/me | Current user |
| GET | /api/users/:username | Public profile + posts |
| PUT | /api/users/profile | Update bio/avatar/privacy (multipart `avatar`) |
| POST | /api/users/:id/follow, /:id/block | Follow (or request)/unfollow, block |
| GET | /api/users/:id/followers, /:id/following | Follow lists |
| POST | /api/users/:id/follow-request/accept | Approve a private-account follower |
| GET/POST | /api/users/collections | Saved-post collections |
| POST | /api/users/:postId/save | Toggle save (+ optional collection) |

### Posts, Stories & Reels
| Method | Path | Description |
|---|---|---|
| POST | /api/posts | Create (multipart `media`, up to 10 files) |
| GET | /api/posts/feed, /reels | Paginated feeds |
| POST | /api/posts/:id/like, /:id/comments | Like, comment |
| POST | /api/posts/:id/archive | Hide from grid without deleting |
| GET | /api/posts/archive/mine | Your archived posts |
| POST | /api/stories | 24h auto-expiring (multipart `media`) |
| GET | /api/stories/feed | Grouped active stories |
| POST | /api/stories/:id/view | Viewer tracking |

### Messaging (+ Socket.IO)
| Method | Path | Description |
|---|---|---|
| GET/POST | /api/messages/conversations | Inbox + start 1-on-1/group chat |
| GET/POST | /api/messages/:conversationId | History / send (text or multipart `media`) |
| POST/DELETE | /api/messages/requests/:id/accept, /:id | Accept/decline message requests |
| Socket events | `join-conversation`, `typing`, `receive-message`, `call-user`, `answer-call`, `ice-candidate`, `end-call` | See `services/webrtcService.js` for the full signaling contract |

### Commerce
| Method | Path | Description |
|---|---|---|
| GET/POST | /api/shop/products | Storefront listing / seller creates (multipart `images`) |
| GET/POST/PUT/DELETE | /api/shop/cart | Cart management |
| POST | /api/shop/checkout | Mocked Stripe checkout → creates an Order |

### Creator & Admin
| Method | Path | Description |
|---|---|---|
| GET | /api/creator/dashboard | Impressions/reach estimate, top posts |
| GET/POST/PUT | /api/creator/campaigns | Ad campaign builder |
| POST | /api/reports | File a moderation report (any user) |
| GET/PUT | /api/admin/reports | Moderation queue (admin only) |
| POST | /api/admin/users/:id/ban, /unban | Ban controls (admin only) |
| GET | /api/admin/insights | Platform stats (admin only) |

## 7. Known simplifications

- **Media storage** is local disk (`public/uploads/`), per the PRD's "Local
  Storage" option. Swap `middleware/upload.js` for GridFS/S3 later without
  touching controllers.
- **Video processing** (`fluent-ffmpeg` compression + thumbnailing) is
  documented as a stub in `services/ffmpegService.js` — it needs an
  `ffmpeg` binary on the host, which isn't guaranteed in every environment.
  Image thumbnailing via `sharp` is implemented.
- **Payments** are mocked — `POST /api/shop/checkout` never calls Stripe;
  it creates an `Order` as `status: 'paid'` with a fake reference, matching
  the PRD's "checkout mocks."
- **Ad campaign metrics** are seeded with plausible numbers on activation
  rather than aggregated from a real events pipeline.
- **WebRTC** uses raw browser `RTCPeerConnection` + a public STUN server
  (no TURN server), signaled over the existing Socket.IO connection. This
  works on localhost and most direct connections; production use behind
  restrictive NATs would need a TURN server added to `ICE_SERVERS` in
  `public/js/services/webrtc.js`.
- **Group video/audio calls** have server-side room support
  (`join-call-room`/`leave-call-room` events) but the client only wires up
  1-on-1 calls; extending the call overlay to a mesh/SFU topology for
  groups is the next step.
