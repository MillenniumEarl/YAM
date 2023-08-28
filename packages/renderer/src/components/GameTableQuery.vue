<template>
  <div class="flex flex-nowrap items-center gap-x-2 m-1">
    <search-bar
      class="grow"
      :disabled="showAdvancedSearch"
      @input-changed="query.title = $event"
    />
    <button
      class="btn-icon bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
      @click="showAdvancedSearch = !showAdvancedSearch"
    >
      <i-ion-funnel class="w-5 h-5 mr-1" />
      <span>Advanced Search</span>
    </button>
  </div>

  <!-- Let's put it under the flex DIV so that we can hide it -->
  <data-filter
    v-show="showAdvancedSearch"
    class="m-1"
    @query-update="query = $event"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import SearchBar from "./base/SearchBar.vue";
import DataFilter from "./DataFilter.vue";
import type { IQuery } from "types/interfaces-vue";

export default defineComponent({
  name: "GameTableQuery",
  components: { SearchBar, DataFilter },
  emits: ["query-update"],
  data() {
    return {
      /**
       * Switch used to show/display the advance search panel.
       */
      showAdvancedSearch: false,
      /**
       * Query object used to store the user preference.
       *
       * Emitted to parent every time an option is updated.
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
  watch: {
    query: {
      handler() {
        this.$emit("query-update", this.query);
      },
      deep: true,
    },
  },
});
</script>
