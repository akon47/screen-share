<template>
  <div class="screen-sharing-channel-container">
    <div class="video-container" :class="{ 'controls-hidden': showVideo && !controlsVisible }"
         @mousemove="revealControls" @mouseleave="hideControls">
      <!-- Remote/local video -->
      <video v-show="showVideo" ref="video" playsinline autoplay muted @click="toggleControls"/>

      <!-- Host drawing annotation layer (broadcast to all viewers) -->
      <canvas v-show="showVideo" ref="drawCanvas" class="draw-layer" :class="{ active: drawingActive }"
              @pointerdown="onDrawPointerDown" @pointermove="onDrawPointerMove"
              @pointerup="onDrawPointerUp" @pointercancel="onDrawPointerUp" @pointerleave="onDrawPointerUp"/>

      <!-- Host drawing toolbar -->
      <div v-if="isHost && drawingActive" class="draw-toolbar" @pointerdown.stop @mousedown.stop>
        <button class="draw-tool" :class="{ sel: drawTool === 'pen' }" :title="$t('channel.drawPen')"
                @click="selectTool('pen')">✏️</button>
        <button class="draw-tool" :class="{ sel: drawTool === 'eraser' }" :title="$t('channel.drawEraser')"
                @click="selectTool('eraser')">🧽</button>
        <span class="draw-sep"/>
        <button v-for="c in drawColors" :key="c" class="draw-swatch" :class="{ sel: drawColor === c && drawTool === 'pen' }"
                :style="{ background: c }" :title="$t('channel.drawColor')" @click="selectColor(c)"/>
        <input type="color" class="draw-color-input" :value="drawColor" :title="$t('channel.drawColor')"
               @input="selectColor(($event.target as HTMLInputElement).value)"/>
        <span class="draw-sep"/>
        <input type="range" min="1" max="28" step="1" v-model.number="drawWidthPx" class="draw-width" :title="$t('channel.drawWidth')"/>
        <span class="draw-width-preview" :style="{ width: drawWidthPx + 'px', height: drawWidthPx + 'px', background: drawTool === 'eraser' ? '#fff' : drawColor }"/>
        <span class="draw-sep"/>
        <button class="draw-clear" :title="$t('channel.drawClear')" @click="clearDrawing">🗑</button>
        <button class="draw-close" :title="$t('channel.drawClose')" @click="toggleDrawing">✕</button>
      </div>

      <!-- Floating emoji reactions -->
      <div class="reaction-layer">
        <span v-for="r in reactions" :key="r.id" class="reaction-emoji" :style="{ left: r.left + '%' }">{{ r.emoji }}</span>
      </div>

      <!-- Connection quality badge -->
      <div v-if="showVideo && quality" class="quality-badge" :class="quality.level" :title="quality.tooltip">
        <span class="quality-dot"/>
        <span class="quality-text">{{ quality.label }}</span>
      </div>

      <!-- Relay (TURN) vs direct (P2P) badge -->
      <div v-if="showVideo && connectionInfo" class="conn-badge" :class="connectionInfo.relay ? 'relay' : 'direct'" :title="connectionInfo.title">
        {{ connectionInfo.relay ? '🔁' : '↔' }} {{ connectionInfo.label }}
      </div>

      <!-- Host: connected viewer count -->
      <div v-if="showVideo && isHost" class="viewer-badge" :title="$t('channel.viewers')">
        👁 {{ connectedViewerCount }}
      </div>

      <!-- Status / error overlay -->
      <div v-if="overlay.show" class="status-overlay" :class="overlay.kind">
        <loading-spinner v-if="overlay.kind === 'loading' || overlay.kind === 'reconnecting'" class="overlay-spinner"/>
        <div v-else class="overlay-icon">⚠️</div>
        <div class="overlay-title">{{ overlay.title }}</div>
        <div v-if="overlay.detail" class="overlay-detail">{{ overlay.detail }}</div>
        <div v-if="overlay.hint" class="overlay-hint">{{ overlay.hint }}</div>
        <div v-if="overlay.showRetry" class="overlay-actions">
          <button @click="retryConnection">{{ $t('common.retry') }}</button>
          <button class="secondary" @click="partChannel">{{ $t('common.leave') }}</button>
        </div>
      </div>

      <div v-show="showVideo" class="video-controls" :class="{ visible: controlsVisible }"
           @mouseenter="keepControls" @mouseleave="revealControls">
        <div class="footer-left">
          <button @click="copyShareLink">{{ $t('channel.copyLink') }}</button>
          <button @click="openQr">🔳 {{ $t('channel.qr') }}</button>
          <button @click="toggleMute">{{ muteLabel }}</button>
          <button v-if="isFullscreenSupported" @click="toggleFullscreen">⛶ {{ $t('channel.fullscreen') }}</button>
          <button v-if="isHost" :class="{ 'draw-toggle-active': drawingActive }" @click="toggleDrawing">✏️ {{ $t('channel.draw') }}</button>
          <select v-if="isHost" v-model="selectedQuality" @change="applyQuality" class="quality-select" :title="$t('channel.qualityLabel')">
            <option value="auto">{{ $t('channel.qualityLabel') }}: {{ $t('channel.qualityAuto') }}</option>
            <option value="high">{{ $t('channel.qualityLabel') }}: {{ $t('channel.qualityHigh') }}</option>
            <option value="medium">{{ $t('channel.qualityLabel') }}: {{ $t('channel.qualityMedium') }}</option>
            <option value="low">{{ $t('channel.qualityLabel') }}: {{ $t('channel.qualityLow') }}</option>
          </select>
          <div class="reaction-bar">
            <button v-for="e in reactionEmojis" :key="e" class="reaction-btn" @click="sendReaction(e)">{{ e }}</button>
          </div>
        </div>
        <div class="footer-buttons">
          <button @click="partChannel">{{ $t('channel.exit') }}</button>
        </div>
      </div>

      <!-- QR code modal -->
      <div v-if="showQr" class="qr-modal" @click.self="showQr = false">
        <div class="qr-card">
          <div class="qr-title">{{ $t('channel.qrTitle') }}</div>
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="qr-image"/>
          <div class="qr-link">{{ shareLink }}</div>
          <button @click="showQr = false">{{ $t('common.leave') }}</button>
        </div>
      </div>
    </div>
    <div v-if="isJoined" class="user-container">
      <user-form class="user-form" :token="token" :channel-id="channelId" :update-key="userUpdateKey"
                 :is-host="isHost" @kick="onKickUser"/>
      <message-form :token="token" :channel-id="channelId" :new-simple-message="newSimpleMessage" :updated-user="lastUpdatedUser"/>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue';
