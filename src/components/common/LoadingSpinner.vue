<template>
  <div class="loading-spinner-container">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 100 100" xml:space="preserve">
        <path d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
          <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              dur="1s"
              from="0 50 50"
              to="360 50 50"
              repeatCount="indefinite"/>
        </path>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LoadingSpinner',
});
</script>

<style scoped>

.loading-spinner-container {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
}

.loading-spinner-container svg {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  fill: var(--base-color);
}

</style>