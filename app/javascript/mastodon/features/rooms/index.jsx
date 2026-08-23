import { useState, useCallback } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import { useHistory } from 'react-router-dom';

import { useDispatch } from 'react-redux';

import ChatBubbleIcon from '@/material-icons/400-24px/chat_bubble.svg?react';
import { createRoom } from 'mastodon/actions/rooms';
import { Icon } from 'mastodon/components/icon';

import { RoomsShell } from './components/rooms_shell';

const messages = defineMessages({
  heading: { id: 'column.rooms', defaultMessage: 'Rooms' },
  titlePlaceholder: { id: 'rooms.title_placeholder', defaultMessage: 'New room name' },
  create: { id: 'rooms.create', defaultMessage: 'Create room' },
});

// momodo: `/rooms` — the list plus an empty-state pane ("start a chat") on
// wide screens, list only on narrow ones.
const Rooms = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const history = useHistory();
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = useCallback((e) => {
    e.preventDefault();
    const value = title.trim();
    if (!value || submitting) {
      return;
    }
    setSubmitting(true);
    dispatch(createRoom(value))
      .then((room) => { history.push(`/rooms/${room.id}`); return undefined; })
      .catch(() => undefined)
      .finally(() => setSubmitting(false));
  }, [title, submitting, dispatch, history]);

  return (
    <RoomsShell pane='list'>
      <div className='rooms-placeholder'>
        <div className='rooms-placeholder__icon'>
          <Icon id='comment' icon={ChatBubbleIcon} />
        </div>
        <h2><FormattedMessage id='rooms.placeholder.title' defaultMessage='Start a conversation' /></h2>
        <p><FormattedMessage id='rooms.placeholder.body' defaultMessage='Pick an existing chat or create a new one.' /></p>

        {open ? (
          <form className='rooms-placeholder__create' onSubmit={handleCreate}>
            <input
              type='text'
              value={title}
              autoFocus
              maxLength={256}
              placeholder={intl.formatMessage(messages.titlePlaceholder)}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button type='submit' className='button' disabled={submitting || title.trim().length === 0}>
              {intl.formatMessage(messages.create)}
            </button>
          </form>
        ) : (
          <button type='button' className='button rooms-placeholder__button' onClick={() => setOpen(true)}>
            <FormattedMessage id='rooms.new_chat' defaultMessage='New chat' />
          </button>
        )}
      </div>

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </RoomsShell>
  );
};

export default Rooms;