import { joinSharingChannel, getTurnCredentials } from '@/api/sharing';
import SignalingWebSocketClient from '@/utils/websocket';
import { HttpApiError } from '@/api/common/httpApiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import MessageForm from '@/components/MessageForm.vue';
import { ChannelUserDto, DrawPayloadDto, SimpleMessageDto } from '@/api/models/sharing.dtos';
import UserForm from '@/components/UserForm.vue';
import QRCode from 'qrcode';

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
// Adaptive bitrate sampling interval (host side).
const ADAPT_INTERVAL_MS = 4000;
// How long a floating reaction emoji stays on screen.
const REACTION_LIFETIME_MS = 2600;

// Adaptive bitrate ladder: from most degraded to full quality. The host moves
// each viewer up/down this ladder based on the packet loss they report back.
const BITRATE_LEVELS: { maxBitrate: number; scaleDown: number }[] = [
  { maxBitrate: 300_000, scaleDown: 4 },
  { maxBitrate: 600_000, scaleDown: 2 },
  { maxBitrate: 1_200_000, scaleDown: 1.5 },
  { maxBitrate: 2_500_000, scaleDown: 1 },
  { maxBitrate: 5_000_000, scaleDown: 1 },
];

// Resolution / frame-rate presets used by the host quality selector.
const QUALITY_PRESETS: { [preset: string]: any } = {
  auto: {},
  high: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  medium: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  low: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
};

// Available emoji reactions.
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

// Preset pen colors for the drawing toolbar.
const DRAW_COLORS = ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ffffff', '#000000'];

