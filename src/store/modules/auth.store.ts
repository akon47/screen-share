import { Module } from 'vuex';
import { RootState } from '@/store';

export interface AuthState {
  authToken: string;
}

export const authStore: Module<AuthState, RootState> = {
  namespaced: true,
  state: () => ({
    authToken: '',
  }),
  mutations: {
    setAuthToken(state, authToken: string) {
      state.authToken = authToken;
    }
  },
  actions: {
    async setAuthToken({ commit }, authToken: string) {
      commit('setAuthToken', authToken);
    },
  },
};