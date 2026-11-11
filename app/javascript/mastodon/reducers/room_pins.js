import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  ROOM_PINS_SET,
  ROOM_PIN_REMOVED,
  ROOM_DESTROYED,
} from '../actions/rooms';

// momodo: "그룹 공지" per room token → List of Map { id (status id),
// pinned_at, pinned_by_id }, newest pin first. A room that was never fetched
// has no entry (vs. an empty List once we know it has no notices).
export default function roomPins(state = ImmutableMap(), action) {
  switch (action.type) {
  case ROOM_PINS_SET:
    return state.set(action.id, fromJS(action.pins));
  case ROOM_PIN_REMOVED:
    return state.update(action.id, ImmutableList(), (pins) => pins.filterNot((pin) => pin.get('id') === action.statusId));
  case ROOM_DESTROYED:
    return state.delete(String(action.id));
  default:
    return state;
  }
}
