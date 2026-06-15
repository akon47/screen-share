<template>
  <div class="user-item-container">
    <span v-if="isHostUser" class="role-badge">{{ $t('nickname.host') }}</span>
    <div class="identifier">
      {{ identifier }}
    </div>
    <span v-if="isMe" class="me-tag">({{ $t('nickname.me') }})</span>
    <div class="user-actions" v-if="showActions">
      <button class="action-btn kick" :title="$t('nickname.kick')" @click="$emit('kick', user.id)">⛔</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ChannelUserDto } from '@/api/models/sharing.dtos';

export default defineComponent({
  name: 'UserItem',
  emits: ['kick'],
  props: {
    user: Object as PropType<ChannelUserDto>,
    myId: {
      type: String,
      default: '',
    },
    isHost: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isHostUser(): boolean {
      return this.user?.roleType === 'HOST';
    },
    isMe(): boolean {
      return !!this.myId && this.user?.id === this.myId;
    },
    identifier() {
      // Prefer the nickname, fall back to the short id segment.
      return this.user?.nickname || this.user?.id.split('-').pop();
    },
    // Host-only kick action, never shown for the host's own row or other hosts.
    showActions(): boolean {
      return this.isHost && !this.isMe && !this.isHostUser;
    },
  },
});
</script>

<style scoped>

.user-item-container {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.user-item-container .identifier {
  font-size: 1em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-badge {
  font-size: 0.7em;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--link-accent-color);
  color: #fff;
  flex-shrink: 0;
}

.me-tag {
  font-size: 0.8em;
  color: var(--link-accent-color);
  font-weight: bold;
  flex-shrink: 0;
}

.user-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.user-actions .action-btn {
  font-size: 0.85em;
  line-height: 1;
  padding: 3px 5px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.7;
}

.user-actions .action-btn:hover {
  opacity: 1;
}

.user-actions .action-btn.kick:hover {
  border-color: #e0533d;
}

</style>
