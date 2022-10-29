<template>
  <div class="create-screen-sharing-channel-container">
    <create-channel-form />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CreateChannelForm from '@/components/CreateChannelForm.vue';

export default defineComponent({
  name: 'CreateScreenSharingChannelView',
  components: { CreateChannelForm },
});
</script>

<style scoped>

.create-screen-sharing-channel-container {
  display: grid;

  width: 100%;
  height: 100%;
}

</style>
