// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

<template>
  <h2 id="versions">
    Test VUE component
  </h2>
  <div
    id="drag-div"
    @dragover.prevent
    @drop="addGameFromDrop($event)"
  >
    <p>Drag a folder here</p>
  </div>
  <br>
  <button
    id="add-game-btn"
    @click="addGameFromClick"
  >
    Add game
  </button>
  <div id="file-list" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { addOnButtonClick, addOnDrop } from "../scripts/add-game";
export default defineComponent({
  name: "AppTest",
  methods: {
    addGameFromClick: addOnButtonClick,
    addGameFromDrop: addOnDrop
  }
});
</script>

<style scoped>
#drag-div {
            width: 250px;
            height: 150px;
            border: 3px solid gray;
        }
</style>
