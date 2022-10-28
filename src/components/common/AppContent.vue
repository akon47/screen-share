<template>
  <div class="content-container">
    <router-view v-slot="{ Component }" :key="$route.fullPath">
      <transition name="component-fade" mode="out-in">
        <component :is="Component" class="content-item"/>
      </transition>
    </router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AppContent',
  data() {
    return {
      peerConnections: new Map<string, RTCPeerConnection>(),
    };
  },
});
</script>

<style scoped>

.content-container {
  display: grid;
  grid-template-columns: minmax(0, 1400px);
  grid-template-rows: 1fr;
  justify-content: center;
  box-sizing: border-box;
  padding: 20px;
  height: 100%;
}

.component-fade-enter-active,
.component-fade-leave-active {
  transition: opacity .1s ease;
}

.component-fade-enter-from,
.component-fade-leave-to {
  opacity: 0;
}
</style>