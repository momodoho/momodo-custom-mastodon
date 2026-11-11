import { Set as ImmutableSet } from 'immutable';

import {
  ROOMS_UNREAD_SET,
  ROOM_MARK_READ,
  ROOM_DESTROYED,
} from '../actions/rooms';

// momodo: tokens of the rooms with messages I haven't seen yet. Drives the
// badge on the "그룹 메시지" nav item, the dot on the mobile menu button, and
// the bold rows in the room list.
export default function roomUnread(state = ImmutableSet(), action) {
  switch (action.type) {
  case ROOMS_UNREAD_SET:
    return ImmutableSet(action.ids.map(String));
  case ROOM_MARK_READ:
  case ROOM_DESTROYED:
    return state.delete(String(action.id));
  default:
    return state;
  }
}
