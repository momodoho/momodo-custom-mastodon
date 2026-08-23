import PropTypes from 'prop-types';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { Link, useHistory } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import AddCommentIcon from '@/material-icons/400-24px/add_comment.svg?react';
import SearchIcon from '@/material-icons/400-24px/search.svg?react';
import { fetchRooms, createRoom } from 'mastodon/actions/rooms';
import { Icon } from 'mastodon/components/icon';
import { RelativeTimestamp } from 'mastodon/components/relative_timestamp';
import { me } from 'mastodon/initial_state';

import { RoomAvatar } from './room_avatar';

const messages = defineMessages({
  heading: { id: 'column.rooms', defaultMessage: 'Rooms' },
  search: { id: 'rooms.search', defaultMessage: 'Search' },
  newChat: { id: 'rooms.new_chat', defaultMessage: 'New chat' },
  create: { id: 'rooms.create', defaultMessage: 'Create room' },
  titlePlaceholder: { id: 'rooms.title_placeholder', defaultMessage: 'New room name' },
  cancel: { id: 'rooms.create_cancel', defaultMessage: 'Cancel' },
  you: { id: 'rooms.you', defaultMessage: 'You' },
  image: { id: 'rooms.snippet.image', defaultMessage: 'Sent an image' },
});

// momodo: strip HTML for a one-line preview of a status from the store.
const snippetFromStatus = (status, intl) => {
  const html = status.get('contentHtml') || status.get('content') || '';
  const text = html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text) {
    return text;
  }
  const media = status.get('media_attachments');
  if (media && media.size > 0) {
    return intl.formatMessage(messages.image);
  }
  return '';
};

const RoomListItem = ({ room, active, intl }) => {
  const id = room.get('id');

  // Prefer the live timeline (updated in real time over the stream) and fall
  // back to the snapshot the API sent with the room list.
  const live = useSelector((state) => {
    const sid = state.getIn(['timelines', `room:${id}`, 'items', 0]);
    return sid ? state.getIn(['statuses', sid]) : null;
  });

  let text = '';
  let when = null;
  let mine = false;

  if (live) {
    text = snippetFromStatus(live, intl);
    when = live.get('created_at');
    mine = live.get('account') === me;
  } else if (room.get('last_message')) {
    const lm = room.get('last_message');
    text = lm.get('text');
    when = lm.get('created_at');
    mine = lm.getIn(['account', 'id']) === me;
  }

  return (
    <Link to={`/rooms/${id}`} className={classNames('room-list__item', { 'room-list__item--active': active })}>
      <RoomAvatar room={room} size={48} />
      <span className='room-list__item__body'>
        <span className='room-list__item__top'>
          <span className='room-list__item__title'>{room.get('title')}</span>
          {when && <span className='room-list__item__time'><RelativeTimestamp timestamp={when} /></span>}
        </span>
        <span className='room-list__item__snippet'>
          {text ? (
            <>
              {mine && <span className='room-list__item__you'>{intl.formatMessage(messages.you)}: </span>}
              {text}
            </>
          ) : (
            <FormattedMessage
              id='rooms.members_count'
              defaultMessage='{count, plural, one {# member} other {# members}}'
              values={{ count: room.get('members_count') }}
            />
          )}
        </span>
      </span>
    </Link>
  );
};

RoomListItem.propTypes = {
  room: PropTypes.object.isRequired,
  active: PropTypes.bool,
  intl: PropTypes.object.isRequired,
};

export const RoomList = ({ activeId, creating, onCreatingChange }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const history = useHistory();
  const rooms = useSelector((state) => state.get('rooms'));
  const timelines = useSelector((state) => state.get('timelines'));
  const statuses = useSelector((state) => state.get('statuses'));

  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  const items = useMemo(() => {
    const list = rooms ? rooms.valueSeq().filter((room) => room && room.get && room.get('member')).toArray() : [];
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((room) => (room.get('title') || '').toLowerCase().includes(q)) : list;

    // Newest activity first, like a DM inbox (live timeline beats the snapshot).
    const lastActivity = (room) => {
      const sid = timelines.getIn([`room:${room.get('id')}`, 'items', 0]);
      const live = sid ? statuses.getIn([sid, 'created_at']) : null;
      return live || room.getIn(['last_message', 'created_at']) || '';
    };

    return filtered.sort((a, b) => {
      const ta = lastActivity(a);
      const tb = lastActivity(b);
      if (ta === tb) {
        return 0; // keep the server's order (room ids are opaque tokens)
      }
      return ta < tb ? 1 : -1;
    });
  }, [rooms, query, timelines, statuses]);

  const handleCreate = useCallback((e) => {
    e.preventDefault();
    const value = title.trim();
    if (!value || submitting) {
      return;
    }
    setSubmitting(true);
    dispatch(createRoom(value))
      .then((room) => {
        setTitle('');
        onCreatingChange(false);
        history.push(`/rooms/${room.id}`);
        return undefined;
      })
      .catch(() => undefined)
      .finally(() => setSubmitting(false));
  }, [title, submitting, dispatch, history, onCreatingChange]);

  return (
    <div className='room-list'>
      <div className='room-list__header'>
        <h1>{intl.formatMessage(messages.heading)}</h1>
        <button
          type='button'
          className={classNames('room-list__new', { active: creating })}
          title={intl.formatMessage(messages.newChat)}
          aria-label={intl.formatMessage(messages.newChat)}
          onClick={() => onCreatingChange(!creating)}
        >
          <Icon id='comment-plus' icon={AddCommentIcon} />
        </button>
      </div>

      <div className='room-list__search'>
        <Icon id='search' icon={SearchIcon} />
        <input
          type='search'
          value={query}
          placeholder={intl.formatMessage(messages.search)}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {creating && (
        <form className='room-list__create' onSubmit={handleCreate}>
          <input
            type='text'
            value={title}
            autoFocus
            maxLength={256}
            placeholder={intl.formatMessage(messages.titlePlaceholder)}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className='room-list__create__actions'>
            <button type='button' className='button button-secondary' onClick={() => onCreatingChange(false)}>
              {intl.formatMessage(messages.cancel)}
            </button>
            <button type='submit' className='button' disabled={submitting || title.trim().length === 0}>
              {intl.formatMessage(messages.create)}
            </button>
          </div>
        </form>
      )}

      <div className='room-list__items'>
        {items.length === 0 ? (
          <div className='room-list__empty'>
            {query ? (
              <FormattedMessage id='rooms.no_results' defaultMessage='No chats match your search.' />
            ) : (
              <FormattedMessage id='rooms.empty' defaultMessage='You are not in any rooms yet. Create one above.' />
            )}
          </div>
        ) : (
          items.map((room) => (
            <RoomListItem key={room.get('id')} room={room} active={room.get('id') === activeId} intl={intl} />
          ))
        )}
      </div>
    </div>
  );
};

RoomList.propTypes = {
  activeId: PropTypes.string,
  creating: PropTypes.bool,
  onCreatingChange: PropTypes.func.isRequired,
};
