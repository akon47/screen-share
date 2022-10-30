<template>
  <router-view v-slot="{ Component }" :key="$route.fullPath">
    <transition name="component-fade" mode="out-in">
      <component :is="Component" class="content-item"/>
    </transition>
  </router-view>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AppContent',
});
</script>

<style scoped>

.component-fade-enter-active,
.component-fade-leave-active {
  transition: opacity .1s ease;
}

.component-fade-enter-from,
.component-fade-leave-to {
  opacity: 0;
}
</style>