import { sharingV1 } from './index';
import {
  CreateSharingChannelRequestDto,
  CreateSharingChannelResponseDto,
  JoinSharingChannelRequestDto, JoinSharingChannelResponseDto,
} from '@/api/models/sharing.dtos';
import DataTransferObject from '@/api/models/common.dtos';

// Create New Sharing Channel
function createSharingChannel(createSharingChannelRequestDto: CreateSharingChannelRequestDto) {
  return sharingV1.postRequest<CreateSharingChannelResponseDto>('/channels', null, createSharingChannelRequestDto);
}

// Join Sharing Channel
function joinSharingChannel(channelId: String, joinSharingChannelRequestDto: JoinSharingChannelRequestDto) {
  return sharingV1.postRequest<JoinSharingChannelResponseDto>(`/channels/${channelId}/join`, {
    channelId: channelId
  }, joinSharingChannelRequestDto);
}

export {
  createSharingChannel,
  joinSharingChannel
};