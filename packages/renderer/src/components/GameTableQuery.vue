<template>
  <div class="flex flex-nowrap">
    <search-bar style="margin: 2px" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import SearchBar from "./SearchBar.vue";

export default defineComponent({
    name: "GameTableQuery",
    components: { SearchBar }
});
</script>
