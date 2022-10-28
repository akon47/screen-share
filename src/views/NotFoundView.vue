<template>
  <div class="not-found-container">
    <div class="status">404</div>
    <div class="message">PAGE NOT FOUND</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'NotFoundView',
});
</script>

<style scoped>

.not-found-container {
  display: grid;

  align-items: center;
  justify-items: center;
  align-content: center;

  font-weight: bold;
}

.status {
  font-size: 100px;
}

.message {
  font-size: 30px;
}

</style>
