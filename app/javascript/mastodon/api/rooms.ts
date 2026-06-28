import {
  apiRequestPost,
  apiRequestGet,
  apiRequestDelete,
} from 'mastodon/api';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';

export const apiGetRoomAccounts = (roomId: string) =>
  apiRequestGet<ApiAccountJSON[]>(`v1/rooms/${roomId}/accounts`, {
    limit: 0,
  });

export const apiAddAccountToRoom = (roomId: string, accountId: string) =>
  apiRequestPost(`v1/rooms/${roomId}/accounts`, {
    account_ids: [accountId],
  });

export const apiRemoveAccountFromRoom = (roomId: string, accountId: string) =>
  apiRequestDelete(`v1/rooms/${roomId}/accounts`, {
    account_ids: [accountId],
  });
