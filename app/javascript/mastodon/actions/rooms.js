import api from '../api';

import { updateTimeline } from './timelines';

export const ROOMS_FETCH_SUCCESS = 'ROOMS_FETCH_SUCCESS';
export const ROOM_FETCH_SUCCESS  = 'ROOM_FETCH_SUCCESS';
export const ROOM_FETCH_FAIL     = 'ROOM_FETCH_FAIL';

const roomFetchSuccess = room => ({ type: ROOM_FETCH_SUCCESS, room });
const roomsFetchSuccess = rooms => ({ type: ROOMS_FETCH_SUCCESS, rooms });
const roomFetchFail = (id, error) => ({ type: ROOM_FETCH_FAIL, id, error });

export const fetchRooms = () => (dispatch) =>
  api().get('/api/v1/rooms').then(({ data }) => dispatch(roomsFetchSuccess(data)));

export const fetchRoom = id => (dispatch, getState) => {
  if (getState().getIn(['rooms', id])) {
    return;
  }

  api().get(`/api/v1/rooms/${id}`)
    .then(({ data }) => dispatch(roomFetchSuccess(data)))
    .catch(err => dispatch(roomFetchFail(id, err)));
};

// momodo: rooms are always invite-only (server forces join_policy=invite).
export const createRoom = title => (dispatch) =>
  api().post('/api/v1/rooms', { title })
    .then(({ data }) => { dispatch(roomFetchSuccess(data)); return data; });

export const leaveRoom = id => (dispatch) =>
  api().post(`/api/v1/rooms/${id}/leave`).then(({ data }) => { dispatch(roomFetchSuccess(data)); return data; });

export const addRoomMembers = (id, accountIds) => () =>
  api().post(`/api/v1/rooms/${id}/accounts`, { account_ids: accountIds });

export const removeRoomMember = (id, accountId) => () =>
  api().delete(`/api/v1/rooms/${id}/accounts`, { data: { account_ids: [accountId] } });

// momodo: post into a room. The @-mention feature is intentionally NOT used here
// (the server strips mentions for room posts), so no tags and no notifications.
export const submitRoomStatus = (roomId, text, mediaIds = []) => (dispatch) =>
  api().post('/api/v1/statuses', { status: text, room_id: roomId, media_ids: mediaIds })
    .then(({ data }) => { dispatch(updateTimeline(`room:${roomId}`, data)); return data; });
