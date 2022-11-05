<template>
  <div class="message-item-container">
    <div v-if="!isContinuousMessage" class="message-header">
      <div class="identifier">{{ identifier }}</div>
      <div>
        <span v-if="isModified">(Modified)</span>
        {{ createdAt }}
      </div>
    </div>
    <div class="message">
      {{ simpleMessage?.message }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { SimpleMessageDto } from '@/api/models/sharing.dtos';
import dayjs from 'dayjs';

export default defineComponent({
  name: 'MessageItem',
  props: {
    simpleMessage: Object as PropType<SimpleMessageDto>,
    previousSimpleMessage: Object as PropType<SimpleMessageDto>,
  },
  computed: {
    identifier() {
      return this.simpleMessage?.authorId.split('-').pop();
    },
    createdAt() {
      return dayjs(this.simpleMessage?.createdAt).format('YYYY.MM.DD H:mm');
    },
    isModified() {
      return this.simpleMessage?.createdAt != this.simpleMessage?.lastModifiedAt;
    },
    isContinuousMessage() {
      if (!this.previousSimpleMessage || !this.simpleMessage)
        return false;

      if (this.previousSimpleMessage.authorId !== this.simpleMessage.authorId)
        return false;

      const previousCreateAt = new Date(this.previousSimpleMessage.createdAt);
      const currentCreateAt = new Date(this.simpleMessage.createdAt);

      return (currentCreateAt.getTime() - previousCreateAt.getTime() <= 1000 * 60 * 5);
    },
  },
  methods: {},
});
</script>

<style scoped>

.message-item-container {
  display: inline-grid;
  grid-template-rows: auto auto;
  grid-template-columns: 1fr;
}

.message-item-container .message-header {
  display: flex;
  justify-content: space-between;

  font-size: 0.75em;

  margin: 12px 0px 0px 0px;
}

.message-header .identifier {
  overflow: hidden;
}

.message-item-container .message {
  padding: 3px 6px;
  margin-top: 6px;
  border-radius: 5px;
  background: var(--content-background-color);

  word-break: break-all;
  word-wrap: break-word;
}

</style>
