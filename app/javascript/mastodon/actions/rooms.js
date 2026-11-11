import api from '../api';

import { showAlertForError } from './alerts';
import { importFetchedAccounts, importFetchedStatus, importFetchedStatuses } from './importer';
import { updateTimeline, clearTimeline } from './timelines';

export const ROOMS_FETCH_SUCCESS = 'ROOMS_FETCH_SUCCESS';
export const ROOM_FETCH_SUCCESS  = 'ROOM_FETCH_SUCCESS';
export const ROOM_FETCH_FAIL     = 'ROOM_FETCH_FAIL';
export const ROOM_DESTROYED      = 'ROOM_DESTROYED';
export const ROOMS_UNREAD_SET    = 'ROOMS_UNREAD_SET';
export const ROOM_MARK_READ      = 'ROOM_MARK_READ';
export const ROOM_PINS_SET       = 'ROOM_PINS_SET';
export const ROOM_PIN_REMOVED    = 'ROOM_PIN_REMOVED';

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

// momodo: fetchRoom skips rooms already in the store; this one always asks the
// server (used when the room stream says the room changed, e.g. renamed).
export const refreshRoom = id => (dispatch) =>
  api().get(`/api/v1/rooms/${id}`)
    .then(({ data }) => dispatch(roomFetchSuccess(data)))
    .catch(() => undefined);

// momodo: owner-only rename. The server trims the name and tells the other
// members over the room stream.
export const renameRoom = (id, title) => (dispatch) =>
  api().put(`/api/v1/rooms/${id}`, { title })
    .then(({ data }) => { dispatch(roomFetchSuccess(data)); return data; })
    .catch((error) => { dispatch(showAlertForError(error)); throw error; });

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

// momodo: the raw text of one of my room messages, for the inline editor
// (the store only has the rendered HTML).
export const fetchRoomStatusSource = id =>
  api().get(`/api/v1/statuses/${id}/source`).then(({ data }) => data);

// momodo: edit one of my room messages — text only. Everything else is sent back
// unchanged: a PUT without media_ids would drop the attached images.
export const editRoomStatus = (status, text, spoilerText) => (dispatch) =>
  api().put(`/api/v1/statuses/${status.get('id')}`, {
    status: text,
    spoiler_text: spoilerText,
    sensitive: status.get('sensitive'),
    language: status.get('language'),
    media_ids: status.get('media_attachments').map((m) => m.get('id')).toArray(),
  }).then(({ data }) => { dispatch(importFetchedStatus(data)); return data; });

// momodo: unread badge for group messages. The server answers with the tokens
// of my rooms that got a message from someone else since I last read them —
// one cheap query, polled on load and then every few minutes (see
// features/rooms/components/unread_poller.jsx).
export const fetchRoomsUnread = () => (dispatch) =>
  api().get('/api/v1/rooms/unread')
    .then(({ data }) => dispatch({ type: ROOMS_UNREAD_SET, ids: data.room_ids || [] }));

// momodo: I've looked at this room. Clear its badge right away (optimistic) and
// move the server-side read marker up to the newest message.
export const markRoomRead = id => (dispatch) => {
  dispatch({ type: ROOM_MARK_READ, id: String(id) });
  return api().post(`/api/v1/rooms/${id}/read`).catch(() => undefined);
};

// momodo: "그룹 공지" — messages pinned to the top of a room. The store keeps
// only { id, pinned_at, pinned_by_id } per room; the statuses and pinners go
// through the normal importers so edits/deletes elsewhere show up here too.
const importPins = (dispatch, pins) => {
  dispatch(importFetchedStatuses(pins.map((pin) => pin.status)));
  dispatch(importFetchedAccounts(pins.map((pin) => pin.pinned_by).filter(Boolean)));
};

const pinEntry = (pin) => ({
  id: pin.id,
  pinned_at: pin.pinned_at,
  pinned_by_id: pin.pinned_by ? pin.pinned_by.id : null,
});

export const fetchRoomPins = id => (dispatch) =>
  api().get(`/api/v1/rooms/${id}/pins`)
    .then(({ data }) => {
      importPins(dispatch, data);
      dispatch({ type: ROOM_PINS_SET, id: String(id), pins: data.map(pinEntry) });
      return data;
    })
    .catch(() => undefined);

export const pinRoomStatus = (id, statusId) => (dispatch) =>
  api().post(`/api/v1/rooms/${id}/pins`, { status_id: statusId })
    .then(() => dispatch(fetchRoomPins(id)))
    .catch((error) => dispatch(showAlertForError(error)));

export const unpinRoomStatus = (id, statusId) => (dispatch) => {
  dispatch({ type: ROOM_PIN_REMOVED, id: String(id), statusId: String(statusId) });
  return api().delete(`/api/v1/rooms/${id}/pins/${statusId}`)
    .catch((error) => {
      dispatch(showAlertForError(error));
      dispatch(fetchRoomPins(id));
    });
};
