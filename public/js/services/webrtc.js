import { getSocket } from './socket.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * Wraps a single RTCPeerConnection for one call. Emits signaling events
 * over the shared socket (matching config/socket.js on the server) and
 * exposes simple callbacks for the UI layer to hook into.
 */
export class CallSession {
  constructor({ peerUserId, myUserId, isVideo, onRemoteStream, onEnded }) {
    this.peerUserId = peerUserId;
    this.myUserId = myUserId;
    this.isVideo = isVideo;
    this.onRemoteStream = onRemoteStream;
    this.onEnded = onEnded;
    this.socket = getSocket();
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.localStream = null;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { to: this.peerUserId, candidate: event.candidate });
      }
    };

    this.pc.ontrack = (event) => {
      this.onRemoteStream?.(event.streams[0]);
    };

    this._onIceCandidate = ({ from, candidate }) => {
      if (from === this.peerUserId) {
        this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    };
    this._onCallEnded = () => this.hangUp(false);
    this._onCallRejected = () => this.hangUp(false);

    this.socket.on('ice-candidate', this._onIceCandidate);
    this.socket.on('call-ended', this._onCallEnded);
    this.socket.on('call-rejected', this._onCallRejected);
  }

  async _getLocalMedia() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: this.isVideo
    });
    this.localStream.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream));
    return this.localStream;
  }

  // Caller side: create + send an SDP offer
  async startCall(myName) {
    await this._getLocalMedia();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.socket.emit('call-user', {
      userToCall: this.peerUserId,
      signalData: offer,
      from: this.myUserId,
      name: myName,
      isVideo: this.isVideo
    });
    return this.localStream;
  }

  // Callee side: accept an incoming offer and answer it
  async answerCall(offer) {
    await this._getLocalMedia();
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.socket.emit('answer-call', { to: this.peerUserId, signal: answer });
    return this.localStream;
  }

  // Caller side: apply the callee's answer once it arrives
  async completeCall(answer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  rejectCall() {
    this.socket.emit('reject-call', { to: this.peerUserId });
    this.cleanup();
  }

  hangUp(notifyPeer = true) {
    if (notifyPeer) this.socket.emit('end-call', { to: this.peerUserId });
    this.cleanup();
    this.onEnded?.();
  }

  cleanup() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.pc.close();
    this.socket.off('ice-candidate', this._onIceCandidate);
    this.socket.off('call-ended', this._onCallEnded);
    this.socket.off('call-rejected', this._onCallRejected);
  }
}
