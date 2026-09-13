import { CallSession } from '../services/webrtc.js';
import { getState } from '../state.js';
import { el, toast } from '../utils.js';

let activeCall = null; // { session, overlay }

/**
 * Starts an outgoing call to peerUser and shows the call overlay.
 */
export async function startCall(peerUser, isVideo) {
  if (activeCall) {
    toast('You are already in a call.', 'error');
    return;
  }
  const { currentUser } = getState();

  const overlay = buildOverlay(peerUser, isVideo, 'Calling\u2026');
  document.body.appendChild(overlay.root);

  const session = new CallSession({
    peerUserId: peerUser._id,
    myUserId: currentUser._id,
    isVideo,
    onRemoteStream: (stream) => attachStream(overlay.remoteVideo, stream),
    onEnded: () => teardown(overlay)
  });
  activeCall = { session, overlay };

  try {
    const localStream = await session.startCall(currentUser.username);
    attachStream(overlay.localVideo, localStream, true);
  } catch (err) {
    toast('Could not access camera/microphone.', 'error');
    teardown(overlay);
    return;
  }

  const socket = session.socket;
  const onAccepted = async (signal) => {
    overlay.status.textContent = 'Connected';
    await session.completeCall(signal);
  };
  socket.once('call-accepted', onAccepted);

  overlay.endBtn.addEventListener('click', () => session.hangUp());
}

/**
 * Called by the app-level socket listener when an 'incoming-call' event
 * arrives, to show an accept/decline prompt.
 */
export function handleIncomingCall({ signal, from, name, isVideo }, socket) {
  if (activeCall) {
    socket.emit('reject-call', { to: from });
    return;
  }

  const { currentUser } = getState();
  const overlay = buildOverlay({ username: name, profilePic: '/assets/default-avatar.svg' }, isVideo, 'Incoming call\u2026');
  overlay.endBtn.textContent = 'Decline';

  const acceptBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Accept');
  overlay.controls.appendChild(acceptBtn);

  document.body.appendChild(overlay.root);

  const session = new CallSession({
    peerUserId: from,
    myUserId: currentUser._id,
    isVideo,
    onRemoteStream: (stream) => attachStream(overlay.remoteVideo, stream),
    onEnded: () => teardown(overlay)
  });
  activeCall = { session, overlay };

  acceptBtn.addEventListener('click', async () => {
    try {
      const localStream = await session.answerCall(signal);
      attachStream(overlay.localVideo, localStream, true);
      overlay.status.textContent = 'Connected';
      acceptBtn.remove();
    } catch (err) {
      toast('Could not access camera/microphone.', 'error');
      session.rejectCall();
    }
  });

  overlay.endBtn.addEventListener('click', () => session.rejectCall());
}

function buildOverlay(peerUser, isVideo, statusText) {
  const remoteVideo = el('video', { autoplay: 'true', playsinline: 'true', style: 'width:100%; height:100%; object-fit:cover;' });
  const localVideo = el('video', {
    autoplay: 'true',
    playsinline: 'true',
    muted: 'true',
    style: 'position:absolute; bottom:100px; right:16px; width:110px; height:150px; object-fit:cover; border-radius:12px; border:2px solid var(--ink-700);'
  });
  const status = el('p', { style: 'color:var(--paper-300); margin-top:8px;' }, statusText);
  const endBtn = el('button', { class: 'btn btn-danger btn-sm', style: 'background:var(--danger); color:white;' }, 'End');
  const controls = el('div', { style: 'display:flex; gap:12px; justify-content:center; padding:20px;' }, [endBtn]);

  const root = el(
    'div',
    {
      style:
        'position:fixed; inset:0; z-index:300; background:var(--ink-950); display:flex; flex-direction:column; align-items:center; justify-content:space-between;'
    },
    [
      el('div', { style: 'flex:1; width:100%; position:relative; display:flex; align-items:center; justify-content:center;' }, [
        isVideo ? remoteVideo : null,
        isVideo ? localVideo : null,
        el('div', { style: 'position:absolute; top:40px; text-align:center;' }, [
          el('img', { class: 'avatar', style: 'width:88px;height:88px; margin:0 auto;', src: peerUser.profilePic, alt: peerUser.username }),
          el('h2', { style: 'margin-top:12px;' }, peerUser.username),
          status
        ])
      ]),
      controls
    ]
  );

  return { root, remoteVideo, localVideo, status, endBtn, controls };
}

function attachStream(videoEl, stream, muted = false) {
  if (!videoEl) return;
  videoEl.srcObject = stream;
  videoEl.muted = muted;
}

function teardown(overlay) {
  overlay.root.remove();
  activeCall = null;
}
