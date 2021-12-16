<template>
  <!-- `tabindex` allow the row to be focused (selected with click/keyboard) -->
  <tr
    class="table-row"
    tabindex="0"
  >
    <td>{{ game.name }}</td>
    <td>{{ game.authors.map((author) => author.name).join(", ") }}</td>
    <td>{{ game.engine }}</td>
    <td>
      <span>{{ versionString() }}</span>
      <i-ion-cloud-download-outline
        v-if="isUpdateAvailable()"
        class="inline-flex w-5 h-5 ml-2 text-blue-500"
      />
    </td>
    <td class="align-middle">
      <i-ion-checkmark-done
        v-if="game.complete"
        class="icon-row text-green-500"
      />
      <i-ion-close
        v-else
        class="icon-row text-red-600"
      />
    </td>
  </tr>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { Game } from "../../../common/types";
export default defineComponent({
  name: "GameTableRow",
  props: {
    game: {
      type: Object as () => Game,
      required: true,
    }
  },
  methods: {
    /**
     * Check if a update is available comparing the version's values.
     */
    isUpdateAvailable() {
      return this.game.version !== this.game.installedVersion;
    },
    /**
     * Return a string with the version(s) value.
     */
    versionString() {
      return this.isUpdateAvailable() 
        ? `${this.game.installedVersion} (${this.game.version})`
        : this.game.installedVersion;
    }
  }
});
</script>

<style scoped>
.icon-row {
  @apply inline-flex object-center w-6 h-6;
}
</style>