// A single pen/eraser stroke, stored in normalized (0..1) coordinates relative
// to the displayed video content rectangle so it renders identically on every
// screen size. `width` is normalized to the content height.
interface DrawStroke {
  id: string;
  mode: 'pen' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

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
    shareLink(): string {
      return `${process.env.VUE_APP_BASE_URI}/screen-sharing/${this.channelId}`;
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
    // Relay (TURN) vs direct (P2P) indicator for the active connection.
    connectionInfo(): null | { relay: boolean; label: string; title: string } {
      if (!this.connectionType) {
        return null;
      }
      const relay = this.connectionType === 'relay';
      return {
        relay,
        label: String(this.$t(relay ? 'channel.connRelay' : 'channel.connDirect')),
        title: String(this.$t(relay ? 'channel.connRelayHint' : 'channel.connDirectHint')),
      };
    },
    muteLabel(): string {
      if (this.isHost) {
        return this.audioEnabled ? `🔊 ${this.$t('channel.hostMute')}` : `🔇 ${this.$t('channel.hostUnmute')}`;
      }
      return this.audioMuted ? `🔇 ${this.$t('channel.guestUnmute')}` : `🔊 ${this.$t('channel.guestMute')}`;
    },
    // Drives the status / error overlay shown over the video area.
    overlay(): { show: boolean; kind: string; title: string; detail: string; hint: string; showRetry: boolean } {
      const t = (key: string) => String(this.$t(key));
      // Host: only block the view while the local screen is being captured.
      if (this.isHost) {
        if (this.isLoading) {
          return { show: true, kind: 'loading', title: t('channel.preparing'), detail: '', hint: '', showRetry: false };
        }
        return { show: false, kind: '', title: '', detail: '', hint: '', showRetry: false };
      }

      // Guest perspective.
      switch (this.phase) {
        case 'connecting':
          return { show: true, kind: 'loading', title: t('channel.connecting'), detail: '', hint: '', showRetry: false };
        case 'reconnecting':
          return { show: true, kind: 'reconnecting', title: t('channel.reconnecting'), detail: '', hint: '', showRetry: false };
        case 'failed':
          return {
            show: true,
            kind: 'failed',
            title: t('channel.failedTitle'),
            detail: t('channel.failedDetail'),
            hint: t('channel.failedHint'),
            showRetry: true,
          };
        case 'ended':
          return {
            show: true,
            kind: 'failed',
            title: t('channel.endedTitle'),
            detail: t('channel.endedDetail'),
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
        // NOTE: Only STUN servers are configured by default — TURN credentials,
        // if available, are fetched and appended at runtime.
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
        ] as any[],
      },
      signalingWebSocketClient: {} as SignalingWebSocketClient,
      newSimpleMessage: {} as SimpleMessageDto,
      lastUpdatedUser: null as null | ChannelUserDto,
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
      // Whether the active connection is relayed via TURN or a direct P2P path.
      connectionType: null as null | 'relay' | 'direct',
      statsIntervalHandle: 0 as number,
      statsPrev: null as null | { bytes: number; timestamp: number },
      monitoredPeer: null as null | RTCPeerConnection,
      // Adaptive bitrate (host): per-viewer quality level index.
      adaptIntervalHandle: 0 as number,
      peerQualityLevels: new Map<string, number>(),
      // Emoji reactions.
      reactionEmojis: REACTION_EMOJIS,
      reactions: [] as { id: number; emoji: string; left: number }[],
      reactionSeq: 0,
      // ---- Drawing annotation (host draws, broadcast to all viewers) -------
      // Reactive UI state.
      drawingActive: false,
      drawTool: 'pen' as 'pen' | 'eraser',
      drawColor: DRAW_COLORS[0],
      drawWidthPx: 4,
      drawColors: DRAW_COLORS,
      hasDrawing: false,
      // Non-reactive rendering state (assigned with markRaw in mounted).
      drawCanvas: null as null | HTMLCanvasElement,
      drawCtx: null as null | CanvasRenderingContext2D,
      strokes: [] as DrawStroke[],
      strokeMap: {} as Record<string, DrawStroke>,
      currentStroke: null as null | DrawStroke,
      pendingPoints: [] as { x: number; y: number }[],
      drawFlushScheduled: false,
      drawSeq: 0,
      drawResizeObserver: null as null | ResizeObserver,
      // QR code modal.
      showQr: false,
      qrDataUrl: '',
      // YouTube-style auto-hiding overlay controls.
      controlsVisible: true,
      controlsHideTimer: 0 as number,
    };
  },
  watch: {
    // When the video first appears, show the controls then start the auto-hide.
    showVideo(visible: boolean) {
      if (visible) {
        this.revealControls();
      }
    },
  },
  methods: {
    // ---- Overlay controls visibility --------------------------------------
    // Reveal the controls and schedule them to fade out after inactivity.
    revealControls() {
      this.controlsVisible = true;
      if (this.controlsHideTimer) {
        window.clearTimeout(this.controlsHideTimer);
      }
      this.controlsHideTimer = window.setTimeout(() => {
        this.controlsVisible = false;
      }, 3000);
    },
    // Keep the controls pinned while the pointer is over them.
    keepControls() {
      this.controlsVisible = true;
      if (this.controlsHideTimer) {
        window.clearTimeout(this.controlsHideTimer);
        this.controlsHideTimer = 0;
      }
    },
    hideControls() {
      if (this.controlsHideTimer) {
        window.clearTimeout(this.controlsHideTimer);
        this.controlsHideTimer = 0;
      }
      this.controlsVisible = false;
    },
    // Tap-to-toggle for touch devices (no hover).
    toggleControls() {
      if (this.controlsVisible) {
        this.hideControls();
      } else {
        this.revealControls();
      }
    },
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
    // A peer connection over which the host sends media to a viewer.
    createSenderPeer(userId: string): RTCPeerConnection {
      const peer = this.createPeerConnection(userId);
      this.rtcPeerConnections.set(userId, peer);
      this.iceRestartCounts.set(userId, 0);
      peer.onicecandidate = (ev) => {
        if (ev.candidate) {
          this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
        }
      };
      if (this.stream instanceof MediaStream) {
        this.stream.getTracks().forEach((track) => peer.addTrack(track, this.stream));
      }
      return peer;
    },
    // A peer connection over which a viewer receives the host's media.
    createReceiverPeer(userId: string): RTCPeerConnection {
      const peer = this.createPeerConnection(userId);
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
      return peer;
    },
    async offerToUser(userId: string) {
      const peer = this.createSenderPeer(userId);
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        this.signalingWebSocketClient.relaySessionDescription(userId, offer);
      } catch (error) {
        console.error('createOffer failed', error);
      }
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
            this.$toast.success(String(this.$t('channel.viewerConnected')));
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
        this.$toast.error(String(this.$t('channel.viewerFailed')));
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
      this.connectionType = null;
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
        const candidateTypeById: Record<string, string> = {};
        const pairsById: Record<string, any> = {};
        let transportSelectedPairId = '';
        let nominatedPair: any = null;
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
          } else if (stat.type === 'local-candidate' || stat.type === 'remote-candidate') {
            candidateTypeById[stat.id] = stat.candidateType;
          } else if (stat.type === 'candidate-pair') {
            pairsById[stat.id] = stat;
            if (stat.nominated && stat.state === 'succeeded') {
              nominatedPair = stat;
            }
            if (typeof stat.currentRoundTripTime === 'number' && (stat.nominated || stat.state === 'succeeded')) {
              rtt = stat.currentRoundTripTime;
            }
          } else if (stat.type === 'transport' && stat.selectedCandidatePairId) {
            transportSelectedPairId = stat.selectedCandidatePairId;
          }
        });

        // Determine whether the active candidate pair is relayed (TURN) or direct.
        const selectedPair = (transportSelectedPairId && pairsById[transportSelectedPairId]) || nominatedPair;
        if (selectedPair) {
          const localType = candidateTypeById[selectedPair.localCandidateId];
          const remoteType = candidateTypeById[selectedPair.remoteCandidateId];
          this.connectionType = (localType === 'relay' || remoteType === 'relay') ? 'relay' : 'direct';
        }

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
        const labels: Record<string, string> = {
          good: String(this.$t('channel.qualityGood')),
          fair: String(this.$t('channel.qualityFair')),
          poor: String(this.$t('channel.qualityPoor')),
        };
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
          this.$toast.info(String(this.$t('channel.noAudio')));
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
        this.$toast.success(String(this.$t('channel.qualityApplied')));
      } catch (error) {
        this.$toast.warning(String(this.$t('channel.qualityUnsupported')));
      }
    },
    // ---- Adaptive bitrate (host) ------------------------------------------
    startAdaptiveBitrate() {
      if (this.adaptIntervalHandle) {
        return;
      }
      this.adaptIntervalHandle = window.setInterval(() => {
        this.rtcPeerConnections.forEach((peer, userId) => {
          if (peer.connectionState === 'connected') {
            this.adaptPeerBitrate(userId, peer);
          }
        });
      }, ADAPT_INTERVAL_MS);
    },
    async adaptPeerBitrate(userId: string, peer: RTCPeerConnection) {
      const sender = peer.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (!sender) {
        return;
      }
      // Read the loss the remote peer is reporting back to us.
      let lossPct = -1;
      try {
        const report = await sender.getStats();
        report.forEach((stat: any) => {
          if (stat.type === 'remote-inbound-rtp' && typeof stat.fractionLost === 'number') {
            lossPct = stat.fractionLost * 100;
          }
        });
      } catch {
        return;
      }
      if (lossPct < 0) {
        return; // no usable feedback yet
      }

      let level = this.peerQualityLevels.get(userId);
      if (level === undefined) {
        level = BITRATE_LEVELS.length - 1; // start at the highest level
      }
      if (lossPct > 5) {
        level = Math.max(0, level - 1); // congestion: step down
      } else if (lossPct < 1) {
        level = Math.min(BITRATE_LEVELS.length - 1, level + 1); // healthy: step up
      }
      this.peerQualityLevels.set(userId, level);
      await this.applyEncoding(sender, BITRATE_LEVELS[level]);
    },
    async applyEncoding(sender: RTCRtpSender, target: { maxBitrate: number; scaleDown: number }) {
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          (params as any).encodings = [{}];
        }
        params.encodings[0].maxBitrate = target.maxBitrate;
        params.encodings[0].scaleResolutionDownBy = target.scaleDown;
        await sender.setParameters(params);
      } catch {
        // setParameters can fail on some browsers; ignore.
      }
    },
    // ---- Reactions --------------------------------------------------------
    sendReaction(emoji: string) {
      if (this.signalingWebSocketClient instanceof SignalingWebSocketClient) {
        this.signalingWebSocketClient.sendReaction(emoji);
      }
      this.spawnReaction(emoji);
    },
    spawnReaction(emoji: string) {
      const id = ++this.reactionSeq;
      const left = 10 + Math.floor(Math.random() * 80);
      this.reactions.push({ id, emoji, left });
      window.setTimeout(() => {
        this.reactions = this.reactions.filter((r) => r.id !== id);
      }, REACTION_LIFETIME_MS);
    },
    // ---- Drawing annotation -----------------------------------------------
    // Grab the canvas + 2D context and size it to the video box.
    setupDrawCanvas() {
      const canvas = this.$refs.drawCanvas as HTMLCanvasElement | undefined;
      if (!canvas) {
        return;
      }
      this.drawCanvas = markRaw(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.drawCtx = markRaw(ctx);
      }
      this.resizeDrawCanvas();
      // Redraw on layout changes (resize, orientation, panel toggles).
      if (!this.drawResizeObserver && typeof ResizeObserver !== 'undefined') {
        this.drawResizeObserver = new ResizeObserver(() => this.resizeDrawCanvas());
        this.drawResizeObserver.observe(canvas);
      }
    },
    // Match the backing store to the CSS size (accounting for device pixels).
    resizeDrawCanvas() {
      const canvas = this.drawCanvas;
      const ctx = this.drawCtx;
      if (!canvas || !ctx) {
        return;
      }
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (cssWidth === 0 || cssHeight === 0) {
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.redrawAll();
    },
    // The rectangle (in CSS px) where the video content is actually drawn,
    // given object-fit: contain. Drawing is normalized against this so the same
    // logical point maps to the same place on every screen.
    drawContentRect(): { x: number; y: number; w: number; h: number } {
      const canvas = this.drawCanvas;
      const cw = canvas?.clientWidth ?? 0;
      const ch = canvas?.clientHeight ?? 0;
      const vw = this.videoElement?.videoWidth ?? 0;
      const vh = this.videoElement?.videoHeight ?? 0;
      if (!vw || !vh || !cw || !ch) {
        return { x: 0, y: 0, w: cw, h: ch };
      }
      const scale = Math.min(cw / vw, ch / vh);
      const w = vw * scale;
      const h = vh * scale;
      return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
    },
    drawNormalize(px: number, py: number, rect: { x: number; y: number; w: number; h: number }) {
      const nx = rect.w > 0 ? (px - rect.x) / rect.w : 0;
      const ny = rect.h > 0 ? (py - rect.y) / rect.h : 0;
      return { x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) };
    },
    drawDenormalize(pt: { x: number; y: number }, rect: { x: number; y: number; w: number; h: number }) {
      return { x: rect.x + pt.x * rect.w, y: rect.y + pt.y * rect.h };
    },
    // Draw a stroke's points starting at `startIndex` (connecting from the
    // previous point). A single-point stroke is rendered as a dot.
    drawStrokeFrom(stroke: DrawStroke, startIndex: number) {
      const ctx = this.drawCtx;
      if (!ctx) {
        return;
      }
      const rect = this.drawContentRect();
      const lineWidth = Math.max(1, stroke.width * rect.h);
      ctx.save();
      ctx.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = stroke.points;
      if (pts.length === 1) {
        const p = this.drawDenormalize(pts[0], rect);
        ctx.beginPath();
        ctx.arc(p.x, p.y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const start = Math.max(1, startIndex);
        const prev = this.drawDenormalize(pts[start - 1], rect);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        for (let i = start; i < pts.length; i++) {
          const p = this.drawDenormalize(pts[i], rect);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
    // Clear and re-render every stroke (used on resize / first paint).
    redrawAll() {
      const ctx = this.drawCtx;
      const canvas = this.drawCanvas;
      if (!ctx || !canvas) {
        return;
      }
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const stroke of this.strokes) {
        this.drawStrokeFrom(stroke, 1);
      }
    },
    genStrokeId(): string {
      return `${Date.now().toString(36)}-${(this.drawSeq++).toString(36)}`;
    },
    // Host: toggle the drawing toolbar / canvas capture.
    toggleDrawing() {
      this.drawingActive = !this.drawingActive;
      if (this.drawingActive) {
        this.keepControls();
        this.$nextTick(() => this.resizeDrawCanvas());
      } else {
        this.currentStroke = null;
        this.pendingPoints = [];
      }
    },
    selectTool(tool: 'pen' | 'eraser') {
      this.drawTool = tool;
    },
    selectColor(color: string) {
      this.drawColor = color;
      this.drawTool = 'pen';
    },
    onDrawPointerDown(ev: PointerEvent) {
      if (!this.isHost || !this.drawingActive || !this.drawCtx) {
        return;
      }
      ev.preventDefault();
      (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
      const rect = this.drawContentRect();
      const point = this.drawNormalize(ev.offsetX, ev.offsetY, rect);
      const widthNorm = this.drawWidthPx / Math.max(1, rect.h);
      const stroke: DrawStroke = {
        id: this.genStrokeId(),
        mode: this.drawTool,
        color: this.drawColor,
        width: widthNorm,
        points: [point],
      };
      this.strokes.push(stroke);
      this.strokeMap[stroke.id] = stroke;
      this.currentStroke = stroke;
      this.hasDrawing = true;
      this.drawStrokeFrom(stroke, 1);
      this.pendingPoints = [point];
      this.scheduleDrawFlush();
    },
    onDrawPointerMove(ev: PointerEvent) {
      if (!this.isHost || !this.drawingActive || !this.currentStroke) {
        return;
      }
      ev.preventDefault();
      const rect = this.drawContentRect();
      const point = this.drawNormalize(ev.offsetX, ev.offsetY, rect);
      const stroke = this.currentStroke;
      const fromIndex = stroke.points.length;
      stroke.points.push(point);
      this.drawStrokeFrom(stroke, fromIndex);
      this.pendingPoints.push(point);
      this.scheduleDrawFlush();
    },
    onDrawPointerUp(ev: PointerEvent) {
      if (!this.currentStroke) {
        return;
      }
      (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
      this.flushDraw();
      this.currentStroke = null;
    },
    // Batch outgoing points to roughly one message per animation frame.
    scheduleDrawFlush() {
      if (this.drawFlushScheduled) {
        return;
      }
      this.drawFlushScheduled = true;
      window.requestAnimationFrame(() => this.flushDraw());
    },
    flushDraw() {
      this.drawFlushScheduled = false;
      const stroke = this.currentStroke;
      if (!stroke || this.pendingPoints.length === 0) {
        return;
      }
      const flat: number[] = [];
      for (const p of this.pendingPoints) {
        flat.push(Math.round(p.x * 10000) / 10000, Math.round(p.y * 10000) / 10000);
      }
      this.pendingPoints = [];
      if (this.signalingWebSocketClient instanceof SignalingWebSocketClient) {
        this.signalingWebSocketClient.sendDraw({
          strokeId: stroke.id,
          mode: stroke.mode,
          color: stroke.color,
          width: stroke.width,
          points: flat,
        });
      }
    },
    // Viewer (and host with multiple peers): apply a stroke batch from the host.
    applyRemoteStroke(payload: DrawPayloadDto) {
      if (!this.drawCtx) {
        this.setupDrawCanvas();
      }
      if (!this.drawCtx || !Array.isArray(payload.points) || payload.points.length < 2) {
        return;
      }
      const incoming: { x: number; y: number }[] = [];
      for (let i = 0; i + 1 < payload.points.length; i += 2) {
        incoming.push({ x: payload.points[i], y: payload.points[i + 1] });
      }
      let stroke = this.strokeMap[payload.strokeId];
      if (!stroke) {
        stroke = {
          id: payload.strokeId,
          mode: payload.mode === 'eraser' ? 'eraser' : 'pen',
          color: payload.color,
          width: payload.width,
          points: [],
        };
        this.strokes.push(stroke);
        this.strokeMap[stroke.id] = stroke;
      }
      const prevLen = stroke.points.length;
      for (const p of incoming) {
        stroke.points.push(p);
      }
      this.hasDrawing = true;
      if (prevLen === 0 && stroke.points.length === 1) {
        this.drawStrokeFrom(stroke, 1);
      } else {
        this.drawStrokeFrom(stroke, prevLen === 0 ? 1 : prevLen);
      }
    },
    // Host: replay all existing strokes to a single new joiner so they see
    // everything drawn so far. Sent directly to that user (not broadcast) to
    // avoid re-drawing on clients that already have the strokes. Only the
    // already-broadcast ("committed") portion of each stroke is sent — the
    // unflushed tail of an in-progress stroke is delivered by the normal
    // broadcast flush, so the joiner gets no duplicated or missing segments.
    replayDrawingTo(userId: string) {
      if (!this.isHost || !(this.signalingWebSocketClient instanceof SignalingWebSocketClient)) {
        return;
      }
      // Points per message — kept under the server's per-message limit.
      const CHUNK = 400;
      for (const stroke of this.strokes) {
        let committed = stroke.points.length;
        if (stroke === this.currentStroke) {
          committed -= this.pendingPoints.length;
        }
        if (committed <= 0) {
          continue;
        }
        for (let start = 0; start < committed; start += CHUNK) {
          const end = Math.min(committed, start + CHUNK);
          const flat: number[] = [];
          for (let i = start; i < end; i++) {
            const p = stroke.points[i];
            flat.push(Math.round(p.x * 10000) / 10000, Math.round(p.y * 10000) / 10000);
          }
          this.signalingWebSocketClient.sendDraw({
            strokeId: stroke.id,
            mode: stroke.mode,
            color: stroke.color,
            width: stroke.width,
            points: flat,
            targetUserId: userId,
          });
        }
      }
    },
    // Host action: clear locally and tell everyone else to clear.
    clearDrawing() {
      this.clearDrawingLocal();
      if (this.signalingWebSocketClient instanceof SignalingWebSocketClient) {
        this.signalingWebSocketClient.sendClearDraw();
      }
    },
    clearDrawingLocal() {
      this.strokes = [];
      this.strokeMap = {};
      this.currentStroke = null;
      this.pendingPoints = [];
      this.hasDrawing = false;
      const ctx = this.drawCtx;
      const canvas = this.drawCanvas;
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      }
    },
    // ---- QR code ----------------------------------------------------------
    async openQr() {
      try {
        this.qrDataUrl = await QRCode.toDataURL(this.shareLink, { width: 240, margin: 1 });
      } catch (error) {
        console.error('QR generation failed', error);
        this.qrDataUrl = '';
      }
      this.showQr = true;
    },
    // ---- Host moderation --------------------------------------------------
    onKickUser(userId: string) {
      if (this.signalingWebSocketClient instanceof SignalingWebSocketClient) {
        this.signalingWebSocketClient.kickUser(userId);
      }
    },
    // ---- ICE servers (STUN + optional TURN) -------------------------------
    async loadIceServers() {
      // Fetch short-lived TURN credentials. Without a TURN relay, connections on
      // restrictive networks (e.g. mobile/CGNAT) fail; TURN fixes those cases.
      try {
        const credentials = await getTurnCredentials();
        if (credentials && Array.isArray(credentials.iceServers) && credentials.iceServers.length > 0) {
          const servers = credentials.iceServers
            .map((server) => {
              // Port 53 URLs are blocked by browsers — drop them.
              const urls = Array.isArray(server.urls)
                ? server.urls.filter((u) => !u.includes(':53'))
                : server.urls;
              return { ...server, urls };
            })
            .filter((server) => (Array.isArray(server.urls) ? server.urls.length > 0 : !!server.urls));
          this.rtcConfiguration.iceServers = [...this.rtcConfiguration.iceServers, ...servers];
        }
      } catch {
        // Keep the STUN-only fallback if credentials cannot be fetched.
      }
    },
    // ---- Signaling --------------------------------------------------------
    async initializeWebSocket(authorizationToken: string) {
      await this.loadIceServers();
      this.signalingWebSocketClient = new SignalingWebSocketClient(authorizationToken);

      this.signalingWebSocketClient.onerror = () => {
        if (this.isGuest && this.phase !== 'connected') {
          this.$toast.error(String(this.$t('channel.signalingFailed')));
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
        this.$toast.info(String(this.$t('channel.userJoined')));
        if (this.isHost) {
          this.offerToUser(user.id);
          // Catch the new viewer up on everything drawn so far.
          this.replayDrawingTo(user.id);
        }
        this.userUpdateKey = {};
      };

      this.signalingWebSocketClient.onuserparted = (user) => {
        console.log(`onUserParted: ${user.id}`);
        this.$toast.info(String(this.$t('channel.userLeft')));

        const peer = this.rtcPeerConnections.get(user.id);
        if (peer) {
          if (this.isHost) {
            peer.close();
            this.rtcPeerConnections.delete(user.id);
            delete this.peerStates[user.id];
            this.iceRestartCounts.delete(user.id);
            this.clearDisconnectTimer(user.id);
            if (this.monitoredPeer === peer) {
              this.stopStatsMonitor();
            }
          } else if (this.isGuest) {
            // The host left — the share has ended.
            this.stopStatsMonitor();
            this.phase = 'ended';
            this.$toast.info(String(this.$t('channel.hostLeft')));
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
            peer = this.createReceiverPeer(userId);
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

      this.signalingWebSocketClient.onuserupdated = (user) => {
        // A user changed their nickname — refresh the user list and let the
        // chat update the name shown on that user's past messages.
        this.lastUpdatedUser = user;
        this.userUpdateKey = {};
      };

      this.signalingWebSocketClient.onnewmessage = (simpleMessage) => {
        this.newSimpleMessage = simpleMessage;
      };

      this.signalingWebSocketClient.onreaction = (emoji) => {
        this.spawnReaction(emoji);
      };

      this.signalingWebSocketClient.ondraw = (payload) => {
        this.applyRemoteStroke(payload);
      };

      this.signalingWebSocketClient.oncleardraw = () => {
        this.clearDrawingLocal();
      };

      this.signalingWebSocketClient.onkicked = () => {
        this.$toast.error(String(this.$t('channel.kicked')));
        this.phase = 'ended';
        window.setTimeout(() => this.$router.push('/'), 1500);
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
        alert(String(this.$t('channel.hostUnsupported')));
        this.$router.push('/');
        return;
      }

      try {
        this.stream = await this.captureDisplay();
      } catch (error: any) {
        this.isLoading = false;
        const name = error?.name;
        if (name === 'NotAllowedError' || name === 'AbortError') {
          this.$toast.info(String(this.$t('channel.shareCancelled')));
        } else if (name === 'NotFoundError') {
          this.$toast.error(String(this.$t('channel.noScreen')));
        } else {
          this.$toast.error(String(this.$t('channel.captureFailed')));
        }
        this.$router.push('/');
        return;
      }

      // When the host stops sharing via the browser's native UI, leave cleanly.
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.$toast.info(String(this.$t('channel.hostStopped')));
          this.$router.push('/');
        };
      }

      this.videoElement.srcObject = this.stream;

      await this.initializeWebSocket(authorizationToken);
      this.startAdaptiveBitrate();
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
        alert(String(this.$t('channel.webrtcUnsupported')));
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
            this.$toast.error(String(this.$t('join.invalidPassword')));
            const password = prompt(String(this.$t('publicList.passwordPrompt')));
            if (password) {
              await this.joinChannel(channelId, password);
            } else {
              this.$router.push('/');
            }
          } else if (error.isNotFound()) {
            this.$toast.error(String(this.$t('join.notFound')));
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
      navigator.clipboard.writeText(this.shareLink);
      this.$toast.success(String(this.$t('channel.linkCopied')));
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
      // Intrinsic size is known now — size the canvas and repaint annotations.
      this.$nextTick(() => this.resizeDrawCanvas());
    };
    // Re-render annotations if the video's intrinsic resolution changes.
    this.videoElement.addEventListener('resize', () => this.redrawAll());

    this.setupDrawCanvas();

    if (this.hostToken) {
      await this.initializeHostMode(this.hostToken);
    } else if (this.guestToken) {
      await this.initializeGuestMode(this.guestToken);
    }
  },
  unmounted() {
    if (this.controlsHideTimer) {
      window.clearTimeout(this.controlsHideTimer);
    }
    this.clearConnectTimeout();
    this.disconnectTimers.forEach((handle) => window.clearTimeout(handle));
    this.disconnectTimers.clear();
    if (this.adaptIntervalHandle) {
      window.clearInterval(this.adaptIntervalHandle);
      this.adaptIntervalHandle = 0;
    }
    if (this.drawResizeObserver) {
      this.drawResizeObserver.disconnect();
      this.drawResizeObserver = null;
    }
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
}

.video-container video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;

  object-fit: contain;
  background: #202020;
}

/* Hide the cursor when the auto-hiding controls are hidden (immersive view). */
.video-container.controls-hidden {
  cursor: none;
}

/* YouTube-style controls overlaid on the bottom of the video. */
.video-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;

  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: 1fr;

  align-items: center;
  padding: 28px 14px 12px;
  gap: 8px;

  background: linear-gradient(to top, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.35) 55%, rgba(0, 0, 0, 0) 100%);

  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}

.video-controls.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.video-controls button {
  font-size: 0.95em;
  padding: 7px 10px;
  min-width: 0;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.video-controls button:hover {
  background: rgba(255, 255, 255, 0.28);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.quality-select {
  font-size: 0.9em;
  padding: 6px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
}

.quality-select option {
  color: #202020;
}

.video-controls .footer-buttons {
  display: flex;
  align-items: center;
}

/* Emoji reaction bar */
.reaction-bar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.reaction-bar .reaction-btn {
  font-size: 1.1em;
  min-width: 0;
  padding: 4px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.reaction-bar .reaction-btn:hover {
  transform: scale(1.25);
}

/* Floating reactions over the video */
.reaction-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
}

.reaction-emoji {
  position: absolute;
  bottom: 10px;
  font-size: 2.4em;
  animation: reaction-rise 2.6s ease-out forwards;
}

@keyframes reaction-rise {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  15% { opacity: 1; transform: translateY(-10%) scale(1); }
  100% { transform: translateY(-90vh) scale(1.2); opacity: 0; }
}

/* Host drawing annotation layer */
.draw-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
}

.draw-layer.active {
  pointer-events: auto;
  cursor: crosshair;
  touch-action: none;
}

/* Host drawing toolbar */
.draw-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;

  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;

  max-width: calc(100% - 24px);
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.72);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.draw-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  padding: 5px 8px;
  min-width: 0;
  line-height: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.draw-toolbar button:hover {
  background: rgba(255, 255, 255, 0.26);
}

.draw-toolbar .draw-tool.sel {
  background: rgba(255, 255, 255, 0.32);
  border-color: rgba(255, 255, 255, 0.8);
}

.draw-toolbar .draw-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
}

.draw-toolbar .draw-swatch.sel {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.draw-toolbar .draw-color-input {
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.draw-toolbar .draw-width {
  width: 90px;
  cursor: pointer;
}

.draw-toolbar .draw-width-preview {
  display: inline-block;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.draw-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px 2px;
  background: rgba(255, 255, 255, 0.25);
}

/* Active state for the footer draw toggle */
.video-controls button.draw-toggle-active {
  background: rgba(255, 255, 255, 0.45);
  border-color: rgba(255, 255, 255, 0.85);
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

.conn-badge {
  position: absolute;
  top: 44px;
  left: 12px;
  z-index: 2;

  padding: 4px 10px;
  border-radius: 14px;
  font-size: 0.8em;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.conn-badge.relay {
  background: rgba(180, 110, 30, 0.75);
}

.conn-badge.direct {
  background: rgba(40, 120, 70, 0.7);
}

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

/* QR modal */
.qr-modal {
  position: absolute;
  inset: 0;
  z-index: 10;

  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  padding: 22px;
  border-radius: 12px;
  background: #fff;
  color: #202020;
  max-width: 320px;
}

.qr-title {
  font-weight: 600;
  font-size: 1.05em;
}

.qr-image {
  width: 240px;
  height: 240px;
}

.qr-link {
  font-size: 0.8em;
  color: #555;
  word-break: break-all;
  text-align: center;
}

/* Status / error overlay */
.status-overlay {
  position: absolute;
  inset: 0;
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

/* Mobile / portrait: stack the video on top and the chat panel below. */
@media (max-width: 768px) {
  .screen-sharing-channel-container {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(180px, 42vh) minmax(0, 1fr);
  }

  .video-controls {
    padding: 22px 8px 8px;
    gap: 6px;
  }

  .video-controls button {
    font-size: 0.8em;
    padding: 6px 8px;
    min-width: 0;
  }

  .quality-select {
    font-size: 0.8em;
    padding: 5px;
  }

  .user-container {
    box-shadow: 0 -2px 5px var(--base-shadow-color);
    grid-template-rows: 120px minmax(0, 1fr);
  }

  .status-overlay {
    padding: 16px;
    gap: 10px;
  }

  .overlay-title { font-size: 1.05em; }
  .overlay-detail, .overlay-hint { font-size: 0.85em; }

  .overlay-actions {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }

  .overlay-actions button { width: 100%; }
}

</style>
