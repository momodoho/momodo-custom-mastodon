import api from '../api';

import { updateTimeline, clearTimeline } from './timelines';

export const ROOMS_FETCH_SUCCESS = 'ROOMS_FETCH_SUCCESS';
export const ROOM_FETCH_SUCCESS  = 'ROOM_FETCH_SUCCESS';
export const ROOM_FETCH_FAIL     = 'ROOM_FETCH_FAIL';
export const ROOM_DESTROYED      = 'ROOM_DESTROYED';

const roomFetchSuccess = room => ({ type: ROOM_FETCH_SUCCESS, room });
const roomsFetchSuccess = rooms => ({ type: ROOMS_FETCH_SUCCESS, rooms });
// skipNotFound: an unknown/inaccessible room token shows the in-column 404
// page — no need to also throw an error toast at the user.
const roomFetchFail = (id, error) => ({ type: ROOM_FETCH_FAIL, id, error, skipNotFound: true });

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

// momodo: the room is gone for everyone — drop it from the store and throw away
// its cached timeline. Dispatched both by the owner who blew it up and by the
// `room.destroyed` event other members receive over the room stream.
export const roomDestroyed = id => (dispatch) => {
  dispatch({ type: ROOM_DESTROYED, id: String(id) });
  dispatch(clearTimeline(`room:${id}`));
};

// momodo: "방 폭파" — only the owner may do this, and the room (with all of its
// messages) disappears for every member.
export const destroyRoom = id => (dispatch) =>
  api().delete(`/api/v1/rooms/${id}`).then(() => { dispatch(roomDestroyed(id)); return id; });

export const addRoomMembers = (id, accountIds) => () =>
  api().post(`/api/v1/rooms/${id}/accounts`, { account_ids: accountIds });

export const removeRoomMember = (id, accountId) => () =>
  api().delete(`/api/v1/rooms/${id}/accounts`, { data: { account_ids: [accountId] } });

// momodo: post into a room. The @-mention feature is intentionally NOT used here
// (the server strips mentions for room posts), so no tags and no notifications.
export const submitRoomStatus = (roomId, text, mediaIds = []) => (dispatch) =>
  api().post('/api/v1/statuses', { status: text, room_id: roomId, media_ids: mediaIds })
    .then(({ data }) => { dispatch(updateTimeline(`room:${roomId}`, data)); return data; });
