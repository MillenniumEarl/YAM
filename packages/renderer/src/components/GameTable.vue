<template>
  <div
    class="flex flex-col text-sm"
    @keydown.stop.prevent="onKeyDown"
  >
    <table
      class="table-auto w-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 overflow-y-auto"
    >
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
          v-for="(game, index) in view"
          :key="game.id"
          :game="game"
          :class="{ selected: index === selectedRowIndex }"
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
import type { IQuery } from "types/interfaces-vue";

export default defineComponent({
  name: "GameTable",
  components: {
    GameTableRow,
  },
  props: {
    /**
     * List of all the games to display in the table.
     */
    gamelist: {
      type: Array as () => Game[],
      required: true,
    },
    /**
     * Query used to filter what games from `gamelist` to display in table.
     */
    query: {
      type: Object,
      default: {
        title: "",
        author: "",
        lastUpdate: new Date(0),
        userCompleted: false,
        status: [],
        tags: [],
      } as IQuery,
    },
  },
  emits: ["game-selected", "game-unselected"],
  data() {
    return {
      /**
       * Index of the currently selected row in table.
       */
      selectedRowIndex: -1,
    };
  },
  computed: {
    /**
     * Use this method to filter and sort the game rows.
     */
    view() {
      return this.gamelist.filter((game) => {
        const conditionArray = [
          /**
           * Return `true` if `query.title` is included
           * in the game name.
           */
          (game: Game) => game.name.toUpperCase().includes(this.query.title.toUpperCase().trim()),
          /**
           * Return `true` if the author is included in the
           * list of authors of the game.
           * 
           * If no author is specified in the query, ignore
           * it and return `true`.
           */
          (game: Game) => this.query.author ? game.authors.map((a) => a.name).includes(this.query.author) : true,
          /**
           * Return true if the query specified date is higher
           * (more recent) than the last update of the game.
           */
          (game: Game) => game.lastRelease > this.query.lastUpdate,
          /**
           * If `query.userCompleted` is specified, return `true`
           * only if also the game has the flag `game.complete`.
           * 
           * If `query.userCompleted` is not selected by the user,
           * ignore it and return `true`.
           */
          (game: Game) => !this.query.userCompleted ? true : game.complete === this.query.userCompleted,
          /**
           * If at least one status is specified in the query,
           * return `true` when the game status is included in
           * the array.
           */
          (game: Game) => this.query.status.length > 0 ? this.query.status.includes(game.status) : true,
          /**
           * If every tag in the query is included in the game tags, return `true`.
           */
          (game: Game) => this.query.tags.every((t: string) => game.tags.includes(t)),
        ];
        
        // Return true only if all the functions in conditionArray return true
        return conditionArray.map((f) => f(game)).every((test) => test === true);
      });
    },
  },
  methods: {
    onGameRowSelected(game: Game, index: number) {
      if (index === this.selectedRowIndex) {
        this.selectedRowIndex = -1;
        this.$emit("game-unselected");
      } else {
        this.selectedRowIndex = index;
        this.$emit("game-selected", game);
      }
    },
    onKeyDown(e: KeyboardEvent) {
      // Alias
      const view = this.view;

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
    },
  },
});
</script>
