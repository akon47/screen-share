<template>
  <div ref="trigger-element">

  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: 'ObserverTrigger',
  data() {
    return {
      observer: IntersectionObserver.prototype,
      option: {
        root: null,
        threshold: 0.1,
      },
    };
  },
  methods: {
    handleIntersect: function (target: IntersectionObserverEntry) {
      if (target.isIntersecting) {
        this.$emit(`trigger`);
      }
    },
  },
  mounted() {
    this.observer = new IntersectionObserver((entries) => {
      this.handleIntersect(entries[0]);
    }, this.option);
    this.observer.observe(this.$refs["trigger-element"] as Element);
  },
});
</script>

<style scoped>

div {
  opacity: 0;
}

</style>