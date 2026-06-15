<template>
  <div class="form-container">
    <div class="form-wrapper">
      <div class="form-title">{{ $t('create.title') }}</div>
      <div>
        <input :disabled="isLoading"
               type="text" id="channel-title" v-model="title" :placeholder="$t('create.titlePlaceholder')" maxlength="100"/>
      </div>
      <div>
        <input :class="{'invalid': password && !isPasswordValid}"
               :disabled="isLoading"
               type="text" id="channel-password" v-model="password" :placeholder="$t('create.passwordPlaceholder')" maxlength="16"/>
      </div>
      <label class="public-toggle">
        <input type="checkbox" :disabled="isLoading" v-model="isPublic"/>
        <span>{{ $t('create.makePublic') }}</span>
      </label>
      <div class="public-hint">{{ $t('create.makePublicHint') }}</div>
      <button :disabled="!isPasswordValid || isLoading"
              @click="creatingSharingChannel">
        {{ $t('create.create') }}
      </button>
      <div class="footer-message">
        {{ $t('create.joinPrompt') }}
        <router-link to="/screen-sharing/join-channel">
          {{ $t('create.goJoin') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { createSharingChannel } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';

export default defineComponent({
  name: 'CreateChannelForm',
  data() {
    return {
      title: '',
      password: '',
      isPublic: false,
      isLoading: false,
    };
  },
  computed: {
    isPasswordValid(): boolean {
      return this.password.length <= 16;
    },
  },
  methods: {
    creatingSharingChannel() {
      this.isLoading = true;
      createSharingChannel({
        password: this.password,
        title: this.title.trim() || null,
        isPublic: this.isPublic,
      })
      .then((createSharingChannelResponse) => {
        this.$router.push(`/screen-sharing/${createSharingChannelResponse.channelId}?hostToken=${createSharingChannelResponse.hostToken}`);
      })
      .catch((error: HttpApiError) => {
        this.$toast.error(error.getErrorMessage());
      })
      .finally(() => {
        this.isLoading = false;
      });
    },
  },
});
</script>

<style scoped>

.public-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.public-toggle input {
  width: auto;
  cursor: pointer;
}

.public-hint {
  font-size: 0.85em;
  color: var(--sub-color, #888);
  line-height: 1.4;
}

</style>
