<template>
  <div class="wrapper">
    <i-ion-search-outline class="search-icon" />
    <input
      v-model="searchstring"
      class="search"
      placeholder="Search"
      type="text"
      :disabled="disabled"
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
  props: {
    /**
     * Disable input editing.
     */
    disabled: {
      type: Boolean,
      default: false,
    }
  },
  emits: ["input-changed", "input-validated"],
  data() {
    return {
      /**
       * Variable used to save the value of the text put in the component.
       */
      searchstring: "",
    };
  },
  methods: {
    /**
     * Raised every time the value change.
     */
    onInputChange() {
      this.$emit("input-changed", this.searchstring);
    },
    /**
     * Raised when the user press ENTER.
     */
    onInputValidated() {
      this.$emit("input-validated", this.searchstring);
    },
    /**
     * Reset the text value of SearchBox.
     */
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
