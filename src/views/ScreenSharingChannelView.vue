<template>
  <div class="screen-sharing-channel-container">
    <div class="video-container">
      <!-- Remote/local video -->
      <video v-show="showVideo" ref="video" playsinline autoplay muted/>

      <!-- Connection quality badge -->
      <div v-if="showVideo && quality" class="quality-badge" :class="quality.level" :title="quality.tooltip">
        <span class="quality-dot"/>
        <span class="quality-text">{{ quality.label }}</span>
      </div>

      <!-- Host: connected viewer count -->
      <div v-if="showVideo && isHost" class="viewer-badge" :title="'연결된 시청자 / Connected viewers'">
        👁 {{ connectedViewerCount }}
      </div>

      <!-- Status / error overlay -->
      <div v-if="overlay.show" class="status-overlay" :class="overlay.kind">
        <loading-spinner v-if="overlay.kind === 'loading' || overlay.kind === 'reconnecting'" class="overlay-spinner"/>
        <div v-else class="overlay-icon">⚠️</div>
        <div class="overlay-title">{{ overlay.title }}</div>
        <div v-if="overlay.detail" class="overlay-detail" v-html="overlay.detail"></div>
        <div v-if="overlay.hint" class="overlay-hint" v-html="overlay.hint"></div>
        <div v-if="overlay.showRetry" class="overlay-actions">
          <button @click="retryConnection">다시 시도 / Retry</button>
          <button class="secondary" @click="partChannel">나가기 / Leave</button>
        </div>
      </div>

      <div v-show="showVideo" class="video-footer">
        <div class="footer-left">
          <button @click="copyShareLink">Copy Share Link</button>
          <button @click="toggleMute">{{ muteLabel }}</button>
          <button v-if="isFullscreenSupported" @click="toggleFullscreen">⛶ Fullscreen</button>
          <select v-if="isHost" v-model="selectedQuality" @change="applyQuality" class="quality-select" title="화질 / Quality">
            <option value="auto">화질: 자동 / Auto</option>
            <option value="high">화질: 높음 / High (1080p)</option>
            <option value="medium">화질: 보통 / Medium (720p)</option>
            <option value="low">화질: 낮음 / Low (480p)</option>
          </select>
        </div>
        <div class="footer-buttons">
          <button @click="partChannel">Exit</button>
        </div>
      </div>
    </div>
    <div v-if="isJoined" class="user-container">
      <user-form class="user-form" :token="token" :channel-id="channelId" :update-key="userUpdateKey"/>
      <message-form :token="token" :channel-id="channelId" :new-simple-message="newSimpleMessage"/>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { joinSharingChannel } from '@/api/sharing';
import SignalingWebSocketClient from '@/utils/websocket';
import { HttpApiError } from '@/api/common/httpApiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import MessageForm from '@/components/MessageForm.vue';
import { SimpleMessageDto } from '@/api/models/sharing.dtos';
import UserForm from '@/components/UserForm.vue';

// Phase of the connection from the perspective of the local user.
type ConnectionPhase = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'ended';

// How long we wait for the very first successful connection before assuming
// the P2P path is blocked (no TURN server is operated).
const INITIAL_CONNECT_TIMEOUT_MS = 20000;
// Grace period after an established connection drops before we give up on it.
const DISCONNECT_GRACE_MS = 8000;
// Maximum number of ICE-restart attempts the host performs per viewer.
const MAX_ICE_RESTARTS = 2;
// Quality stats sampling interval.
const STATS_INTERVAL_MS = 2000;

// Resolution / frame-rate presets used by the host quality selector.
const QUALITY_PRESETS: { [preset: string]: any } = {
  auto: {},
  high: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  medium: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  low: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
};

