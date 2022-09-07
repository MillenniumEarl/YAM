<template>
  <div
    class="dropdown-search"
  >
    <text-box
      id="textbox"
      :value="textvalue"
      @focusin="showDropdown = true"
      @focusout.capture="showDropdown = false"
      @input-changed="query"
    />
    <ul
      v-if="showDropdown"
      class="dropdown-menu"
    >
      <li>
        <a
          v-for="item in filter"
          :key="item"
          class="dropdown-item"
          href="#"
          @mousedown="onMouseDown"
        >{{ item }}</a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { defineComponent } from "vue";
import TextBox from "./TextBox.vue";

export default defineComponent({
  name: "DropDownTextBox",
  components: { TextBox },
  props: {
    datalist: {
      type: Array as PropType<string[]>,
      required: true
    }
  },
  emits: ["selection"],
  data() {
    return {
      showDropdown: false,
      filter: [] as string[],
      textvalue: ""
    };
  },
  methods: {
    query(value: string) {
      // Avoid processing the string more than one time
      const SEARCH_STRING = value.toUpperCase().trim();

      // Filter the list of strings
      let set = this.datalist.filter((s) => s.toUpperCase().includes(SEARCH_STRING));

      // Order the list of string alphabetically (a-z)
      set = set.sort();

      // Avoid displaying all the set if the textbox is empty
      this.filter = value == "" ? [] : set.slice(0, 5);
    },
    /**
     * Select the option and write the value in the textbox.
     * 
     * ** IMPORTANT! **
     * Use `mousedown` instead of `click` because `mousedown` is
     * executed before `focusout` while `click` is executed
     * after `focusout`.
     */
    onMouseDown(e: Event) {
      this.textvalue = (e.target as HTMLAnchorElement).text;
      this.$emit("selection", this.textvalue);
    }
  }
});
</script>

<style scoped>
.dropdown-menu {
  position: absolute;
  @apply min-w-max text-base z-50 float-left py-2 list-none text-left rounded-lg shadow-lg mt-1 m-0 bg-clip-padding border-none bg-gray-800
}
.dropdown-item {
  @apply text-sm px-4 font-normal block w-full whitespace-nowrap bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white focus:text-white focus:bg-gray-700 active:bg-blue-600;
}
</style>
