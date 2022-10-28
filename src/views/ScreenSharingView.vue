<template>
  <div class="screen-sharing-container">
    <div id="content-wrapper">
      <div class="content-item">
        <h2>Screen Sharing</h2>
        <div class="buttons">
          <button @click="creatingSharingChannel">Create</button>
          <button @click="joiningSharingChannel">Join</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { createSharingChannel, joinSharingChannel } from '@/api/sharing';

export default defineComponent({
  name: 'ScreenSharingView',
  methods: {
    creatingSharingChannel() {
      createSharingChannel({
        password: null,
      })
      .then((createSharingChannelResponse) => {
        this.$router.push(`/screen-sharing/${createSharingChannelResponse.channelId}?hostToken=${createSharingChannelResponse.hostToken}`);
      });
    },
    joiningSharingChannel() {
      var channelId = prompt("channel id");
      if(channelId) {
        joinSharingChannel(channelId, {
          password: null
        })
        .then((joinSharingChannelResponse) => {
          this.$router.push(`/screen-sharing/${joinSharingChannelResponse.channelId}?guestToken=${joinSharingChannelResponse.guestToken}`);
        });
      }
    },
  },
});
</script>

<style scoped>
.screen-sharing-container {
  display: flex;
  flex-flow: column;

  align-items: center;
  justify-content: center;
}

.screen-sharing-container button {
  min-width: 100px;
  min-height: 50px;
  margin: 5px;
  font-size: 20px;
  font-weight: bold;
}

.content-item {
  display: flex;
  flex-flow: column;

  min-width: 450px;
  align-items: center;
}

@media (max-width: 720px) {
  .content-item {
    min-width: 0px;
    align-items: stretch;
  }
}

.content-item h2 {
  margin-bottom: 20px;
  text-align: center;
}

.content-item .buttons {
  display: flex;
  flex-flow: column;

  width: 100%;
}

</style>