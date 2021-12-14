<template>
  <app-navigator :avatar="avatar" />
  <game-view />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AppNavigator from "/@/components/Navigator.vue";
import GameView from "/@/components/GameView.vue";
export default defineComponent({
  name: "App",
  components: {
    AppNavigator,
    GameView
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
}
</style>
