<template>
  <div class="user-form-container">
    <div class="user-list-container">
      <user-item v-for="user in users" :key="user.id" :user="user"/>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getChannelUsers } from '@/api/sharing';
import { HttpApiError } from '@/api/common/httpApiClient';
import { ChannelUserDto } from '@/api/models/sharing.dtos';
import UserItem from '@/components/UserItem.vue';

export default defineComponent({
  name: 'UserForm',
  components: { UserItem },
  props: {
    token: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    updateKey: {},
  },
  data() {
    return {
      isLoading: false,
      users: Array<ChannelUserDto>(),
    };
  },
  watch: {
    updateKey() {
      this.fetchUsers();
    },
  },
  methods: {
    async fetchUsers() {
      if (!this.token) {
        return;
      }

      try {
        this.isLoading = true;
        await getChannelUsers(this.token, this.channelId)
        .then(async (users) => {
          this.users = users.data;
        })
        .catch((error: HttpApiError) => {
          this.$toast.error(error.getErrorMessage());
        });
      } finally {
        this.isLoading = false;
      }
    },
  },
  mounted() {
    this.fetchUsers();
  },
});
</script>

<style scoped>

.user-form-container {
  box-shadow: 0px 1px 5px var(--base-shadow-color);
  z-index: 1000;
  background: var(--content-background-color);
  width: 100%;
  height: 100%;
}

.user-form-container .user-list-container {
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  overflow-x: hidden;
  padding: 12px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

</style>
