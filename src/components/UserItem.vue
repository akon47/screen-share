<template>
  <div class="user-item-container">
    <span v-if="isHost" class="role-badge">{{ $t('nickname.host') }}</span>
    <div class="identifier">
      {{ identifier }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ChannelUserDto } from '@/api/models/sharing.dtos';

export default defineComponent({
  name: 'UserItem',
  props: {
    user: Object as PropType<ChannelUserDto>,
  },
  computed: {
    isHost(): boolean {
      return this.user?.roleType === 'ROLE_HOST';
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

</style>
