<template>
  <div
    class="h-full w-14 absolute inset-y-0 left-0 border-solid border-r-2 border-gray-500"
  >
    <div class="flex flex-col px-2 py-3 gap-4">
      <button class="btn-navbar">
        <i-ion-game-controller class="w-7 h-7" />
      </button>
      <button class="btn-navbar">
        <i-ion-settings class="w-7 h-7" />
      </button>
    </div>
    <div class="flex flex-col-reverse px-2 py-3 gap-4 absolute bottom-0">
      <button class="btn-navbar">
        <i-ion-person-circle-outline
          v-if="!avatar"
          class="w-7 h-7"
        />
        <img
          v-else
          id="avatar"
          :src="avatar"
          class="w-7 h-7 rounded-full object-cover"
        >
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "AppNavigator",
  props: {
    avatar: {
      type: String,
      default: null
    }
  }
});
</script>

<style scoped>
</style>