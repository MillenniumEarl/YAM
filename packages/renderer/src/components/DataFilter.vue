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
      <span>
        Title
      </span>
      <text-box
        class="grow"
        placeholder="Title"
      />
    </div>
    <!-- Last Update selection -->
    <div class="flex items-center gap-x-2">
      <span>
        Last Update
      </span>
      <date-time-picker />
    </div>
    <!-- Author selection -->
    <div class="flex items-center gap-x-2">
      <span>
        Author
      </span>
      <drop-down-text-box
        class="grow"
        placeholder="Author"
        :datalist="authorlist"
      />
    </div>
    <!-- "Only user completed" game checkboxes -->
    <div class="flex items-center gap-x-4">
      <span>
        Only user completed:
      </span>
      <input
        id="chk-user-completed"
        class="checkbox"
        type="checkbox"
      >
    </div>
    <!-- Automatic generation of game statuses checkboxes -->
    <div class="flex items-center gap-x-4 col-span-2">
      <span>
        Status:
      </span>
      <div
        v-for="status in gamestatus"
        :key="status"
      >
        <input
          :id="'chk-' + status"
          class="checkbox"
          type="checkbox"
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
      <span>
        Tags
      </span>
      <drop-down-text-box
        class="grow"
        placeholder="Game Tags"
        :clean-after-selection="true"
        :datalist="taglist"
        @selection="addTag"
      />
    </div>
    <!-- List of selected tags -->
    <div class="col-span-2 flex grid-flow-row flex-wrap gap-y-1 gap-x-2 justify-items-start">
      <!-- TAG LIST HERE -->
      <button
        v-for="tag in tags"
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

export default defineComponent({
    name: "DataFilter",
    components: { DropDownTextBox, TextBox, DateTimePicker },
    data() {
      return {
        /**
         * List of game'authors from database.
         * @todo Substitute with data from database
         */
        authorlist: ["Autore 1", "Autore 2", "Autore del cazzo che mi frega", "Autore 4", "Autore 5", "Autore 6"],
        /**
         * List of game statuses from F95 API.
         * @todo Substitute with data from F95API
         */
        gamestatus: ["Completed", "OnHold", "Ongoing", "Abandoned"],
        /**
         * List of game tags from F95 API.
         * @todo Substitute with data from F95API
         */
        taglist: ["Incest", "Slave", "Anal", "NTR", "Cheating", "Swinging", "Female domination", "Vaginal", "soooooooooLooooooong Taggggggg"],
        /**
         * Active tags selected by the user.
         */
        tags: [] as string[]
      };
    },
    methods: {
      /**
       * Add an available game tag to the active list and remove it from `taglist`.
       */
      addTag(tag: string) {
        this.tags.push(tag);
        this.tags = this.tags.sort();
        this.taglist = this.taglist.filter((tag) => !this.tags.includes(tag));
      },
      /**
       * Remove a tag from the active list and put it in `taglist`.
       */
      removeTagButton(e: Event) {
        const TAG = (e.target as HTMLElement).innerHTML;
        this.tags = this.tags.filter((tag) => tag != TAG);
        this.taglist.push(TAG);
      }
    }
});
</script>

<style scoped>
.grid {
  border: 1px solid;
  border-radius: 10px;
  padding: 10px;
  @apply border-gray-700
}
</style>