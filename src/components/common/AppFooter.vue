<template>
  <div class="footer-container">

    <div class="metas">
      <span>Copyright © 2022. 김환(Kim,Hwan) all rights reserved.</span>
      <div class="counter">
        <img src="https://counter.kimhwan.kr?key=screenshare.kimhwan.kr" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AppFooter',
});
</script>

<style scoped>

.footer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.footer-container > .metas {
  flex-grow: 1;
  display: grid;
  justify-content: center;
  align-content: center;
  font-size: 12px;

  row-gap: 10px;
}

.metas > .counter {
  justify-self: center;
}

</style>