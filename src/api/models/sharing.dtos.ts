import DataTransferObject from '@/api/models/common.dtos';

// dto for creating sharing channel
export interface CreateSharingChannelRequestDto extends DataTransferObject {
  // channel password
  readonly password: string | null;
  // channel title (shown in the public channel list)
  readonly title?: string | null;
  // whether the channel is listed publicly
  readonly isPublic?: boolean;
}

// dto for a single ICE server entry
export interface IceServerDto extends DataTransferObject {
  readonly urls: string[] | string;
  readonly username?: string;
  readonly credential?: string;
}

// dto for short-lived STUN/TURN ICE servers
export interface TurnCredentialsDto extends DataTransferObject {
  readonly iceServers: IceServerDto[];
}

// dto for a publicly listed sharing channel
export interface PublicChannelDto extends DataTransferObject {
  // channel id
  readonly channelId: string;
  // channel title
  readonly title: string | null;
  // whether the channel requires a password
  readonly hasPassword: boolean;
  // number of users currently in the channel
  readonly userCount: number;
  // channel creation time
  readonly createdAt: string;
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
  // author nickname
  readonly authorNickname?: string | null;
  // created at
  readonly createdAt: Date;
  // last modified at
  readonly lastModifiedAt: Date;
}

// dto for channel user
export interface ChannelUserDto extends DataTransferObject {
  // user id
  readonly id: string;
  // role type (serialized from the server enum name)
  readonly roleType: 'GUEST' | 'HOST' | 'UNKNOWN';
  // user nickname
  readonly nickname?: string | null;
}

// dto for websocket
export interface PayloadDto extends DataTransferObject {
  // authorization token
  readonly authorizationToken: string;
  // payload type
  readonly type:
    | 'JOIN_CHANNEL'
    | 'PART_CHANNEL'
    | 'RELAY_SESSION_DESCRIPTION'
    | 'RELAY_ICE_CANDIDATE'
    | 'JOIN_USER'
    | 'PART_USER'
    | 'USER_UPDATED'
    | 'NEW_MESSAGE'
    | 'CHANNEL_JOINED'
    | 'CHANNEL_PARTED'
    | 'REACTION'
    | 'KICK'
    | 'KICKED'
    | 'DRAW'
    | 'CLEAR_DRAW';
}

// dto for websocket host drawing annotation
export interface DrawPayloadDto extends DataTransferObject, PayloadDto {
  // stroke id (groups the points of a single pen stroke)
  readonly strokeId: string;
  // draw mode: 'pen' or 'eraser'
  readonly mode: 'pen' | 'eraser';
  // stroke color (CSS color)
  readonly color: string;
  // stroke width, normalized to the video content height
  readonly width: number;
  // flattened normalized points [x0, y0, x1, y1, ...] in the range 0..1
  readonly points: number[];
  // id of the user (host) who drew
  readonly userId?: string;
  // when set, deliver only to this user (replay of existing strokes to a new joiner)
  readonly targetUserId?: string;
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