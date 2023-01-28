<template>
  <div class="flex flex-nowrap">
    <div class="flex flex-auto flex-col">
      <game-table-query @query-update="query=$event" />
      <game-table
        class="flex-auto border-solid border-t-2 border-gray-500"
        :gamelist="gamelist"
        :query="query"
        @game-selected="selectedGame = $event"
        @game-unselected="selectedGame = null"
      />
    </div>
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
import GameTableQuery from "./GameTableQuery.vue";
import type { Game } from "../../../common/types";
import type { IQuery } from "types/interfaces-vue";

// ****************** @todelete *************************
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
  lastRelease: new Date("2020-09-08"),
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
    "Slave",
    "Femal domination",
    "Anal",
    "Vaginal",
    "NTR"
  ],
  complete: false,
  lastRelease: new Date("2021-09-08"),
  status: "Completed",
  preview: "https://attachments.f95zone.to/2020/07/733450_f95header-2020-07.png",
  url: "https://f95zone.to/threads/naruto-kunoichi-trainer-v0-17-1-dinaki.4489/",
};

let testgameC = {
  id: 3,
  name: "GOTY: Skyrim",
  authors: [
    { name: "Author C", platforms: []},
    { name: "Author D", platforms: []}],
  engine: "Unity",
  overview:
    "This is a test overview. Note how the update button is unavailable because the versions are the same",
  version: "0.50 Remake",
  installedVersion: "0.4",
  tags: [
    "Lesbian",
    "Humiliation",
    "MILF",
    "This is a long tag",
    "Female protagonist",
    "Corruption",
    "Creampie",
    "Slave",
    "Femal domination",
    "Anal",
    "Vaginal",
    "NTR",
    "Another",
    "Tag",
    "Here",
  ],
  complete: false,
  lastRelease: new Date("2022-09-08"),
  status: "Ongoing",
  preview: "https://attachments.f95zone.to/2020/07/733450_f95header-2020-07.png",
  url: "https://f95zone.to/threads/naruto-kunoichi-trainer-v0-17-1-dinaki.4489/",
};
// ******************************************************

export default defineComponent({
  name: "GameView",
  components: {
    GameTable,
    GamePreview,
    GameTableQuery,
  },
  data() {
    return {
      /**
       * List of all games in the database.
       * 
       * @todo Replace with data from database
       */
      gamelist: [testgame, testgameB, testgameC] as unknown as Game[],
      /**
       * Currently selected game in the list.
       */
      selectedGame: null,
      /**
       * User-defined query used to filter the games in the table.
       */
      query: {
        title: "",
        author: "",
        lastUpdate: new Date(0),
        userCompleted: false,
        status: [],
        tags: [],
      } as IQuery,
    };
  },
});
</script>
