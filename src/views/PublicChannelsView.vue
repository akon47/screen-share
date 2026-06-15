<template>
  <div class="public-channels-container">
    <div class="public-channels-wrapper">
      <div class="header-row">
        <div class="form-title">{{ $t('publicList.title') }}</div>
        <button class="refresh-button" :disabled="isLoading" @click="loadChannels">
          ⟳ {{ $t('publicList.refresh') }}
        </button>
      </div>

      <loading-spinner v-if="isLoading" class="list-spinner"/>

      <div v-else-if="channels.length === 0" class="empty-message">
        {{ $t('publicList.empty') }}
        <router-link class="empty-create" to="/screen-sharing/create-channel">
          {{ $t('publicList.goCreate') }}
        </router-link>
      </div>

      <ul v-else class="channel-list">
        <li v-for="channel in channels" :key="channel.channelId" class="channel-item">
          <div class="channel-info">
            <div class="channel-title">{{ channel.title || $t('publicList.untitled') }}</div>
            <div class="channel-meta">
              <span class="badge" :class="channel.hasPassword ? 'locked' : 'open'">
                {{ channel.hasPassword ? '🔒 ' + $t('publicList.locked') : '🌐 ' + $t('publicList.open') }}
              </span>
              <span class="viewers">{{ $t('publicList.viewers', { count: channel.userCount }) }}</span>
            </div>
          </div>
          <button class="join-button" :disabled="isLoading" @click="joinChannel(channel)">
            {{ $t('publicList.join') }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getPublicChannels, joinSharingChannel } from '@/api/sharing';
import { PublicChannelDto } from '@/api/models/sharing.dtos';
import { HttpApiError } from '@/api/common/httpApiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

export default defineComponent({
  name: 'PublicChannelsView',
  components: { LoadingSpinner },
  data() {
    return {
      channels: [] as PublicChannelDto[],
      isLoading: false,
    };
  },
  methods: {
    async loadChannels() {
      this.isLoading = true;
      try {
        const response = await getPublicChannels();
        this.channels = response.data ?? [];
      } catch {
        this.channels = [];
      } finally {
        this.isLoading = false;
      }
    },
    async joinChannel(channel: PublicChannelDto, password = '') {
      try {
        const response = await joinSharingChannel(channel.channelId, { password });
        this.$router.push(`/screen-sharing/${response.channelId}?guestToken=${response.guestToken}`);
      } catch (error) {
        const apiError = error as HttpApiError;
        if (apiError.isUnauthorized && apiError.isUnauthorized()) {
          const entered = prompt(String(this.$t('publicList.passwordPrompt')));
          if (entered) {
            await this.joinChannel(channel, entered);
          }
        } else if (apiError.isNotFound && apiError.isNotFound()) {
          this.$toast.error(String(this.$t('join.notFound')));
          await this.loadChannels();
        } else {
          this.$toast.error(String(this.$t('join.notFound')));
        }
      }
    },
  },
  mounted() {
    this.loadChannels();
  },
});
</script>

<style scoped>
.public-channels-container {
  display: grid;
  width: 100%;
  height: 100%;
  justify-items: center;
  align-content: start;
  padding: 30px 16px;
  box-sizing: border-box;
}

.public-channels-wrapper {
  width: 100%;
  max-width: 560px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.form-title {
  font-size: 1.4em;
  font-weight: bold;
}

.refresh-button {
  padding: 7px 14px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--menu-hover-color);
  color: var(--base-color);
  border-radius: 6px;
}

.list-spinner {
  width: 60px;
  height: 60px;
  margin: 40px auto;
  display: block;
}

.empty-message {
  text-align: center;
  color: var(--sub-color, #888);
  margin-top: 40px;
  line-height: 1.8;
}

.empty-create {
  display: block;
  margin-top: 8px;
}

.channel-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.channel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--menu-hover-color);
  border-radius: 8px;
}

.channel-info {
  min-width: 0;
}

.channel-title {
  font-size: 1.05em;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 0.85em;
  color: var(--sub-color, #888);
}

.badge.locked {
  color: #e0883d;
}

.badge.open {
  color: #3ec46d;
}

.join-button {
  padding: 9px 18px;
  cursor: pointer;
  white-space: nowrap;
}
</style>
