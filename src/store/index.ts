import { createStore } from 'vuex';
import { CommonState, commonStore } from './modules/common.store';
import { AuthState, authStore } from '@/store/modules/auth.store';

export interface RootState {
  commonStore: CommonState;
  authStore: AuthState;
}

export default createStore({
  modules: { commonStore, authStore },
});