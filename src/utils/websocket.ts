import { PayloadDto, RelayIceCandidateDto, RelaySessionDescriptionDto } from '@/api/models/sharing.dtos';

export default class SignalingWebSocketClient {
  private socket: WebSocket;
  private readonly authorizationToken: string;

  constructor(authorizationToken: string) {
    this.authorizationToken = authorizationToken;
    this.socket = new WebSocket(process.env.VUE_APP_WEBSOCKET_URI);
    this.socket.onopen = () => {
      console.log('onopen');
      this.joinChannel();
    };
    this.socket.onclose = () => {
      console.log('onclose');
    };
    this.socket.onerror = () => {
      console.log('onerror');
    };
    this.socket.onmessage = async (ev) => {
      const payload = JSON.parse(ev.data);
      console.log(payload.type);
      switch (payload.type) {
        case 'JOIN_USER':
          if (this.onuserjoined) {
            this.onuserjoined(payload.userId);
          }
          break;
        case 'PART_USER':
          if (this.onuserparted) {
            this.onuserparted(payload.userId);
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

  public close() {
    this.socket.close();
  }

  public onuserjoined: { (userId: string): void } | undefined;
  public onuserparted: { (userId: string): void } | undefined;
  public onrelaysessiondescription: { (userId: string, sessionDescription: RTCSessionDescriptionInit): void } | undefined;
  public onrelayicecandidate: { (userId: string, iceCandidate: RTCIceCandidateInit): void } | undefined;
}