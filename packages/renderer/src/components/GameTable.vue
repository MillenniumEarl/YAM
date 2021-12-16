<template>
  <div
    class="flex flex-col text-sm"
    @keydown.stop.prevent="onKeyDown"
  >
    <table class="table-auto w-auto ml-14 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 overflow-y-auto">
      <thead>
        <tr class="bg-gray-700 text-center">
          <th>Game Name</th>
          <th>Author</th>
          <th>Engine</th>
          <th>Version</th>
          <th>Completed</th>
        </tr>
      </thead>
      <tbody>
        <game-table-row
          v-for="(game, index) in gameView"
          :key="game.id"
          :game="game"
          :class="{ 'selected': index === selectedRowIndex }"
          @click.stop="onGameRowSelected(game, index)"
        />
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import GameTableRow from "./GameTableRow.vue";
import type { Game } from "../../../common/types";

export default defineComponent({
  name: "GameTable",
  components: {
    GameTableRow
  },
  props: {
    gamelist: {
      type: Array as () => Game[],
      required: true,
    },
    // query: {
    //   type: Object,
    //   default: {},
    // },
  },
  emits: ["game-selected", "game-unselected"],
  data() {
    return {
      selectedRowIndex: -1,
    };
  },
  computed: {
    /**
     * Use this method to filter and sort the game rows.
     */
    gameView() {
      const clone = [...this.gamelist];
      return clone;
    },
  },
  methods: {
      onGameRowSelected(game: Game, index: number) {
          if(index === this.selectedRowIndex) { 
            this.$emit("game-unselected");
            this.selectedRowIndex = -1;
          } else {
            this.selectedRowIndex = index;
            this.$emit("game-selected", game);
          }
      },
      onKeyDown(e: KeyboardEvent) {
        const view = this.gameView;

        // Calculate new row index
        let localRowIndex = this.selectedRowIndex;
        if (e.key === "ArrowUp") localRowIndex--;
        else if (e.key === "ArrowDown") localRowIndex++;
        else return;

        // Fix row if out of index
        if (localRowIndex >= view.length) localRowIndex = 0;
        else if (localRowIndex < 0) localRowIndex = view.length - 1;

        // Emit event
        this.onGameRowSelected(view[localRowIndex], localRowIndex);
      }
  }
});
</script>