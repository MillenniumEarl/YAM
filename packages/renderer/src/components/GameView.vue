<template>
  <div class="flex flex-nowrap">
    <game-table
      class="flex-auto"
      :gamelist="gamelist"
      @game-selected="selectedGame = $event"
      @game-unselected="selectedGame = null"
    />
    <game-preview
      v-if="selectedGame"
      v-model:game="selectedGame"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import GameTable from "./GameTable.vue";
import GamePreview from "./GamePreview.vue";
import type { Game } from "../../../common/types";

let testgame = {
  id: 1,
  name: "A Wife and a Mother",
  authors: [
    { name: "Lust & Passion", platforms: []},
    { name: "Test Author", platforms: []},
  ],
  engine: "Ren'Py",
  overview: "This is a test overview",
  version: "1.10",
  installedVersion: "1.00",
  tags: [
    "Lesbian",
    "Humiliation",
    "MILF",
    "Sex Toys",
    "Female protagonist",
    "Corruption",
    "Creampie",
  ],
  complete: true,
  status: "Abandoned",
  preview: "https://attachments.f95zone.to/2021/08/1374333_patreon_header.jpg",
  url: "https://f95zone.to/threads/naruto-kunoichi-trainer-v0-17-1-dinaki.4489/",
};

let testgameB = {
  id: 2,
  name: "Second test game",
  authors: [{ name: "Lust & Passion", platforms: []}],
  engine: "HTML",
  overview:
    "This is a test overview. Note how the update button is unavailable because the versions are the same",
  version: "2.00",
  installedVersion: "2.00",
  tags: [
    "Lesbian",
    "Humiliation",
    "MILF",
    "This is a long tag",
    "Female protagonist",
    "Corruption",
    "Creampie",
  ],
  complete: false,
  status: "Completed",
  preview: "https://attachments.f95zone.to/2020/07/733450_f95header-2020-07.png",
  url: "https://f95zone.to/threads/naruto-kunoichi-trainer-v0-17-1-dinaki.4489/",
};

export default defineComponent({
  name: "GameView",
  components: {
    GameTable,
    GamePreview,
  },
  data() {
    return {
      gamelist: [testgame, testgameB] as unknown as Game[],
      selectedGame: null,
    };
  }
});
</script>
