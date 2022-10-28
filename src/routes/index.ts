import {
  createRouter,
  createWebHistory,
} from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/screen-sharing',
    },
    {
      path: '/screen-sharing',
      name: 'ScreenSharing',
      component: () => import('../views/ScreenSharingView.vue'),
    },
    {
      path: '/screen-sharing/:channelId',
      name: 'ScreenSharingChannel',
      component: () => import('../views/ScreenSharingChannelView.vue'),
      props: (route) => ({
        channelId: route.params.channelId,
        hostToken: route.query.hostToken,
        guestToken: route.query.guestToken,
      }),
    },
    {
      path: '/not-found',
      name: 'NotFound',
      component: () => import('../views/NotFoundView.vue'),
      meta: {
        title: '페이지를 찾을 수 없습니다.',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: 'not-found',
    },
  ],
});


export default router;
