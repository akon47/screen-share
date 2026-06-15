<template>
  <div class="user-item-container">
    <span v-if="isHost" class="role-badge">{{ $t('nickname.host') }}</span>
    <div class="identifier">
      {{ identifier }}
    </div>
    <span v-if="isMe" class="me-tag">({{ $t('nickname.me') }})</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ChannelUserDto } from '@/api/models/sharing.dtos';

export default defineComponent({
  name: 'UserItem',
  props: {
    user: Object as PropType<ChannelUserDto>,
    myId: {
      type: String,
      default: '',
    },
  },
  computed: {
    isHost(): boolean {
      return this.user?.roleType === 'HOST';
    },
    isMe(): boolean {
      return !!this.myId && this.user?.id === this.myId;
    },
    identifier() {
      // Prefer the nickname, fall back to the short id segment.
      return this.user?.nickname || this.user?.id.split('-').pop();
    },
  },
  methods: {},
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

</style>
