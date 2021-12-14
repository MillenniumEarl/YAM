<template>
  <div
    class="text-sm h-screen w-1/3 border-solid border-l-2 border-gray-500 px-3 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 overflow-y-auto"
  >
    <!-- Game's cover and overlay for abandoned games -->
    <div
      class="relative overflow-hidden border-solid border-2 border-gray-500 rounded-lg"
    >
      <img
        :src="game.preview"
        class="object-scale-down"
      >
      <div
        v-if="game.status === 'Abandoned'"
        id="abandoned-banner"
        class="absolute w-full py-2.5 bottom-0 inset-x-0 bg-opacity-80 bg-black text-yellow-400 text-lg text-center leading-4"
      >
        Game Abandoned
      </div>
    </div>
    <!-- Game's info -->
    <div>
      <!-- Name of the game and F95Zone's logo -->
      <div class="flex flex-nowrap items-center">
        <h1 class="flex-auto text-2xl font-semibold truncate">
          {{ game.name }}
        </h1>
        <img
          class="flex-initial w-24 h-10 object-scale-down"
          src="../../assets/f95-logo-horizontal.png"
          :href="game.url"
        >
      </div>

      <!-- Game's author, used engine and versions -->
      <div class="grid grid-cols-1 xl:grid-cols-2 mt-1">
        <!-- Authors -->
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-person class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="flex-auto pl-1 truncate">
            {{ game.authors.map((author: {name: string}) => author.name).join(", ") }}
          </div>
        </div>
        <!-- Engine -->
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-hardware-chip class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="flex-auto pl-1 truncate">
            {{ game.engine }}
          </div>
        </div>
        <!-- Installed Version -->
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-desktop-outline class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="flex-auto pl-1 truncate">
            {{ game.installedVersion }}
          </div>
        </div>
        <!-- Online Version -->
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-cloud class="h-5 w-5 text-yellow-400" />
          </div>
          <div class="flex-auto pl-1 truncate">
            {{ game.version }}
          </div>
        </div>
      </div>

      <!-- `Completed` checkbox -->
      <div class="mt-2">
        <input
          id="checkbox-completed"
          :checked="game.complete"
          class="checkbox"
          type="checkbox"
          @change="onChangeCompleteFlag"
        >
        <label
          for="checkbox-completed"
          class="ml-1"
        >
          You {{ game.complete ? 'have' : 'haven\'t' }} completed this game
        </label>
      </div>
    </div>
    <!-- Action buttons -->
    <div class="grid grid-flow-row auto-rows-max gap-1 mt-4">
      <button
        v-if="game.installedVersion !== game.version"
        id="update-btn"
        class="btn-icon bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
      >
        <i-ion-cloud-download class="w-5 h-5 mr-1" />
        <span>Update</span>
      </button>
      <button
        id="play-btn"
        class="btn-icon bg-green-500 hover:bg-green-600 focus:ring-green-500"
      >
        <i-ion-play-circle class="w-5 h-5 mr-1" />
        <span>Play</span>
      </button>
      <button
        id="delete-btn"
        class="btn-icon bg-red-500 hover:bg-red-600 focus:ring-red-500"
      >
        <i-ion-trash class="w-5 h-5 mr-1" />
        <span>Delete</span>
      </button>
    </div>
    <!-- Game's overview -->
    <p
      id="overview"
      class="scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 text-justify mt-5 overflow-y-auto h-1/5 max-h-48 px-3 pr-4"
    >
      {{ game.overview }}
    </p>
    <!-- Game' tags -->
    <div
      id="game-tags"
      class="flex grid-flow-row flex-wrap gap-y-1 gap-x-2 justify-items-start mt-5"
    >
      <button
        v-for="tag in game.tags"
        :key="tag"
        class="btn-tag"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
//import type Game from "../../../main/src/classes/game";
import { defineComponent } from "vue";
export default defineComponent({
  name: "GamePreview",
  props: {
    game: {
      type: Object, // Game
      required: true,
    },
  },
  emits: ["update:game"],
  methods: {
    onChangeCompleteFlag(value: Event) {
      const clone = this.game;
      clone.complete = value.target.checked;
      this.$emit("update:game", clone);
    }
  }
});
</script>
