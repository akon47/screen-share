import { sharingV1 } from './index';
import {
  ChannelUserDto,
  CreateMessageRequestDto,
  CreateSharingChannelRequestDto,
  CreateSharingChannelResponseDto,
  JoinSharingChannelRequestDto, JoinSharingChannelResponseDto, SimpleMessageDto,
} from '@/api/models/sharing.dtos';
import DataTransferObject, { CollectionDto, SliceDto } from '@/api/models/common.dtos';

// Create New Sharing Channel
function createSharingChannel(createSharingChannelRequestDto: CreateSharingChannelRequestDto) {
  return sharingV1.postRequest<CreateSharingChannelResponseDto>('/channels', null, createSharingChannelRequestDto);
}

// Join Sharing Channel
function joinSharingChannel(channelId: String, joinSharingChannelRequestDto: JoinSharingChannelRequestDto) {
  return sharingV1.postRequest<JoinSharingChannelResponseDto>(`/channels/${channelId}/join`, {
    channelId: channelId,
  }, joinSharingChannelRequestDto);
}

// Get Channel Messages
function getChannelMessages(channelId: string, size: number, cursorId: string | null = null) {
  return sharingV1.getRequest<SliceDto<SimpleMessageDto>>(`/channels/${channelId}/messages`, {
    cursorId: cursorId,
    size: size,
  });
}

// Write Message
function createMessage(authorizationToken: string, channelId: string, message: string) {
  return sharingV1.postRequest<SimpleMessageDto>(`/channels/${channelId}/messages`, null, {
    message: message,
  } as CreateMessageRequestDto, {
    Authorization: authorizationToken,
  });
}

// Get Channel Users
function getChannelUsers(authorizationToken: string, channelId: string) {
  return sharingV1.getRequest<CollectionDto<ChannelUserDto>>(`/channels/${channelId}/users`, null, {
    Authorization: authorizationToken,
  });
}

export {
  createSharingChannel,
  joinSharingChannel,
  createMessage,
  getChannelMessages,
  getChannelUsers,
};