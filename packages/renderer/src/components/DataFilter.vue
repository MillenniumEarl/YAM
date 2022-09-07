<!--
 Copyright (c) 2022 MillenniumEarl
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<template>
  <!-- We need a 4 columns grid with a template TEXT:COMPONENT -->
  <div class="grid grid-flow-dense grid-cols-2 sm:grid-cols-1 gap-y-3 gap-x-5">
    <!-- Game title TextBox -->
    <div class="flex items-center gap-x-2">
      Title
      <text-box
        class="grow"
        placeholder="Title"
      />
    </div>
    <!-- Last Update selection -->
    <div class="flex items-center gap-x-2">
      Last Update
      <date-time-picker />
    </div>
    <!-- Author selection -->
    <div class="flex items-center gap-x-2">
      Author
      <drop-down-text-box
        class="grow"
        placeholder="Author"
        :datalist="authorlist"
      />
    </div>
    <!-- "Only user completed" game checkboxes -->
    <div class="flex items-center gap-x-4">
      Only user completed:
      <input
        id="chk-user-completed"
        class="checkbox"
        type="checkbox"
      >
    </div>
    <!-- Automatic generation of game statuses checkboxes -->
    <div class="flex items-center gap-x-4 col-span-2">
      Status:
      <!-- @todo Sobstitute with data from F95API -->
      <div
        v-for="status in ['Completed', 'OnHold', 'Ongoing', 'Abandoned']"
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
      Tags
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
import TextBox from "./TextBox.vue"; 
import DropDownTextBox from "./DropDownTextBox.vue";
import DateTimePicker from "./DateTimePicker.vue"; 

export default defineComponent({
    name: "DataFilter",
    components: { DropDownTextBox, TextBox, DateTimePicker },
    data() {
      return {
        authorlist: ["Autore 1", "Autore 2", "Autore del cazzo che mi frega", "Autore 4", "Autore 5", "Autore 6"],
        taglist: ["Incest", "Slave", "Anal", "NTR", "Cheating", "Swinging", "Female domination", "Vaginal", "soooooooooLooooooong Taggggggg"],
        tags: [] as string[]
      };
    },
    methods: {
      addTag(tag: string) {
        this.tags.push(tag);
        this.tags = this.tags.sort();
        this.taglist = this.taglist.filter((tag) => !this.tags.includes(tag));
      },
      removeTagButton(e: Event) {
        const TAG = (e.target as HTMLElement).innerHTML;
        this.tags = this.tags.filter((tag) => tag != TAG);
        this.taglist.push(TAG);
      },
      message(mex: string) {
        console.log(mex);
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