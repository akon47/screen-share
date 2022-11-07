import { createApp } from 'vue';
import App from './App.vue';
import router from './routes';
import store from './store';
import adapter from 'webrtc-adapter';
import ToastPlugin from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-sugar.css';

console.log(`browser: ${adapter.browserDetails.browser}`);
createApp(App).use(ToastPlugin, { position: 'top' }).use(router).use(store).mount('#app');
