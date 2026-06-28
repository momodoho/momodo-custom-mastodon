import { Map as ImmutableMap, fromJS } from 'immutable';

import {
  ROOMS_FETCH_SUCCESS,
  ROOM_FETCH_SUCCESS,
  ROOM_FETCH_FAIL,
} from '../actions/rooms';

const initialState = ImmutableMap();

const normalizeRoom = (state, room) => state.set(room.id, fromJS(room));

const normalizeRooms = (state, rooms) => {
  rooms.forEach((room) => {
    state = normalizeRoom(state, room);
  });

  return state;
};

export default function rooms(state = initialState, action) {
  switch (action.type) {
  case ROOMS_FETCH_SUCCESS:
    return normalizeRooms(state, action.rooms);
  case ROOM_FETCH_SUCCESS:
    return normalizeRoom(state, action.room);
  case ROOM_FETCH_FAIL:
    return state.set(action.id, false);
  default:
    return state;
  }
}
