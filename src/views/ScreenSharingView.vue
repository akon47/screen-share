<template>
  <div class="screen-sharing-container">
    <div class="form-container">
      <div class="form-wrapper">
        <div class="form-title">{{ $t('home.title') }}</div>
        <button @click="creatingSharingChannel">{{ $t('home.newSharing') }}</button>
        <button @click="joiningSharingChannel">{{ $t('home.joinSharing') }}</button>
        <button class="secondary" @click="browsingPublicChannels">{{ $t('home.browsePublic') }}</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ScreenSharingView',
  methods: {
    creatingSharingChannel() {
      this.$router.push(`/screen-sharing/create-channel`);
    },
    joiningSharingChannel() {
      this.$router.push(`/screen-sharing/join-channel`);
    },
    browsingPublicChannels() {
      this.$router.push(`/screen-sharing/public-channels`);
    },
  },
});
</script>

<style scoped>
.screen-sharing-container {
  display: grid;

  width: 100%;
  height: 100%;
}

.form-wrapper button.secondary {
  background: transparent;
  border: 1px solid var(--menu-hover-color);
  color: var(--base-color);
}


</style>