export default defineComponent({
  name: 'ScreenSharingChannelView',
  components: { UserForm, MessageForm, LoadingSpinner },
  props: {
    channelId: {
      type: String,
      required: true,
    },
    hostToken: {
      type: String,
      required: false,
    },
    guestToken: {
      type: String,
      required: false,
    },
  },
  computed: {
    isHost(): boolean {
      return this.hostToken ? true : false;
    },
    isGuest(): boolean {
      return this.guestToken ? true : false;
    },
    token(): string {
      return this.hostToken ?? this.guestToken ?? '';
    },
    // Whether the <video> element should be visible.
    showVideo(): boolean {
      if (this.isHost) {
        return !this.isLoading;
      }
      return this.phase === 'connected';
    },
    connectedViewerCount(): number {
      return Object.values(this.peerStates).filter((s) => s === 'connected').length;
    },
    muteLabel(): string {
      if (this.isHost) {
        return this.audioEnabled ? '🔊 오디오 끄기 / Mute' : '🔇 오디오 켜기 / Unmute';
      }
      return this.audioMuted ? '🔇 소리 켜기 / Unmute' : '🔊 소리 끄기 / Mute';
    },
    // Drives the status / error overlay shown over the video area.
    overlay(): { show: boolean; kind: string; title: string; detail: string; hint: string; showRetry: boolean } {
      // Host: only block the view while the local screen is being captured.
      if (this.isHost) {
        if (this.isLoading) {
          return { show: true, kind: 'loading', title: '화면을 준비하는 중입니다… / Preparing screen…', detail: '', hint: '', showRetry: false };
        }
        return { show: false, kind: '', title: '', detail: '', hint: '', showRetry: false };
      }

      // Guest perspective.
      switch (this.phase) {
        case 'connecting':
          return {
            show: true,
            kind: 'loading',
            title: '호스트와 연결하는 중입니다… / Connecting to the host…',
            detail: '',
            hint: '',
            showRetry: false,
          };
        case 'reconnecting':
          return {
            show: true,
            kind: 'reconnecting',
            title: '연결이 불안정하여 재연결하는 중입니다… / Connection unstable, reconnecting…',
            detail: '',
            hint: '',
            showRetry: false,
          };
        case 'failed':
          return {
            show: true,
            kind: 'failed',
            title: '화면을 불러올 수 없습니다 / Unable to load the shared screen',
            detail:
              'P2P 직접 연결에 실패했습니다. 양쪽 네트워크의 방화벽이나 NAT 제한(예: 회사·학교 네트워크, 대칭형 NAT) 때문일 수 있습니다.<br/>' +
              'This service does not run a relay (TURN) server, so only direct peer-to-peer connections are supported. ' +
              'A firewall or NAT on either side likely blocked the direct connection.',
            hint:
              '👉 모바일 핫스팟 등 다른 네트워크에서 다시 시도하면 연결될 수 있습니다.<br/>' +
              '👉 Try again on a different network (e.g. a mobile hotspot).',
            showRetry: true,
          };
        case 'ended':
          return {
            show: true,
            kind: 'failed',
            title: '화면 공유가 종료되었습니다 / The screen sharing has ended',
            detail: '호스트가 공유를 종료했습니다. / The host has stopped sharing.',
            hint: '',
            showRetry: false,
          };
        default:
          return { show: false, kind: '', title: '', detail: '', hint: '', showRetry: false };
      }
    },
  },
  data() {
    return {
      videoElement: {} as HTMLVideoElement,
      stream: {} as MediaStream,
      rtcPeerConnections: new Map<string, RTCPeerConnection>(),
      rtcConfiguration: {
        // NOTE: Only STUN servers are configured on purpose — no TURN relay is
        // operated. Connections that cannot traverse NAT/firewalls will fail,
        // and the UI surfaces that to the user instead of hanging silently.
        iceServers: [
          {
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302',
              'stun:stun4.l.google.com:19302',
            ],
          },
        ],
      },
      signalingWebSocketClient: {} as SignalingWebSocketClient,
      newSimpleMessage: {} as SimpleMessageDto,
      userUpdateKey: {},
      isLoading: false,
      isJoined: false,
      // Connection phase (guest view / overall).
      phase: 'idle' as ConnectionPhase,
      // Per-peer RTCPeerConnection.connectionState, keyed by userId (reactive).
      peerStates: {} as Record<string, string>,
      // ICE-restart attempt counter per peer (host side).
      iceRestartCounts: new Map<string, number>(),
      // Pending disconnect-grace timers per peer.
      disconnectTimers: new Map<string, number>(),
      // Initial-connect timeout handle (guest side).
      connectTimeoutHandle: 0 as number,
      // Audio state.
      audioMuted: true, // guest: local playback muted (required for autoplay)
      audioEnabled: true, // host: outgoing audio track enabled
      // Fullscreen support flag.
      isFullscreenSupported: false,
      // Host quality preset.
      selectedQuality: 'auto',
      // Connection quality stats.
      quality: null as null | { level: string; label: string; tooltip: string },
      statsIntervalHandle: 0 as number,
      statsPrev: null as null | { bytes: number; timestamp: number },
      monitoredPeer: null as null | RTCPeerConnection,
    };
  },
  methods: {
    // ---- Peer connection setup --------------------------------------------
    createPeerConnection(userId: string): RTCPeerConnection {
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

      peerConnection.onsignalingstatechange = () => {
        console.log(`SignalingState(${userId}): ${peerConnection.signalingState}`);
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log(`IceConnectionState(${userId}): ${peerConnection.iceConnectionState}`);
        // ICE "failed" is the canonical signal that the direct path is dead.
        if (peerConnection.iceConnectionState === 'failed') {
          if (this.isHost) {
            this.tryRestartIce(userId, peerConnection);
          }
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(`ConnectionState(${userId}): ${peerConnection.connectionState}`);
        this.handlePeerConnectionState(userId, peerConnection);
      };

      return peerConnection;
    },
    handlePeerConnectionState(userId: string, peerConnection: RTCPeerConnection) {
      const state = peerConnection.connectionState;
      this.peerStates[userId] = state;

      if (this.isGuest) {
        switch (state) {
          case 'connected':
            this.clearConnectTimeout();
            this.clearDisconnectTimer(userId);
            this.phase = 'connected';
            this.startStatsMonitor(peerConnection);
            break;
          case 'connecting':
          case 'new':
            if (this.phase !== 'reconnecting') {
              this.phase = 'connecting';
            }
            break;
          case 'disconnected':
            this.phase = 'reconnecting';
            this.scheduleDisconnectFailure(userId);
            break;
          case 'failed':
            this.failConnection();
            break;
        }
      } else if (this.isHost) {
        switch (state) {
          case 'connected':
            this.clearDisconnectTimer(userId);
            this.iceRestartCounts.set(userId, 0);
            if (!this.monitoredPeer) {
              this.startStatsMonitor(peerConnection);
            }
            this.$toast.success('시청자와 연결되었습니다. / A viewer connected.');
            break;
          case 'disconnected':
            this.scheduleDisconnectFailure(userId);
            break;
          case 'failed':
            this.tryRestartIce(userId, peerConnection);
            break;
        }
      }
    },
    // ---- ICE restart / failure handling -----------------------------------
    async tryRestartIce(userId: string, peerConnection: RTCPeerConnection) {
      if (peerConnection.connectionState === 'closed') {
        return;
      }
      const attempts = this.iceRestartCounts.get(userId) ?? 0;
      if (attempts >= MAX_ICE_RESTARTS) {
        // Out of retries — the direct connection genuinely failed.
        this.$toast.error('한 시청자와 P2P 연결에 실패했습니다 (네트워크 제한). / Failed to connect to a viewer (network restricted).');
        return;
      }
      this.iceRestartCounts.set(userId, attempts + 1);
      try {
        if (typeof peerConnection.restartIce === 'function') {
          peerConnection.restartIce();
        }
        const offer = await peerConnection.createOffer({ iceRestart: true });
        await peerConnection.setLocalDescription(offer);
        this.signalingWebSocketClient.relaySessionDescription(userId, offer);
      } catch (error) {
        console.error('ICE restart failed', error);
      }
    },
    scheduleDisconnectFailure(userId: string) {
      this.clearDisconnectTimer(userId);
      const handle = window.setTimeout(() => {
        const peer = this.rtcPeerConnections.get(userId);
        if (!peer) {
          return;
        }
        if (peer.connectionState === 'connected') {
          return; // recovered in the meantime
        }
        if (this.isGuest) {
          this.failConnection();
        } else if (this.isHost) {
          this.tryRestartIce(userId, peer);
        }
      }, DISCONNECT_GRACE_MS);
      this.disconnectTimers.set(userId, handle);
    },
    clearDisconnectTimer(userId: string) {
      const handle = this.disconnectTimers.get(userId);
      if (handle) {
        window.clearTimeout(handle);
        this.disconnectTimers.delete(userId);
      }
    },
    startConnectTimeout() {
      this.clearConnectTimeout();
      this.connectTimeoutHandle = window.setTimeout(() => {
        if (this.phase !== 'connected') {
          this.failConnection();
        }
      }, INITIAL_CONNECT_TIMEOUT_MS);
    },
    clearConnectTimeout() {
      if (this.connectTimeoutHandle) {
        window.clearTimeout(this.connectTimeoutHandle);
        this.connectTimeoutHandle = 0;
      }
    },
    failConnection() {
      if (this.phase === 'connected') {
        return;
      }
      this.phase = 'failed';
      this.isLoading = false;
      this.clearConnectTimeout();
      this.stopStatsMonitor();
    },
    retryConnection() {
      // Re-mount the route to restart the whole signaling/RTC flow.
      this.$router.go(0);
    },
    // ---- Quality monitoring -----------------------------------------------
    startStatsMonitor(peerConnection: RTCPeerConnection) {
      this.stopStatsMonitor();
      this.monitoredPeer = peerConnection;
      this.statsPrev = null;
      this.statsIntervalHandle = window.setInterval(() => {
        this.sampleStats();
      }, STATS_INTERVAL_MS);
    },
    stopStatsMonitor() {
      if (this.statsIntervalHandle) {
        window.clearInterval(this.statsIntervalHandle);
        this.statsIntervalHandle = 0;
      }
      this.monitoredPeer = null;
      this.statsPrev = null;
      this.quality = null;
    },
    async sampleStats() {
      const peer = this.monitoredPeer;
      if (!peer || peer.connectionState !== 'connected') {
        return;
      }
      try {
        const report = await peer.getStats();
        let bytes = 0;
        let timestamp = 0;
        let packetsLost = 0;
        let packetsTotal = 0;
        let rtt = -1;
        report.forEach((stat: any) => {
          if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
            bytes = stat.bytesReceived ?? 0;
            timestamp = stat.timestamp ?? 0;
            packetsLost = stat.packetsLost ?? 0;
            packetsTotal = (stat.packetsReceived ?? 0) + (stat.packetsLost ?? 0);
          } else if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
            bytes = stat.bytesSent ?? 0;
            timestamp = stat.timestamp ?? 0;
          } else if (stat.type === 'remote-inbound-rtp' && stat.kind === 'video') {
            packetsLost = stat.packetsLost ?? packetsLost;
            if (typeof stat.roundTripTime === 'number') {
              rtt = stat.roundTripTime;
            }
          } else if (stat.type === 'candidate-pair' && (stat.nominated || stat.state === 'succeeded')) {
            if (typeof stat.currentRoundTripTime === 'number') {
              rtt = stat.currentRoundTripTime;
            }
          }
        });

        let kbps = 0;
        if (this.statsPrev && timestamp > this.statsPrev.timestamp) {
          const deltaBits = (bytes - this.statsPrev.bytes) * 8;
          const deltaSeconds = (timestamp - this.statsPrev.timestamp) / 1000;
          kbps = deltaSeconds > 0 ? Math.max(0, deltaBits / deltaSeconds / 1000) : 0;
        }
        this.statsPrev = { bytes, timestamp };

        const lossPct = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;
        const rttMs = rtt >= 0 ? Math.round(rtt * 1000) : -1;
        const width = this.videoElement?.videoWidth ?? 0;
        const height = this.videoElement?.videoHeight ?? 0;

        // Classify quality from loss + rtt + bitrate.
        let level = 'good';
        if (lossPct > 5 || (rttMs >= 0 && rttMs > 400) || (kbps > 0 && kbps < 200)) {
          level = 'poor';
        } else if (lossPct > 2 || (rttMs >= 0 && rttMs > 200) || (kbps > 0 && kbps < 600)) {
          level = 'fair';
        }
        const labels: Record<string, string> = { good: '양호 / Good', fair: '보통 / Fair', poor: '나쁨 / Poor' };
        const tooltipParts = [
          width && height ? `${width}×${height}` : '',
          kbps > 0 ? `${Math.round(kbps)} kbps` : '',
          rttMs >= 0 ? `RTT ${rttMs}ms` : '',
          `loss ${lossPct.toFixed(1)}%`,
        ].filter(Boolean);
        this.quality = { level, label: labels[level], tooltip: tooltipParts.join(' · ') };
      } catch {
        // getStats is not critical; ignore failures.
      }
    },
    // ---- Media controls ---------------------------------------------------
    toggleMute() {
      if (this.isHost) {
        const audioTracks = this.stream instanceof MediaStream ? this.stream.getAudioTracks() : [];
        if (audioTracks.length === 0) {
          this.$toast.info('공유 중인 오디오가 없습니다. / No audio is being shared.');
          return;
        }
        this.audioEnabled = !this.audioEnabled;
        audioTracks.forEach((track) => {
          track.enabled = this.audioEnabled;
        });
      } else {
        this.videoElement.muted = !this.videoElement.muted;
        this.audioMuted = this.videoElement.muted;
      }
    },
    async toggleFullscreen() {
      const el = this.videoElement as any;
      const doc = document as any;
      try {
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          }
        } else if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.webkitEnterFullscreen) {
          // iOS Safari only supports fullscreen on the video element itself.
          el.webkitEnterFullscreen();
        }
      } catch (error) {
        console.error('Fullscreen failed', error);
      }
    },
    async applyQuality() {
      if (!this.isHost || !(this.stream instanceof MediaStream)) {
        return;
      }
      const videoTrack = this.stream.getVideoTracks()[0];
      if (!videoTrack || typeof videoTrack.applyConstraints !== 'function') {
        return;
      }
      try {
        await videoTrack.applyConstraints(QUALITY_PRESETS[this.selectedQuality] ?? {});
        this.$toast.success('화질 설정을 적용했습니다. / Quality updated.');
      } catch (error) {
        this.$toast.warning('이 브라우저/화면 소스에서는 화질 변경을 지원하지 않습니다. / Quality change is not supported here.');
      }
    },
    // ---- Signaling --------------------------------------------------------
    async initializeWebSocket(authorizationToken: string) {
      this.signalingWebSocketClient = new SignalingWebSocketClient(authorizationToken);

      this.signalingWebSocketClient.onerror = () => {
        if (this.isGuest && this.phase !== 'connected') {
          this.$toast.error('시그널링 서버에 연결할 수 없습니다. / Cannot reach the signaling server.');
        }
      };

      this.signalingWebSocketClient.onchanneljoined = () => {
        this.isJoined = true;
        if (this.isGuest) {
          this.phase = 'connecting';
          this.startConnectTimeout();
        }
      };

      this.signalingWebSocketClient.onuserjoined = (user) => {
        console.log(`onUserJoined: ${user.id}`);
        if (this.isHost) {
          const peer = this.createPeerConnection(user.id);
          this.rtcPeerConnections.set(user.id, peer);
          this.iceRestartCounts.set(user.id, 0);
          peer.onicecandidate = (ev) => {
            if (ev.candidate) {
              this.signalingWebSocketClient.relayIceCandidate(user.id, ev.candidate);
            }
          };
          this.stream.getTracks().forEach((track) => peer.addTrack(track, this.stream));
          peer.createOffer()
            .then((offer) => {
              peer.setLocalDescription(offer);
              this.signalingWebSocketClient.relaySessionDescription(user.id, offer);
            });
        }
        this.userUpdateKey = {};
      };

      this.signalingWebSocketClient.onuserparted = (user) => {
        console.log(`onUserParted: ${user.id}`);

        const peer = this.rtcPeerConnections.get(user.id);
        if (peer) {
          if (this.isHost) {
            peer.close();
            this.rtcPeerConnections.delete(user.id);
            delete this.peerStates[user.id];
            this.clearDisconnectTimer(user.id);
            if (this.monitoredPeer === peer) {
              this.stopStatsMonitor();
            }
          } else if (this.isGuest) {
            // The host left — the share has ended.
            this.stopStatsMonitor();
            this.phase = 'ended';
            this.$toast.info('호스트가 공유를 종료했습니다. / The host stopped sharing.');
            window.setTimeout(() => this.$router.push('/'), 2500);
          }
        }

        this.userUpdateKey = {};
      };

      this.signalingWebSocketClient.onrelaysessiondescription = async (userId, sessionDescription) => {
        console.log(`onRelaySessionDescription: ${userId}`);

        if (this.isHost) {
          await this.rtcPeerConnections.get(userId)?.setRemoteDescription(new RTCSessionDescription(sessionDescription));
        } else if (this.isGuest) {
          // Reuse an existing peer (renegotiation / ICE restart) instead of
          // recreating it, so the media stream and ICE state are preserved.
          let peer = this.rtcPeerConnections.get(userId);
          if (!peer) {
            peer = this.createPeerConnection(userId);
            this.rtcPeerConnections.set(userId, peer);
            peer.onicecandidate = (ev) => {
              if (ev.candidate) {
                this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
              }
            };
            peer.ontrack = (ev) => {
              this.stream = ev.streams[0];
              this.videoElement.srcObject = this.stream;
            };
            this.startConnectTimeout();
          }
          await peer.setRemoteDescription(new RTCSessionDescription(sessionDescription));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          this.signalingWebSocketClient.relaySessionDescription(userId, answer);
        }
      };

      this.signalingWebSocketClient.onrelayicecandidate = (userId, iceCandidate) => {
        console.log(`onRelayIceCandidate: ${userId}`);

        this.rtcPeerConnections.get(userId)?.addIceCandidate(new RTCIceCandidate(iceCandidate))
          .catch((error) => {
            console.error(error);
          });
      };

      this.signalingWebSocketClient.onnewmessage = (simpleMessage) => {
        this.newSimpleMessage = simpleMessage;
      };
    },
    async initializeHostMode(authorizationToken: string) {
      if (!authorizationToken) {
        return;
      }

      // Compatibility: getDisplayMedia is unavailable on iOS Safari and older
      // browsers. Fail loudly with a clear, bilingual reason.
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
        this.isLoading = false;
        alert(
          '이 브라우저에서는 화면 공유(호스트)를 지원하지 않습니다.\n' +
          'PC의 최신 Chrome, Edge, Firefox, 또는 Safari를 사용해 주세요. (iOS/모바일은 화면 송출을 지원하지 않습니다.)\n\n' +
          'Screen sharing (host) is not supported in this browser.\n' +
          'Please use a recent desktop Chrome, Edge, Firefox or Safari. (iOS / mobile cannot capture the screen.)'
        );
        this.$router.push('/');
        return;
      }

      try {
        this.stream = await this.captureDisplay();
      } catch (error: any) {
        this.isLoading = false;
        const name = error?.name;
        if (name === 'NotAllowedError' || name === 'AbortError') {
          this.$toast.info('화면 공유가 취소되었습니다. / Screen sharing was cancelled.');
        } else if (name === 'NotFoundError') {
          this.$toast.error('공유할 수 있는 화면을 찾지 못했습니다. / No screen available to share.');
        } else {
          this.$toast.error('화면을 가져오지 못했습니다. / Failed to capture the screen.');
        }
        this.$router.push('/');
        return;
      }

      // When the host stops sharing via the browser's native UI, leave cleanly.
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.$toast.info('화면 공유를 종료했습니다. / You stopped sharing.');
          this.$router.push('/');
        };
      }

      this.videoElement.srcObject = this.stream;

      await this.initializeWebSocket(authorizationToken);
    },
    async captureDisplay(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });
      } catch (error: any) {
        // User cancellation / no source: do not retry.
        if (['NotAllowedError', 'AbortError', 'NotFoundError'].includes(error?.name)) {
          throw error;
        }
        // Some browsers reject audio capture; retry with video only.
        return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
    },
    async initializeGuestMode(authorizationToken: string) {
      if (!authorizationToken) {
        return;
      }

      // Compatibility: RTCPeerConnection must exist to receive the stream.
      if (typeof RTCPeerConnection === 'undefined') {
        alert(
          '이 브라우저에서는 WebRTC를 지원하지 않아 화면을 볼 수 없습니다. 최신 브라우저를 사용해 주세요.\n' +
          'This browser does not support WebRTC, so the shared screen cannot be viewed. Please use a modern browser.'
        );
        this.$router.push('/');
        return;
      }

      this.phase = 'connecting';
      await this.initializeWebSocket(authorizationToken);
    },
    async joinChannel(channelId: string, password: string) {
      await joinSharingChannel(channelId, {
        password: password,
      })
        .then((joinSharingChannelResponse) => {
          this.$router.push(`/screen-sharing/${joinSharingChannelResponse.channelId}?guestToken=${joinSharingChannelResponse.guestToken}`);
        })
        .catch(async (error: HttpApiError) => {
          if (error.isUnauthorized()) {
            this.$toast.error('Please check the channel password.');
            const password = prompt('Please enter the sharing channel password.');
            if (password) {
              await this.joinChannel(channelId, password);
            } else {
              this.$router.push('/');
            }
          } else if (error.isNotFound()) {
            this.$toast.error('This channel does not exist.');
            this.$router.push('/');
          } else {
            this.$router.push('/');
          }
        });
    },
    async partChannel() {
      this.$router.push('/');
    },
    copyShareLink() {
      navigator.clipboard.writeText(`${process.env.VUE_APP_BASE_URI}/screen-sharing/${this.channelId}`);
      this.$toast.success('The link has been copied to the clipboard.');
    },
  },
  async mounted() {
    this.isFullscreenSupported =
      !!(document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (this.$refs.video as any)?.webkitSupportsFullscreen);

    if (!this.hostToken && !this.guestToken) {
      await this.joinChannel(this.channelId, '');
      return;
    }

    this.isLoading = true;

    this.videoElement = this.$refs.video as HTMLVideoElement;
    this.videoElement.onloadeddata = () => {
      this.isLoading = false;
    };

    if (this.hostToken) {
      await this.initializeHostMode(this.hostToken);
    } else if (this.guestToken) {
      await this.initializeGuestMode(this.guestToken);
    }
  },
  unmounted() {
    this.clearConnectTimeout();
    this.disconnectTimers.forEach((handle) => window.clearTimeout(handle));
    this.disconnectTimers.clear();
    this.stopStatsMonitor();
    this.rtcPeerConnections.forEach((peer) => peer.close());
    this.rtcPeerConnections.clear();
    if (this.stream instanceof MediaStream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.signalingWebSocketClient instanceof SignalingWebSocketClient) {
      this.signalingWebSocketClient.close();
    }
  },
});
</script>

