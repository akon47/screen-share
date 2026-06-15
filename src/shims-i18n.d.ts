/* eslint-disable */
// vue-i18n's global ($t / $i18n) type augmentation is not picked up under this
// project's TS setup, so declare the legacy-mode injected properties here.
import '@vue/runtime-core';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: (key: string, ...args: any[]) => string;
    $i18n: {
      locale: string;
      t: (key: string, ...args: any[]) => string;
    };
  }
}
