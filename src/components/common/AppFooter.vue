<template>
  <div class="footer-container">

    <div class="metas">
      <div class="links">
        <a href="https://github.com/akon47/screen-share">
          <img src="https://img.shields.io/badge/GitHub-Repository-red?style=flat&logo=github"/>
        </a>
      </div>
      <div class="counter">
        <img src="https://counter.kimhwan.kr?key=screenshare.kimhwan.kr"/>
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

.metas > .links {
  display: grid;
  grid-auto-columns: auto;
  grid-template-rows: auto;

  grid-auto-flow: column;

  grid-column-gap: 5px;
}

.metas > .counter {
  justify-self: center;
}

</style>