import { Module } from 'vuex';
import { RootState } from '@/store';
import {
  getThemeFromLocalStorage, saveThemeToLocalStorage,
} from '@/utils/storage';

export interface CommonState {
  theme: string;
}

export const commonStore: Module<CommonState, RootState> = {
  namespaced: true,
  state: () => ({
    theme: getThemeFromLocalStorage() || '',
  }),
  mutations: {
    setTheme(state, theme: string) {
      state.theme = theme;
      saveThemeToLocalStorage(theme);
    },
  },
  getters: {
    getTheme(state) {
      return state.theme;
    },
    isDarkTheme(state) {
      return state.theme === 'dark-theme';
    },
  },
  actions: {
    async toggleTheme({ commit, state }) {
      if (state.theme === 'dark-theme') {
        commit('setTheme', 'light-theme');
      } else {
        commit('setTheme', 'dark-theme');
      }
    },
  },
};