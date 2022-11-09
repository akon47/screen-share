<template>
  <div class="message-form-container">
    <div class="message-list-container" ref="message-list" @scroll="handleScroll">
      <observer-trigger
          v-if="!isNoMorePage && !isLoading"
          class="observer-trigger-enable"
          v-on:trigger="loadMoreMessages"/>
      <message-item v-for="(message, index) in messages" :key="message.id"
                    :simple-message="message"
                    :previous-simple-message="messages[index - 1]"/>
    </div>
    <textarea placeholder="Type message here..."
              :disabled="isLoading"
              v-model="message"
              @keydown.enter.exact.prevent="writeMessage"
              @keydown.enter.alt.exact.prevent="message += '\n'"/>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { createMessage, getChannelMessages } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';
import { SimpleMessageDto } from '@/api/models/sharing.dtos';
import MessageItem from '@/components/MessageItem.vue';
import ObserverTrigger from '@/components/common/ObserverTrigger.vue';

export default defineComponent({
  name: 'MessageForm',
  components: { ObserverTrigger, MessageItem },
  props: {
    token: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    newSimpleMessage: {} as PropType<SimpleMessageDto>,
  },
  computed: {
    messages() {
      return this.simpleMessages.slice().reverse();
    },
  },
  data() {
    return {
      isLoading: false,
      message: '',
      simpleMessages: Array<SimpleMessageDto>(),
      cursorId: '',
      isNoMorePage: true,
      isScrollEnd: true,
    };
  },
  watch: {
    newSimpleMessage(newValue) {
      if (newValue) {
        this.simpleMessages.unshift(newValue);
      }
    },
    messages() {
      if (this.isScrollEnd) {
        this.$nextTick(() => this.messageScrollToBottom(this.isLoading ? 'auto' : 'smooth'));
      }
    },
  },
  methods: {
    async writeMessage() {
      if (!this.message)
        return;

      await createMessage(this.token, this.channelId, this.message)
      .then(() => {
        this.message = '';
      })
      .catch((error: HttpApiError) => {
        this.$toast.error(error.getErrorMessage());
      });
    },
    async fetchMessages(cursorId: string | null = null, size: number = 50) {
      try {
        this.isLoading = true;
        await getChannelMessages(this.channelId, size, cursorId)
        .then(async (messages) => {
          if (messages.first) {
            this.simpleMessages = messages.data;
          } else {
            messages.data.forEach((message) => {
              this.simpleMessages.push(message);
            });
          }
          this.cursorId = (!messages.last && messages.cursorId) ? messages.cursorId : '';
          this.isNoMorePage = messages.last;
        })
        .catch((error: HttpApiError) => {
          this.$toast.error(error.getErrorMessage());
        });
      } finally {
        this.isLoading = false;
      }
    },
    async loadMoreMessages() {
      if (this.cursorId) {
        await this.fetchMessages(this.cursorId, 10);
      }
    },
    messageScrollToBottom(scrollBehavior: 'auto' | 'smooth' = 'auto') {
      const messageList = this.$refs['message-list'] as HTMLDivElement;
      if (messageList) {
        messageList.scrollTo({
          top: messageList.scrollHeight,
          behavior: scrollBehavior,
        });
      }
    },
    handleScroll(e: Event) {
      const { scrollTop, offsetHeight, scrollHeight } = e.target as HTMLDivElement;
      this.isScrollEnd = scrollTop + offsetHeight >= scrollHeight;
    },
  },
  mounted() {
    this.fetchMessages();
  },
});
</script>

<style scoped>

.message-form-container {
  display: grid;

  grid-template-rows: minmax(0, 1fr) 100px;

  align-content: stretch;
  justify-content: stretch;

  background: var(--content-background-color);

  width: 100%;
  height: 100%;
}

.message-form-container textarea {
  font-size: 14px;
  line-height: 20px;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  outline: none;
  resize: none;

  width: 100%;
  height: 100%;
}

.message-form-container .message-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  overflow-x: hidden;
  box-sizing: border-box;

  padding: 12px;

  width: 100%;
  height: 100%;

}

</style>
