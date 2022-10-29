<template>
  <div class="screen-sharing-container">
    <div class="form-container">
      <div class="form-wrapper">
        <div class="form-title">Screen Sharing</div>
        <button @click="creatingSharingChannel">New Sharing</button>
        <button @click="joiningSharingChannel">Join Sharing</button>
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
  },
});
</script>

<style scoped>
.screen-sharing-container {
  display: grid;

  width: 100%;
  height: 100%;
}


</style>