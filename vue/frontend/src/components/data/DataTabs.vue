<template>
  <div class="ss">
    <div class="r">
      <vs-select 
        label="Select Test User"
        v-model="user"
        v-on:change="(v) => $store.dispatch('changeTestUser', v)"
      ><vs-select-item
        :key="idx" :value="user" :text="user"
        v-for="(user, idx) in $store.getters.testUsers"></vs-select-item>
      </vs-select>
    </div>
    <vs-tabs>
      <vs-tab
        v-for="item in items"
        :key="item.key"
        :label="item.title"
        :disabled="item.disabled">
        <component :is="item.component"></component>
      </vs-tab>
    </vs-tabs>
  </div>
</template>

<script>
import AddAnimal from './animal/AddAnimal';
import AddCodeHeader from './codes/AddCodeHeader';
import AssignCollar from './animal/AssignCollar';
import Collar from './collar/Collar';
import Animal from './animal/Animal';
import Settings from './Settings';
import Export from './Export';
import Import from './Import';
import Input from '../form/Input';
import Checkbox from '../form/Checkbox';
import Select from '../form/Select';
import Modal from '../Modal';
import CollarModal from '../data/collar/CollarModal';
import KeyxInputParse from './collar/KeyxInputParse';
import StateTable from '../Table';
import YesNoDialog from '../YesNoDialog';
import Vue from 'vue';

Vue.component('add-animal', AddAnimal, );
Vue.component('add-code', AddCodeHeader);
Vue.component('assign-collar', AssignCollar);
Vue.component('collar-modal', CollarModal);
Vue.component('export-modal', Export);
Vue.component('import-modal', Import);
Vue.component('input-check', Checkbox);
Vue.component('input-type', Input);
Vue.component('input-select', Select);
Vue.component('state-table', StateTable);
Vue.component('modal', Modal);
Vue.component('keyx-modal', KeyxInputParse);
Vue.component('yes-no', YesNoDialog);

export default {
  name: 'dataTabs',
  data: function() {
    return {
      user: this.$store.getters.testUser
    }
  },
  computed: {
    items() {
      return [
        { title: 'Critters', disabled: false, key: 0, component: Animal },
        { title: 'Collars', disabled: false, key: 1, component: Collar },
        { title: 'Code Settings', disabled: false, key: 2, component: Settings },
        { title: 'Profile', disabled: true, key: 3 }
      ]
    }
  }
}
</script>

<style scoped>
.r {
  float: right;
}
#ss {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>

