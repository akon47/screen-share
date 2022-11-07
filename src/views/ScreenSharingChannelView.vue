<template>
  <div class="screen-sharing-channel-container">
    <div class="video-container">
      <video v-show="!isLoading" ref="video" playsinline autoplay muted/>
      <div v-show="!isLoading" class="video-footer">
        <div>
          <button @click="copyShareLink">Copy Share Link</button>
        </div>
        <div class="footer-buttons">
          <button @click="partChannel">Exit</button>
        </div>
      </div>
      <loading-spinner v-if="isLoading" class="video-loading-spinner"/>
    </div>
    <div class="user-container">
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

export default defineComponent({
  name: 'ScreenSharingChannelView',
  components: { MessageForm, LoadingSpinner },
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
    token() {
      return this.hostToken ?? this.guestToken ?? '';
    },
  },
  data() {
    return {
      videoElement: {} as HTMLVideoElement,
      stream: {} as MediaStream,
      rtcPeerConnections: new Map<String, RTCPeerConnection>(),
      signalingWebSocketClient: {} as SignalingWebSocketClient,
      newSimpleMessage: {} as SimpleMessageDto,
      isLoading: false,
    };
  },
  methods: {
    async initializeWebSocket(authorizationToken: string) {
      const rtcConfiguration = {
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
      };

      function createPeerConnection(userId: string): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection(rtcConfiguration);

        let signalingState = `SignalingState(${userId}): `;
        peerConnection.onsignalingstatechange = () => {
          signalingState += `${peerConnection.signalingState} => `;
          console.log(signalingState);
        };

        let iceConnectionState = `IceConnectionState(${userId}): `;
        peerConnection.oniceconnectionstatechange = () => {
          iceConnectionState += `${peerConnection.iceConnectionState} => `;
          console.log(iceConnectionState);
        };

        let connectionState = `ConnectionState(${userId}): `;
        peerConnection.onconnectionstatechange = () => {
          connectionState += `${peerConnection.connectionState} => `;
          console.log(connectionState);
        };

        return peerConnection;
      }

      this.signalingWebSocketClient = new SignalingWebSocketClient(authorizationToken);

      this.signalingWebSocketClient.onuserjoined = (userId) => {
        console.log(`onUserJoined: ${userId}`);
        if (this.isHost) {
          this.rtcPeerConnections.set(userId, createPeerConnection(userId));
          const peer = this.rtcPeerConnections.get(userId);
          if (peer) {
            peer.onicecandidate = (ev) => {
              if (ev.candidate) {
                this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
              }
            };
            this.stream.getTracks().forEach((track) => peer.addTrack(track, this.stream));
            peer.createOffer()
            .then((offer) => {
              peer.setLocalDescription(offer);
              this.signalingWebSocketClient.relaySessionDescription(userId, offer);
            });
          }
        }
      };

      this.signalingWebSocketClient.onuserparted = (userId) => {
        console.log(`onUserParted: ${userId}`);

        const peer = this.rtcPeerConnections.get(userId);
        if (peer) {
          if (this.isHost) {
            peer.close();
            this.rtcPeerConnections.delete(userId);
          } else if (this.isGuest) {
            alert('Disconnected from host.');
            this.$router.push('/');
          }
        }
      };

      this.signalingWebSocketClient.onrelaysessiondescription = (userId, sessionDescription) => {
        console.log(`onRelaySessionDescription: ${userId}`);

        if (this.isHost) {
          this.rtcPeerConnections.get(userId)?.setRemoteDescription(new RTCSessionDescription(sessionDescription));
        } else if (this.isGuest) {
          this.rtcPeerConnections.set(userId, createPeerConnection(userId));
          const peer = this.rtcPeerConnections.get(userId);
          if (peer) {
            peer.onicecandidate = (ev) => {
              if (ev.candidate) {
                this.signalingWebSocketClient.relayIceCandidate(userId, ev.candidate);
              }
            };
            peer.ontrack = (ev) => {
              this.stream = ev.streams[0];
              this.videoElement.srcObject = this.stream;
            };
            peer.setRemoteDescription(new RTCSessionDescription(sessionDescription));
            peer.createAnswer()
            .then((answer) => {
              peer.setLocalDescription(answer);
              this.signalingWebSocketClient.relaySessionDescription(userId, answer);
            });
          }
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

      try {
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch {
        this.$router.push('/');
        return;
      }

      this.videoElement.srcObject = this.stream;

      await this.initializeWebSocket(authorizationToken);
    },
    async initializeGuestMode(authorizationToken: string) {
      if (!authorizationToken) {
        return;
      }

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
      this.$toast.success("The link has been copied to the clipboard.");
    },
  },
  async mounted() {
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
}

.video-footer .footer-buttons {
  display: flex;
  align-items: center;
}

.user-container {
  box-shadow: -2px 0px 5px var(--base-shadow-color);
  position: relative;
  z-index: 1;
}

.video-loading-spinner {
  width: 75px;
  height: 75px;

  justify-self: center;
  align-self: center;

  grid-row: 1 / span 2;
}

</style>