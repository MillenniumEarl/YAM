<template>
  <div class="wrapper">
    <i-ion-search-outline class="search-icon" />
    <input
      v-model="searchstring"
      class="search"
      placeholder="Search"
      type="text"
      @change="onInputValidated"
      @input="onInputChange"
    >
    <i-ion-close-outline
      v-show="searchstring.length > 0"
      class="clear-icon"
      @click="reset"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "SearchBar",
  emits: ["input-changed", "input-validated"],
  data() {
    return {
      searchstring: "",
    };
  },
  methods: {
    onInputChange(e: Event) {
      this.$emit("input-changed", (e.target as HTMLInputElement).value);
    },
    onInputValidated(e: Event) {
      this.$emit("input-validated", (e.target as HTMLInputElement).value);
    },
    reset() {
      this.searchstring = "";
    },
  },
});
</script>

<style scoped>
.wrapper {
  position: relative;
  display: flex;
  min-width: 100px;
}
.search {
  border: 1px solid;
  border-radius: 10px;
  height: 25px;
  width: 100%;
  padding: 2px 23px 2px 30px;
  outline: 0;
  background-color: #f5f5f5;
  @apply text-gray-400 bg-gray-800 border-gray-700;
}
.search-icon {
  position: absolute;
  top: 2.5px;
  left: 8px;
  width: 14px;
  @apply text-white;
}
.clear-icon {
  position: absolute;
  top: 3px;
  right: 8px;
  width: 12px;
  cursor: pointer;
  @apply text-white;
}
.search:hover {
  border: 1px solid;
  @apply bg-gray-700 border-gray-500;
}
.search:focus {
  @apply border-red-400 ring-1  ring-opacity-50 ring-red-500;
}
</style>