<style scoped>

.screen-sharing-channel-container {
  width: 100%;
  height: 100%;

  display: grid;
  grid-template-columns: 1fr 350px;
}

.video-container {
  overflow: hidden;
  width: 100%;
  height: 100%;
  position: relative;

  --video-footer-height: 60px;

  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: calc(100% - var(--video-footer-height)) var(--video-footer-height);
}

.video-container video {
  width: 100%;
  height: 100%;

  background: #202020;
}

.video-container button {
  font-size: 1em;
  padding: 8px;
  min-width: 80px;
}

.video-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: 1fr;

  align-items: center;
  padding: 0 10px;
  gap: 8px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.quality-select {
  font-size: 0.95em;
  padding: 7px;
}

.video-footer .footer-buttons {
  display: flex;
  align-items: center;
}

/* Connection quality badge */
.quality-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 6px;

  padding: 4px 10px;
  border-radius: 14px;
  font-size: 0.8em;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.quality-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #999;
}

.quality-badge.good .quality-dot { background: #3ec46d; }
.quality-badge.fair .quality-dot { background: #e8b339; }
.quality-badge.poor .quality-dot { background: #e0533d; }

.viewer-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;

  padding: 4px 10px;
  border-radius: 14px;
  font-size: 0.8em;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

/* Status / error overlay */
.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--video-footer-height);
  z-index: 3;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;
  padding: 24px;

  background: #202020;
  color: #f0f0f0;
}

.overlay-spinner {
  width: 70px;
  height: 70px;
}

.overlay-icon {
  font-size: 3em;
}

.overlay-title {
  font-size: 1.25em;
  font-weight: 600;
  max-width: 640px;
  line-height: 1.4;
}

.overlay-detail {
  font-size: 0.95em;
  color: #c8c8c8;
  max-width: 640px;
  line-height: 1.6;
}

.overlay-hint {
  font-size: 0.95em;
  color: #9fc6ff;
  max-width: 640px;
  line-height: 1.6;
}

.overlay-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.overlay-actions button {
  font-size: 1em;
  padding: 9px 18px;
  min-width: 120px;
  cursor: pointer;
}

.overlay-actions button.secondary {
  background: transparent;
  color: #f0f0f0;
  border: 1px solid #777;
}

.user-container {
  box-shadow: -2px 0px 5px var(--base-shadow-color);
  position: relative;
  z-index: 1;
  height: 100%;

  display: grid;
  grid-template-rows: var(--user-list-height) var(--message-list-height);
}

</style>
