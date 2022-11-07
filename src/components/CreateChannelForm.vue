<template>
  <div class="form-container">
    <div class="form-wrapper">
      <div class="form-title">New Sharing</div>
      <div>
        <input :class="{'invalid': password && !isPasswordValid}"
               :disabled="isLoading"
               type="text" id="channel-password" v-model="password" placeholder="Sharing Channel Password" maxlength="16"/>
      </div>
      <button :disabled="!isPasswordValid || isLoading"
              @click="creatingSharingChannel">
        Create
      </button>
      <div class="footer-message">
        Want to join a sharing channel?
        <router-link to="/screen-sharing/join-channel">
          Join Sharing
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { createSharingChannel } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';

export default defineComponent({
  name: 'CreateChannelForm',
  data() {
    return {
      password: '',
      isLoading: false,
    };
  },
  computed: {
    isPasswordValid(): boolean {
      return this.password.length <= 16;
    },
  },
  methods: {
    creatingSharingChannel() {
      this.isLoading = true;
      createSharingChannel({
        password: this.password,
      })
      .then((createSharingChannelResponse) => {
        this.$router.push(`/screen-sharing/${createSharingChannelResponse.channelId}?hostToken=${createSharingChannelResponse.hostToken}`);
      })
      .catch((error: HttpApiError) => {
        this.$toast.error(error.getErrorMessage());
      })
      .finally(() => {
        this.isLoading = false;
      });
    },
  },
});
</script>

<style scoped>


</style>
