<template>
  <div class="form-container">
    <div class="form-wrapper">
      <div class="form-title">Join Sharing</div>
      <div>
        <input :class="{'invalid': channelId && !isChannelIdValid}"
               type="text" id="channel-id" v-model="channelId" placeholder="Sharing Channel Id" maxlength="36"/>
      </div>
      <div>
        <input :class="{'invalid': password && !isPasswordValid}"
               type="text" id="channel-password" v-model="password" placeholder="Sharing Channel Password"
               maxlength="16"/>
      </div>
      <button :disabled="!isChannelIdValid || !isPasswordValid || isLoading"
              @click="joiningSharingChannel">
        Join
      </button>
      <div class="footer-message">
        Want to create a sharing channel?
        <router-link to="/screen-sharing/create-channel">
          New Sharing
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { joinSharingChannel } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';

export default defineComponent({
  name: 'JoinChannelForm',
  data() {
    return {
      channelId: '',
      password: '',
      isLoading: false,
    };
  },
  computed: {
    isChannelIdValid(): boolean {
      const regex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
      return regex.test(this.channelId);
    },
    isPasswordValid(): boolean {
      return this.password.length < 16;
    },
  },
  methods: {
    joiningSharingChannel() {
      this.isLoading = true;
      joinSharingChannel(this.channelId, {
        password: this.password,
      })
      .then((joinSharingChannelResponse) => {
        this.$router.push(`/screen-sharing/${joinSharingChannelResponse.channelId}?guestToken=${joinSharingChannelResponse.guestToken}`);
      })
      .catch((error: HttpApiError) => {
        if (error.isUnauthorized()) {
          alert('Please check the channel password.');
        } else if (error.isNotFound()) {
          alert('This channel does not exist.');
        }
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
