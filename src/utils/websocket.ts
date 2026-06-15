import {
  ChannelUserDto,
  PayloadDto,
  RelayIceCandidateDto,
  RelaySessionDescriptionDto,
  SimpleMessageDto,
} from '@/api/models/sharing.dtos';
import SockJS from 'sockjs-client';

export default class SignalingWebSocketClient {
  private socket: WebSocket;
  private readonly authorizationToken: string;

  constructor(authorizationToken: string) {
    this.authorizationToken = authorizationToken;
    this.socket = new SockJS(process.env.VUE_APP_WEBSOCKET_URI as string);
    this.socket.onopen = () => {
      console.log('onopen');
      this.joinChannel();
    };
    this.socket.onclose = (ev) => {
      console.log('onclose');
      if (this.onclose) {
        this.onclose(ev);
      }
    };
    this.socket.onerror = (ev) => {
      console.log('onerror');
      if (this.onerror) {
        this.onerror(ev);
      }
    };
    this.socket.onmessage = async (ev) => {
      const payload = JSON.parse(ev.data);
      console.log(payload.type);
      switch (payload.type) {
        case 'JOIN_USER':
          if (this.onuserjoined) {
            this.onuserjoined(payload.user);
          }
          break;
        case 'PART_USER':
          if (this.onuserparted) {
            this.onuserparted(payload.user);
          }
          break;
        case 'USER_UPDATED':
          if (this.onuserupdated) {
            this.onuserupdated(payload.user);
          }
          break;
        case 'RELAY_SESSION_DESCRIPTION':
          if (this.onrelaysessiondescription) {
            this.onrelaysessiondescription(payload.userId, payload.sessionDescription);
          }
          break;
        case 'RELAY_ICE_CANDIDATE':
          if (this.onrelayicecandidate) {
            this.onrelayicecandidate(payload.userId, payload.iceCandidate);
          }
          break;
        case 'NEW_MESSAGE':
          if (this.onnewmessage) {
            this.onnewmessage(payload.message);
          }
          break;
        case 'CHANNEL_JOINED':
          if (this.onchanneljoined) {
            this.onchanneljoined(payload.user);
          }
          break;
        case 'REACTION':
          if (this.onreaction) {
            this.onreaction(payload.emoji, payload.userId);
          }
          break;
        case 'KICKED':
          if (this.onkicked) {
            this.onkicked();
          }
          break;
      }
    };
  }

  private joinChannel() {
    this.socket.send(JSON.stringify({
      authorizationToken: this.authorizationToken,
      type: 'JOIN_CHANNEL',
    } as PayloadDto));
  }

  public relaySessionDescription(targetUserId: string, sessionDescription: RTCSessionDescriptionInit) {
    this.socket.send(JSON.stringify({
      authorizationToken: this.authorizationToken,
      type: 'RELAY_SESSION_DESCRIPTION',
      userId: targetUserId,
      sessionDescription: sessionDescription,
    } as RelaySessionDescriptionDto));
  }

  public relayIceCandidate(targetUserId: string, candidate: RTCIceCandidate) {
    this.socket.send(JSON.stringify({
      authorizationToken: this.authorizationToken,
      type: 'RELAY_ICE_CANDIDATE',
      userId: targetUserId,
      iceCandidate: candidate,
    } as RelayIceCandidateDto));
  }

  public sendReaction(emoji: string) {
    this.socket.send(JSON.stringify({
      authorizationToken: this.authorizationToken,
      type: 'REACTION',
      emoji: emoji,
    }));
  }

  public kickUser(targetUserId: string) {
    this.socket.send(JSON.stringify({
      authorizationToken: this.authorizationToken,
      type: 'KICK',
      userId: targetUserId,
    }));
  }

  public close() {
    this.socket.close();
  }

  public onuserjoined: { (user: ChannelUserDto): void } | undefined;
  public onuserparted: { (user: ChannelUserDto): void } | undefined;
  public onuserupdated: { (user: ChannelUserDto): void } | undefined;
  public onrelaysessiondescription: { (userId: string, sessionDescription: RTCSessionDescriptionInit): void } | undefined;
  public onrelayicecandidate: { (userId: string, iceCandidate: RTCIceCandidateInit): void } | undefined;
  public onnewmessage: { (message: SimpleMessageDto): void } | undefined;
  public onreaction: { (emoji: string, userId: string): void } | undefined;
  public onkicked: { (): void } | undefined;

  public onchanneljoined: { (user: ChannelUserDto): void } | undefined;

  // Transport-level events (used to surface signaling failures to the user).
  public onerror: { (event: Event): void } | undefined;
  public onclose: { (event: CloseEvent): void } | undefined;
}