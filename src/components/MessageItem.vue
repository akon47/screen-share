<template>
  <div class="message-item-container">
    {{ simpleMessage?.message }}
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SimpleMessageDto } from '@/api/models/sharing.dtos';

export default defineComponent({
  name: 'MessageItem',
  props: {
    simpleMessage: Object as PropType<SimpleMessageDto>,
  },
  methods: {},
});
</script>

<style scoped>

.message-item-container {
  padding: 12px;
}

</style>
