<template>
  <div class="user-item-container">
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
    identifier() {
      return this.user?.id.split('-').pop();
    },
  },
  methods: {},
});
</script>

<style scoped>

.user-item-container {
  box-sizing: border-box;
}

.user-item-container .identifier {
  font-size: 1em;
}

</style>
