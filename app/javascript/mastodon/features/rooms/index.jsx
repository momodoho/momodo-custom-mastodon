import { useEffect, useState, useCallback } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import { Link, useHistory } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { fetchRooms, createRoom } from 'mastodon/actions/rooms';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';

const messages = defineMessages({
  heading: { id: 'column.rooms', defaultMessage: 'Rooms' },
  create: { id: 'rooms.create', defaultMessage: 'Create room' },
  titlePlaceholder: { id: 'rooms.title_placeholder', defaultMessage: 'New room name' },
});

const Rooms = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const history = useHistory();
  const rooms = useSelector((state) => state.get('rooms'));

  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  const handleCreate = useCallback((e) => {
    e.preventDefault();

    const value = title.trim();

    if (!value || submitting) {
      return;
    }

    setSubmitting(true);

    // momodo: rooms are always invite-only (the "open / anyone can join" policy
    // was removed — open rooms had no discovery so they were unusable).
    dispatch(createRoom(value))
      .then((room) => {
        setTitle('');
        history.push(`/rooms/${room.id}`);
        return undefined;
      })
      .catch(() => undefined)
      .finally(() => {
        setSubmitting(false);
      });
  }, [title, submitting, dispatch, history]);

  const items = rooms ? rooms.valueSeq().filter((room) => room && room.get('member')).toArray() : [];

  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.heading)}>
      <ColumnHeader
        title={intl.formatMessage(messages.heading)}
        icon='users'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
      />

      <div className='scrollable'>
        <form className='rooms__create' onSubmit={handleCreate}>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={intl.formatMessage(messages.titlePlaceholder)}
            maxLength={256}
          />
          <button type='submit' className='button' disabled={submitting || title.trim().length === 0}>
            {intl.formatMessage(messages.create)}
          </button>
        </form>

        <div className='rooms__list'>
          {items.length === 0 ? (
            <div className='rooms__empty'>
              <FormattedMessage id='rooms.empty' defaultMessage='You are not in any rooms yet. Create one above.' />
            </div>
          ) : (
            items.map((room) => (
              <Link key={room.get('id')} to={`/rooms/${room.get('id')}`} className='rooms__item'>
                <span className='rooms__item__title'>{room.get('title')}</span>
                <span className='rooms__item__meta'>
                  {room.get('owner') && (
                    <FormattedMessage id='rooms.owner_badge' defaultMessage='Owner' />
                  )}
                  {' '}
                  <FormattedMessage
                    id='rooms.members_count'
                    defaultMessage='{count, plural, one {# member} other {# members}}'
                    values={{ count: room.get('members_count') }}
                  />
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default Rooms;
