<template>
  <div
    class="text-sm h-full w-1/3 absolute inset-y-0 right-0 border-solid border-l-2 border-gray-500 px-3 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 overflow-y-auto"
  >
    <!-- Game's cover and overlay for abandoned games -->
    <div
      class="relative overflow-hidden border-solid border-2 border-gray-500 rounded-lg"
    >
      <img
        src="../../assets/LOM.png"
        class="object-scale-down"
      >
      <div
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
          #GAME-TITLE
        </h1>
        <img
          class="flex-initial w-24 h-10 object-scale-down"
          src="../../assets/f95-logo-horizontal.png"
        >
      </div>

      <!-- Game's author, used engine and versions -->
      <div class="grid grid-cols-1 xl:grid-cols-2 mt-1">
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-person class="h-5 w-5 text-yellow-400" />
          </div>
          <div
            id="author"
            class="flex-auto pl-1 truncate"
          >
            #AUTHOR
          </div>
        </div>
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-hardware-chip class="h-5 w-5 text-yellow-400" />
          </div>
          <div
            id="engine"
            class="flex-auto pl-1 truncate"
          >
            #ENGINE
          </div>
        </div>
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-desktop-outline class="h-5 w-5 text-yellow-400" />
          </div>
          <div
            id="installed-version"
            class="flex-auto pl-1 truncate"
          >
            #INSTALLED-VERSION
          </div>
        </div>
        <div class="flex flex-wrap">
          <div class="flex-none">
            <i-ion-cloud class="h-5 w-5 text-yellow-400" />
          </div>
          <div
            id="available-version"
            class="flex-auto pl-1 truncate"
          >
            #AVAILABLE-VERSION
          </div>
        </div>
      </div>
    </div>
    <!-- Action buttons -->
    <div class="grid grid-flow-row auto-rows-max gap-1 mt-4">
      <button
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
      class="scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 text-justify mt-5 overflow-y-auto h-1/5 px-3 pr-4"
    >
      Everyday you will have to take care of customers as well as keep good relations with your coworkers to unlock special events. Chose your own path with Cookie, Rai or Cynthia (or all 3 of them if you're lucky or none if you are not), and make sure to not get broke. Here you can find some cute scenes, while the girls interact with each other and you - as well as some lewd animated scenes, both with you and (If you will let them) with clients. Your actions and decisions will have an impact.

      Use money and popularity you earn from the everyday work to stock up on items for the next day, buy items that will upgrade stats of your maids, unlock more events and to unlock new perks!

      By using specific abilities you learn more about the clients in the client book and you might unlock new events with them!

      Random events that will trigger after day of work will make sure you will get different experience everyday. Your decisions will decide how girls will react and how they will respond to the events. Their statistics will help you keep track of that.

      Game has both NSFW and SFW mode. Thanks to that, people not interested in lewd stuff (or if you are not in the mood for it) don't have to worry about it popping out on them.

      The game-play is a management of your cafe and maids. The story in driven with the Visual Novel format.
    </p>
    <!-- Game' tags -->
    <div
      id="game-tags"
      class="flex grid-flow-row flex-wrap gap-y-1 gap-x-2 justify-items-start mt-5"
    >
      <button class="btn-tag">
        Creampie
      </button>
      <button class="btn-tag">
        Big tits
      </button>
      <button class="btn-tag">
        Big ass
      </button>
      <button class="btn-tag">
        Corruption
      </button>
      <button class="btn-tag">
        Groping
      </button>
      <button class="btn-tag">
        Female protagonist
      </button>
      <button class="btn-tag">
        Creampie
      </button>
      <button class="btn-tag">
        Big tits
      </button>
      <button class="btn-tag">
        Big ass
      </button>
      <button class="btn-tag">
        Corruption
      </button>
      <button class="btn-tag">
        Groping
      </button>
      <button class="btn-tag">
        Female protagonist
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "GamePreview"
});
</script>

<style scoped>

</style>
