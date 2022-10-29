import { createApp } from 'vue'
import App from './App.vue'
import router from './routes';
import store from './store'
import adapter from 'webrtc-adapter';

console.log(`browser: ${adapter.browserDetails.browser}`);
createApp(App).use(router).use(store).mount('#app')
