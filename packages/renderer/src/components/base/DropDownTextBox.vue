<template>
  <div>
    <text-box
      ref="textbox"
      :placeholder="placeholder"
      :value="textvalue"
      @focusin="showDropdown = true"
      @focusout.capture="showDropdown = false"
      @input-changed="query"
    />
    <!-- Hidden dropdown menu -->
    <ul
      v-if="showDropdown"
      class="dropdown-menu"
    >
      <!-- Auto-generated dropdown items -->
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
    /**
     * List of item to display in the dropdown.
     */
    datalist: {
      type: Array as PropType<string[]>,
      required: true
    },
    placeholder: {
      type: String,
      default: "DropDownTextBox"
    },
    /**
     * After the user select an item from the list, clean the TextBox.
     */
    cleanAfterSelection: {
      type: Boolean,
      default: false
    }
  },
  emits: ["selection"],
  data() {
    return {
      showDropdown: false,
      /**
       * Internal filter used to display only the items from
       * `datalist` that respect the content of the TextBox.
       */
      filter: [] as string[],
      /**
       * Value of the TextBox.
       */
      textvalue: "",
      /**
       * Max number of items to display in the dropdown.
       */
      limit: 5
    };
  },
  methods: {
    /**
     * Given a string, filter `datalist` and select only the first `limit` number
     * of elements that include the search string, alphabetically ordered.
     */
    query(value: string) {
      // Avoid processing the string more than one time
      const searchstring = value.toUpperCase().trim();

      // Filter the list of strings
      let set = this.datalist.filter((s) => s.toUpperCase().includes(searchstring));

      // Order the list of string alphabetically (a-z)
      set = set.sort();

      // Avoid displaying all the set if the textbox is empty
      this.filter = value == "" ? [] : set.slice(0, this.limit);
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

      // Reset the filter
      this.filter = [];
      
      if (this.cleanAfterSelection) {
        // Reset the binding value
        this.textvalue = "";

        // Use the TextBox method `reset` to clean the field
        this.$refs.textbox.reset();
      }
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
