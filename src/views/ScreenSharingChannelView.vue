<template>
  <div class="screen-sharing-channel-container">
    <div id="content-wrapper">
      <video class="screen-video" ref="video" playsinline autoplay muted/>
    </div>
    {{ channelId }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { joinSharingChannel } from '@/api/sharing';
import SignalingWebSocketClient from '@/utils/websocket';

export default defineComponent({
  name: 'ScreenSharingChannelView',
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
    isHost() {
      return this.hostToken ? true : false;
    },
    isGuest() {
      return this.guestToken ? true : false;
    },
  },
  data() {
    return {
      stream: {} as MediaStream,
      rtcPeerConnections: new Map<String, RTCPeerConnection>(),
      signalingWebSocketClient: {} as SignalingWebSocketClient,
    };
  },
  methods: {
    async initializeWebSocket(authorizationToken: String) {
      this.signalingWebSocketClient = new SignalingWebSocketClient(authorizationToken);

      this.signalingWebSocketClient.onuserjoined = async (userId) => {
        if (this.isHost) {
          this.rtcPeerConnections.set(userId, new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
            ],
          }));
          const peer = this.rtcPeerConnections.get(userId);
          if (peer) {
            peer.onicecandidate = (ev) => {
              if (ev.candidate) {
                this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
              }
            };
            this.stream.getTracks().forEach((track) => peer.addTrack(track, this.stream));
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            this.signalingWebSocketClient.relaySessionDescription(userId, offer);
          }
        }
      };

      this.signalingWebSocketClient.onuserparted = (userId) => {
        const peer = this.rtcPeerConnections.get(userId);
        if (peer) {
          if (this.isHost) {
            peer.close();
            this.rtcPeerConnections.delete(userId);
          } else if (this.isGuest) {
            alert('호스트와 연결이 끊어졌습니다.');
            this.$router.push('/');
          }
        }
      };

      this.signalingWebSocketClient.onrelaysessiondescription = async (userId, sessionDescription) => {
        if (this.isHost) {
          await this.rtcPeerConnections.get(userId)?.setRemoteDescription(new RTCSessionDescription(sessionDescription));
        } else if (this.isGuest) {
          this.rtcPeerConnections.set(userId, new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
            ],
          }));
          const peer = this.rtcPeerConnections.get(userId);
          if (peer) {
            peer.onicecandidate = (ev) => {
              if (ev.candidate) {
                this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
              }
            };
            peer.ontrack = (ev) => {
              this.stream = ev.streams[0];

              const videoElement = this.$refs.video as HTMLVideoElement;
              videoElement.srcObject = this.stream;
            };
            await peer.setRemoteDescription(new RTCSessionDescription(sessionDescription));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            this.signalingWebSocketClient.relaySessionDescription(userId, answer);
          }
        }
      };

      this.signalingWebSocketClient.onrelayicecandidate = async (userId, iceCandidate) => {
        await this.rtcPeerConnections.get(userId)?.addIceCandidate(new RTCIceCandidate(iceCandidate));
      };
    },
    async initializeHostMode(authorizationToken: String) {
      if (!authorizationToken) {
        return;
      }

      try {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch {
        this.$router.push('/');
        return;
      }

      const videoElement = this.$refs.video as HTMLVideoElement;
      videoElement.srcObject = this.stream;

      await this.initializeWebSocket(authorizationToken);
    },
    async initializeGuestMode(authorizationToken: String) {
      if (!authorizationToken) {
        return;
      }

      await this.initializeWebSocket(authorizationToken);
    },
  },
  async mounted() {
    if (!this.hostToken && !this.guestToken) {
      await joinSharingChannel(this.channelId, {
        password: null,
      })
      .then((joinSharingChannelResponse) => {
        this.$router.push(`/screen-sharing/${joinSharingChannelResponse.channelId}?guestToken=${joinSharingChannelResponse.guestToken}`);
      })
      return;
    }

    if (this.hostToken) {
      await this.initializeHostMode(this.hostToken);
    } else if (this.guestToken) {
      await this.initializeGuestMode(this.guestToken);
    }
  },
  unmounted() {
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
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);

  justify-items: center;
  align-items: center;
}

.screen-video {
  width: 100%;
  background: black;
}

</style>