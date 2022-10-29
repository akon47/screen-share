import DataTransferObject from '@/api/models/common.dtos';

// dto for creating sharing channel
export interface CreateSharingChannelRequestDto extends DataTransferObject {
  // channel password
  readonly password: string | null;
}

// dto for creating sharing channel
export interface CreateSharingChannelResponseDto extends DataTransferObject {
  // user id
  readonly userId: string;
  // channel id
  readonly channelId: string;
  // channel owner token
  readonly hostToken: string;
}

// dto for join sharing channel
export interface JoinSharingChannelRequestDto extends DataTransferObject {
  // channel password
  readonly password: string;
}

// dto for join sharing channel
export interface JoinSharingChannelResponseDto extends DataTransferObject {
  // user id
  readonly userId: string;
  // channel id
  readonly channelId: string;
  // channel owner token
  readonly guestToken: string;
}

// dto for websocket
export interface PayloadDto extends DataTransferObject {
  // authorization token
  readonly authorizationToken: string;
  // payload type
  readonly type: 'JOIN_CHANNEL' | 'PART_CHANNEL' | 'RELAY_SESSION_DESCRIPTION' | 'RELAY_ICE_CANDIDATE' | 'JOIN_USER' | 'PART_USER';
}

// dto for websocket relay session description
export interface RelaySessionDescriptionDto extends DataTransferObject, PayloadDto {
  // channel id
  readonly userId: string;
  // session description
  readonly sessionDescription: any;
}

// dto for websocket relay ice candidate
export interface RelayIceCandidateDto extends DataTransferObject, PayloadDto {
  // channel id
  readonly userId: string;
  // ice candidate
  readonly iceCandidate: any;
}