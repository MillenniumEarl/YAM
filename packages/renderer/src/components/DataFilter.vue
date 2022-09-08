<!--
 Copyright (c) 2022 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<template>
  <!-- We need a 2 columns grid with a template | TEXT: COMPONENT | TEXT: COMPONENT | -->
  <div class="grid grid-flow-dense grid-cols-2 sm:grid-cols-1 gap-y-3 gap-x-5">
    <!-- Game title TextBox -->
    <div class="flex items-center gap-x-2">
      <span> Title </span>
      <text-box
        class="grow"
        placeholder="Title"
        @input-changed="query.title = $event"
      />
    </div>
    <!-- Last Update selection -->
    <div class="flex items-center gap-x-2">
      <span> Last Update </span>
      <date-time-picker @datetime-picked="query.lastUpdate = $event" />
    </div>
    <!-- Author selection -->
    <div class="flex items-center gap-x-2">
      <span> Author </span>
      <drop-down-text-box
        class="grow"
        placeholder="Author"
        :datalist="authorlist"
        @selection="query.author = $event"
      />
    </div>
    <!-- "Only user completed" game checkboxes -->
    <div class="flex items-center gap-x-4">
      <span> Only user completed: </span>
      <input
        id="chk-user-completed"
        class="checkbox"
        type="checkbox"
        @change="query.userCompleted = ($event.target as HTMLInputElement)?.checked"
      >
    </div>
    <!-- Automatic generation of game statuses checkboxes -->
    <div class="flex items-center gap-x-4 col-span-2">
      <span> Status: </span>
      <div
        v-for="status in gamestatus"
        :key="status"
      >
        <input
          :id="'chk-' + status"
          :name="status"
          class="checkbox"
          type="checkbox"
          @change="addStatus"
        >
        <label
          :for="'chk-' + status"
          class="ml-1"
        >
          {{ status }}
        </label>
      </div>
    </div>
    <!-- Tag selection -->
    <div class="flex items-center gap-x-2">
      <span> Tags </span>
      <drop-down-text-box
        class="grow"
        placeholder="Game Tags"
        :clean-after-selection="true"
        :datalist="taglist"
        @selection="addTag"
      />
    </div>
    <!-- List of selected tags -->
    <div
      class="col-span-2 flex grid-flow-row flex-wrap gap-y-1 gap-x-2 justify-items-start"
    >
      <!-- TAG LIST HERE -->
      <button
        v-for="tag in query.tags"
        :key="tag"
        class="btn-tag"
        @click="removeTagButton"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import TextBox from "./base/TextBox.vue";
import DropDownTextBox from "./base/DropDownTextBox.vue";
import DateTimePicker from "./base/DateTimePicker.vue";
import type { IQuery } from "types/interfaces-vue";

export default defineComponent({
  name: "DataFilter",
  components: { DropDownTextBox, TextBox, DateTimePicker },
  emits: ["query-update"],
  data() {
    return {
      /**
       * List of game'authors from database.
       * @todo Substitute with data from database
       */
      authorlist: [
        "Autore 1",
        "Autore 2",
        "Autore del cazzo che mi frega",
        "Autore 4",
        "Autore 5",
        "Autore 6",
      ],
      /**
       * List of game statuses from F95 API.
       * @todo Substitute with data from F95API
       */
      gamestatus: ["Completed", "On Hold", "Ongoing", "Abandoned"],
      /**
       * List of game tags from F95 API.
       * @todo Substitute with data from F95API
       */
      taglist: [
        "Incest",
        "Slave",
        "Anal",
        "NTR",
        "Cheating",
        "Swinging",
        "Female domination",
        "Vaginal",
        "soooooooooLooooooong Taggggggg",
      ],
      /**
       * Query object used to store the user preference.
       *
       * Emitted to parent every time an option is updated.
       */
      query: {
        title: "",
        author: "",
        lastUpdate: new Date(),
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
      deep: true
    },
  },
  methods: {
    /**
     * Add an available game tag to the active list and remove it from `taglist`.
     */
    addTag(tag: string) {
      // Create array if not exists
      if (!this.query.tags) this.query.tags = [];

      // Add and sort tag
      this.query.tags.push(tag);
      this.query.tags = this.query.tags.sort();

      // Remove tag from full list of tags
      this.taglist = this.taglist.filter((tag) => !this.query.tags?.includes(tag));
    },
    /**
     * Remove a tag from the active list and put it in `taglist`.
     */
    removeTagButton(e: Event) {
      const tag = (e.target as HTMLElement).innerHTML;
      this.query.tags = this.query.tags?.filter((t) => t != tag);
      this.taglist.push(tag);
    },
    /**
     * Add game status to query.
     */
    addStatus(e: Event) {
      // Get the value of the checkbox
      const selected = (e?.target as unknown as { checked: boolean}).checked;

      // Initalize the array if undefined
      if (!this.query.status) this.query.status = [];

      // Add/remove status from array
      const name = (e.target as HTMLInputElement).name;
      if (selected) this.query.status.push(name);
      else this.query.status = this.query.status.filter((s) => s!= name);
    }
  }
});
</script>

<style scoped>
.grid {
  border: 1px solid;
  border-radius: 10px;
  padding: 10px;
  @apply border-gray-700;
}
</style>
