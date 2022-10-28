import { createHttpApiClient, HttpApiClient } from '@/api/common/httpApiClient';

export const sharingV1: HttpApiClient = createHttpApiClient('v1/sharing');