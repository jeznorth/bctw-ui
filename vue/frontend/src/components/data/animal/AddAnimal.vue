<template>
  <modal 
    class='grp-col'
    :title="isEdit ? 'Edit Animal' : 'Add Animal'"
    :active="active"
    v-on:update:modal="$emit('update:close')"
  >
    <h3>General Information</h3><vs-divider></vs-divider>
    <div class="grp">
      <vs-input label="Nickname" v-bind:value="animal.nickname" v-on:input="(v) => handleSelect({nickname: v})" ></vs-input>
      <vs-input label="Animal ID*" v-bind:value="animal.animal_id"  v-on:input="(v) => handleSelect({animal_id: v})"></vs-input>
      <vs-input label="WLHID*" v-bind:value="animal.wlh_id"  v-on:input="(v) => handleSelect({wlh_id: v})"></vs-input>
    </div>

    <h3>Group Management</h3><vs-divider></vs-divider>
    <div class="grp"> 
      <input-select header="species"         label="Species*"        v-on:change:select="handleSelect" :val="animal.species"></input-select>
      <input-select header="region"          label="Region*"         v-on:change:select="handleSelect" :val="animal.region"></input-select>
      <input-select header="population_unit" label="Population Unit" v-on:change:select="handleSelect" :val="animal.population_unit" autocomplete="true"></input-select>
    </div>

    <h3>Individual Characteristics</h3><vs-divider></vs-divider>
    <div class="grp">
      <vs-checkbox v-bind:value="animal.calf_at_heel" v-on:input="(v) => handleSelect({calf_at_heel: v})" label="Calf at heel?"></vs-checkbox>
    </div>

    <div v-if="critterCollarHistory && critterCollarHistory.length">
      <h3>Assigned GPS Collar</h3><vs-divider></vs-divider>
      <state-table
        :propsToDisplay="collarHistoryPropsToDisplay"
        :getHeader="getHeader"
        :paginate="false"
        v-model="critterCollarHistory"></state-table>
      <vs-divider></vs-divider>
    </div>

    <vs-button v-if="isEdit && hasCollarAssigned"
      type="filled"
      @click="showYesNo">Unassign Collar</vs-button>
    <vs-button v-else
      :disabled=" isEdit ? false : canAssignCollar ? false : true"
      type="filled"
      @click="showAssign">Assign Collar</vs-button>
    <vs-button 
      :disabled="!canSave"
      button="submit"
      @click="save"
      class="btn-save"
      type="border">
      Save Animal</vs-button>

    <assign-collar 
      :active="bShowAssignModal"
      :critter="animal"
      v-on:update:close="showAssign"
      v-on:collar:assigned="handleAssignment"
    ></assign-collar>
    <yes-no msg="Are you sure you want to unassign this collar?"
      title="Confirm Unassignment"
      :active="bShowYesNoModal"
      v-on:update:close="close"
      v-on:update:selected="unassignCollar"
    ></yes-no>
    <!-- <pre>{{assignment}}</pre> -->
  </modal>
</template>

<script lang="ts">
import { Animal, encodeCritter } from '../../../types/animal';
import { mapGetters } from 'vuex';
import Vue from 'vue';
import { getNotifyProps } from '../../notify';
import { Collar, ICollarLinkResult } from '../../../types/collar';
import { CollarAssignment, assignmentPropsToDisplay } from '../../../types/collar_assignment';
import { filterObj, formattedNow } from '../../../api/api_helpers';
import { ActionGetPayload, ActionPostPayload } from 'frontend/src/types/store';
import moment from 'moment';
import { canSaveObject } from '../../component_helpers';

