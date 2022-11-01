<template>
  <div class="message-form-container">
    <div class="message-list-container">
      <message-item v-for="message in simpleMessages.slice().reverse()" :key="message.id" :simple-message="message"/>
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

export default defineComponent({
  name: 'MessageForm',
  components: { MessageItem },
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
  data() {
    return {
      isLoading: false,
      message: '',
      simpleMessages: Array<SimpleMessageDto>(),
      cursorId: '',
      isNoMorePage: true,
    };
  },
  watch: {
    newSimpleMessage(newValue) {
      if(newValue) {
        this.simpleMessages.unshift(newValue);
      }
    }
  },
  methods: {
    async writeMessage() {
      await createMessage(this.token, this.channelId, this.message)
      .then(() => {
        this.message = '';
      })
      .catch((error: HttpApiError) => {
        alert(error.getErrorMessage());
      });
    },
    async fetchMessages(cursorId: string | null = null) {
      try {
        this.isLoading = true;
        await getChannelMessages(this.channelId, 50, cursorId)
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
          alert(error.getErrorMessage());
        });
      } finally {
        this.isLoading = false;
      }
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

  grid-template-rows: auto 1fr;

  align-content: stretch;
  justify-content: stretch;

  background: var(--background-color);

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
}

.message-form-container .message-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;

  height: calc(100vh - var(--header-height) - var(--footer-height) - 100px);
}

</style>
