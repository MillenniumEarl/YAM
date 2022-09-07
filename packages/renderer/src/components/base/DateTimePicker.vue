<template>
  <div class="wrapper">
    <!-- Disable keyboard input because it doesn't respect the valid date range (keyboard.prevent)-->
    <!-- Limit date range from start of 2000 until current date -->
    <input
      type="date"
      min="2000-01-01"
      :max="maxDate"
      @keydown.prevent
      @change="onDateTimePicked"
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "DateTimePicker",
  emits: ["datetime-picked"],
  data() {
    return {
      /**
       * Upper valid date for the component (today)
       */
      maxDate: new Date().toISOString().split("T")[0]
    };
  },
  methods: {
    /**
     * Raised when the user pick a date from the popup.
     */
    onDateTimePicked(e: Event) {
      const STRING_DATE = (e.target as HTMLInputElement).value;
      const DATETIME = new Date(STRING_DATE);
      this.$emit("datetime-picked", DATETIME);
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
input[type="date"] {
  border: 1px solid;
  border-radius: 10px;
  height: 25px;
  width: 100%;
  padding: 2px 23px 2px 10px;
  outline: 0;
  @apply text-gray-400 bg-gray-800 border-gray-700;
}
</style>
