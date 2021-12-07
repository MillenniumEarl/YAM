<template>
  <game-preview />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import GamePreview from "/@/components/GamePreview.vue";
export default defineComponent({
  name: "App",
  components: {
    GamePreview,
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: white;
  margin-top: 60px;
}
</style>
