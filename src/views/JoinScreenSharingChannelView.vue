<template>
  <div class="join-screen-sharing-channel-container">
    <join-channel-form />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import JoinChannelForm from '@/components/JoinChannelForm.vue';

export default defineComponent({
  name: 'JoinScreenSharingChannelView',
  components: { JoinChannelForm },
});
</script>

<style scoped>

.join-screen-sharing-channel-container {
  display: grid;

  width: 100%;
  height: 100%;
}

</style>
