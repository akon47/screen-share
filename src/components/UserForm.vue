<template>
  <div class="user-form-container">
    <div class="nickname-editor">
      <input type="text"
             :placeholder="$t('nickname.placeholder')"
             v-model="nickname"
             maxlength="30"
             :disabled="isSaving"
             @keydown.enter.prevent="saveNickname"/>
      <button :disabled="isSaving" @click="saveNickname">{{ $t('nickname.save') }}</button>
    </div>
    <div class="user-list-container">
      <user-item v-for="user in users" :key="user.id" :user="user"/>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getChannelUsers, updateNickname } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';
import { ChannelUserDto } from '@/api/models/sharing.dtos';
import UserItem from '@/components/UserItem.vue';

const NICKNAME_STORAGE_KEY = 'screen-share-nickname';

export default defineComponent({
  name: 'UserForm',
  components: { UserItem },
  props: {
    token: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    updateKey: {},
  },
  data() {
    return {
      isLoading: false,
      isSaving: false,
      nickname: '',
      users: Array<ChannelUserDto>(),
    };
  },
  watch: {
    updateKey() {
      this.fetchUsers();
    },
  },
  methods: {
    async fetchUsers() {
      if (!this.token) {
        return;
      }

      try {
        this.isLoading = true;
        await getChannelUsers(this.token, this.channelId)
        .then(async (users) => {
          this.users = users.data;
        })
        .catch((error: HttpApiError) => {
          this.$toast.error(error.getErrorMessage());
        });
      } finally {
        this.isLoading = false;
      }
    },
    async saveNickname() {
      if (!this.token || this.isSaving) {
        return;
      }
      const value = this.nickname.trim();
      try {
        this.isSaving = true;
        await updateNickname(this.token, this.channelId, value);
        localStorage.setItem(NICKNAME_STORAGE_KEY, value);
        await this.fetchUsers();
        this.$toast.success(String(this.$t('nickname.saved')));
      } catch (error) {
        this.$toast.error((error as HttpApiError).getErrorMessage());
      } finally {
        this.isSaving = false;
      }
    },
  },
  async mounted() {
    // Restore a previously chosen nickname and apply it automatically.
    const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
    if (saved) {
      this.nickname = saved;
      try {
        await updateNickname(this.token, this.channelId, saved);
      } catch {
        // ignore; the list fetch below still works
      }
    }
    this.fetchUsers();
  },
});
</script>

<style scoped>

.user-form-container {
  box-shadow: 0px 1px 5px var(--base-shadow-color);
  z-index: 1000;
  background: var(--content-background-color);
  width: 100%;
  height: 100%;

  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.nickname-editor {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  box-sizing: border-box;
}

.nickname-editor input {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  padding: 8px;
  box-sizing: border-box;
  border-radius: var(--base-border-radius);
  border: 1px solid var(--border-color);
  outline: none;
  background: var(--content-background-color);
  color: var(--base-color);
}

.nickname-editor button {
  font-size: 13px;
  padding: 8px 12px;
  white-space: nowrap;
}

.user-form-container .user-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

</style>
