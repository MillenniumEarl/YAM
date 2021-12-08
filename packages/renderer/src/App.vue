<template>
  <app-navigator :avatar="avatar" />
  <game-preview />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AppNavigator from "/@/components/Navigator.vue";
import GamePreview from "/@/components/GamePreview.vue";
export default defineComponent({
  name: "App",
  components: {
    GamePreview,
    AppNavigator,
  },
  data() {
    return {
      avatar: "../../assets/avatar.jpg",
    };
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
