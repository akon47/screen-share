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

// dto for write message
export interface CreateMessageRequestDto extends DataTransferObject {
  // message
  readonly message: string;
}

// dto for simple message
export interface SimpleMessageDto extends DataTransferObject {
  // message id
  readonly id: string;
  // message
  readonly message: string;
  // author id
  readonly authorId: string;
  // created at
  readonly createdAt: Date;
  // last modified at
  readonly lastModifiedAt: Date;
}

// dto for channel user
export interface ChannelUserDto extends DataTransferObject {
  // user id
  readonly id: string;
  // role type
  readonly roleType: 'ROLE_GUEST' | 'ROLE_HOST';
}

// dto for websocket
export interface PayloadDto extends DataTransferObject {
  // authorization token
  readonly authorizationToken: string;
  // payload type
  readonly type: 'JOIN_CHANNEL' | 'PART_CHANNEL' | 'RELAY_SESSION_DESCRIPTION' | 'RELAY_ICE_CANDIDATE' | 'JOIN_USER' | 'PART_USER' | 'NEW_MESSAGE';
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

// dto for websocket new message
export interface NewMessageDto extends DataTransferObject, PayloadDto {
  // message
  readonly message: SimpleMessageDto;
}