export default Vue.extend({
  name: 'AddAnimal',
  props: {
    active: { type: Boolean, required: true },
    isEdit: { type: Boolean, required: false, default: false }
  },
  data() {
    return {
      animal: {} as Animal,
      canAssignCollar: false as boolean,
      canSave: false as boolean,
      bShowAssignModal: false as boolean,
      bShowYesNoModal: false as boolean,
      requiredFields: ['animal_id', 'wlh_id', 'region', 'species'] as string[],
      collarHistoryPropsToDisplay: assignmentPropsToDisplay,
      editableProperties: ['animal_id', 'wlh_id', 'region', 'species', 'population_unit', 'region', 'calf_at_heel']
    }
  },
  computed: {
    hasCollarAssigned(): boolean {
      const currentlyAssigned = this.critterCollarHistory.filter((c:CollarAssignment) =>{
        if(!moment(c.end_time).isValid()) {
          return true;
        }
        return moment().isBefore(c.end_time);
      });
      return !!currentlyAssigned.length;
    },
    ...mapGetters(['editObject', 'critterCollarHistory'])
  },
  methods: {
    getHeader: (s: string) => CollarAssignment.getTitle(s),
    handleSelect(keyVal: any) {
      this.animal = Object.assign({}, this.animal, keyVal)
    },
    close() {
      this.bShowAssignModal = false;
      this.bShowYesNoModal = false;
    },
    showAssign() {
      this.bShowAssignModal = !this.bShowAssignModal;
    },
    showYesNo() {
      this.bShowYesNoModal= !this.bShowYesNoModal;
    },
    unassignCollar(b: boolean) {
      if (!b) {
        this.showYesNo();
        return;
      }
      const collarId = this.critterCollarHistory[0].device_id;
      if (!collarId) {
        this.$vs.notify(getNotifyProps('cant locate collar id!', true));
      }
      const cb = (data: ICollarLinkResult, err?: Error | string) => {
        console.log(`results of unassign: ${JSON.stringify(data)}`);
        if (err) {
          this.$vs.notify(getNotifyProps(err, true));
        } else {
          this.$vs.notify(getNotifyProps(`collar ${data.device_id} successfully unassigned from ${data.animal_id}`));
          this.close();
          this.canAssignCollar = true;
          this.loadAssignments();
        }
      }
      const payload = {
        body: {
          link: false,
          data: {
            animal_id: this.animal.id,
            device_id: collarId,
            end_date: formattedNow(),
          },
        },
        callback: cb
      }
      this.$store.dispatch('linkOrUnlinkCritterCollar', payload);
    },
    save() {
      const payload: ActionPostPayload = {
        body: encodeCritter(this.animal),
        callback: (data: Animal[], err?: Error | string): void => {
          if (err) {
            this.$vs.notify(getNotifyProps(err, true));
          } else {
            const newCritter = data[0][0];
            this.$vs.notify(getNotifyProps(`critter ${newCritter.animal_id} saved`));
            this.canAssignCollar = true;
            this.animal = newCritter;
            // this.$store.commit('updateEditObject', data[0]);
          }
        },
      }
      console.log(`save payload: ${JSON.stringify(payload.body)}`);
      this.$store.dispatch('upsertAnimal', payload);
      this.$emit('save:animal');
    },
    reset() {
      this.animal = {} as Animal;
      this.canAssignCollar = false;
      this.$store.commit('writeCritterCollarHistory', []);
    },
    handleAssignment(data: ICollarLinkResult) {
      this.showAssign(); // close the collar modal
      this.loadAssignments()
    },
    loadAssignments() {
      const cb = (data, err?:Error | string) => {
        if (err) this.$vs.notify(getNotifyProps(err, true));
      }
      const payload = {
        callback: cb,
        id: this.animal.id
      }
      this.$store.dispatch('getCollarAssignmentDetails', payload);
    }
  },
  watch: {
    animal() {
      if (this.isEdit) {
        const filteredAnimal = filterObj(this.animal, this.editableProperties);
        for (const [key, value] of Object.entries(filteredAnimal)) {
          if (value !== this.editObject[key]) {
            this.canSave = true;
            return;
          }
        };
        this.canSave = false;
      } else {
        this.canSave = canSaveObject(this.requiredFields, this.animal);
      }
    },
    active(show) {
      if (show && this.isEdit) {
        this.animal = this.editObject;
        this.loadAssignments();
      }
      if (!show) {
        this.reset();
      }
    },
  },
});
</script>

<style scoped>
.holamundo {
  display: flex;
  flex-direction: row;
}
.space {
  justify-content: space-between;
}
.grp-split {
  display: flex;
  flex-direction: row;
}
.grp-col {
  display: flex;
  flex-direction: column;
}
.grp {
  display: flex;
  flex-direction: row;
  margin: 15px 0px;
}
.btn-save {
  float:right;
}
h3 {
  margin: 5px 0px;
}
</style>