<template>
  <div class="wrapper">
    <input
      v-model="textvalue"
      class="textbox"
      :placeholder="placeholder"
      type="text"
      @change="onInputValidated"
      @input="onInputChange"
    >
    <i-ion-close-outline
      v-show="textvalue.length > 0"
      class="clear-icon"
      @click="reset"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "TextBox",
  props: {
    value: {
      type: String,
      default: ""
    },
    placeholder: {
      type: String,
      default: "Textbox"
    }
  },
  emits: ["input-changed", "input-validated"],
  data() {
    return {
      /**
       * Variable used to save the value of the text put in the component.
       */
      textvalue: this.value,
    };
  },
  watch: {
    /**
     * Update the local variable `textvalue` when the
     * argument `value` is update from the parent element.
     */
    value() {
      this.textvalue = this.value;
    }
  },
  methods: {
    /**
     * Raised every time the value change.
     */
    onInputChange() {
      this.$emit("input-changed", this.textvalue);
    },
    /**
     * Raised when the user press ENTER.
     */
    onInputValidated() {
      this.$emit("input-validated", this.textvalue);
    },
    /**
     * Reset the text value of TextBox.
     */
    reset() {
      this.textvalue = "";
    }
  },
});
</script>

<style scoped>
.wrapper {
  position: relative;
  display: flex;
  min-width: 100px;
}
.textbox {
  border: 1px solid;
  border-radius: 10px;
  height: 25px;
  width: 100%;
  padding: 2px 23px 2px 10px;
  outline: 0;
  background-color: #f5f5f5;
  @apply text-gray-400 bg-gray-800 border-gray-700;
}
.clear-icon {
  position: absolute;
  top: 3px;
  right: 8px;
  width: 12px;
  cursor: pointer;
  @apply text-white;
}
</style>
