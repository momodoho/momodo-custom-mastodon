import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { editRoomStatus, fetchRoomStatusSource } from 'mastodon/actions/rooms';
import { Dropdown } from 'mastodon/components/dropdown_menu';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import { me } from 'mastodon/initial_state';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const messages = defineMessages({
  more: { id: 'status.more', defaultMessage: 'More' },
  edit: { id: 'status.edit', defaultMessage: 'Edit' },
  delete: { id: 'status.delete', defaultMessage: 'Delete' },
  edited: { id: 'room.message.edited', defaultMessage: 'Edited' },
  save: { id: 'room.message.save', defaultMessage: 'Save' },
  cancel: { id: 'room.message.cancel', defaultMessage: 'Cancel' },
  editHint: { id: 'room.message.edit_hint', defaultMessage: 'Enter to save · Esc to cancel' },
});

// momodo: ⋯ menu beside my own message — edit / delete. Only my messages get it
// (the server would refuse anyway: edit and delete are author-only).
const MessageMenu = ({ status, onEdit }) => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const items = useMemo(() => [
    { text: intl.formatMessage(messages.edit), action: () => onEdit(status) },
    {
      text: intl.formatMessage(messages.delete),
      dangerous: true,
      action: () => dispatch(openModal({
        modalType: 'CONFIRM_DELETE_STATUS',
        modalProps: { statusId: status.get('id'), withRedraft: false },
      })),
    },
  ], [intl, dispatch, status, onEdit]);

  return (
    <div className='room-message__menu'>
      <Dropdown
        items={items}
        icon='ellipsis-h'
        iconComponent={MoreHorizIcon}
        title={intl.formatMessage(messages.more)}
        placement='bottom-end'
      />
    </div>
  );
};

MessageMenu.propTypes = {
  status: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
};

// momodo: the bubble turns into a textarea in place. Text only — attached images
// stay as they are. Enter saves (Shift+Enter = newline, like the composer), Esc
// cancels.
const MessageEditor = ({ status, initialText, spoilerText, onDone }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const hasMedia = status.get('media_attachments').size > 0;
  const canSave = !saving && (text.trim().length > 0 || hasMedia);

  const grow = useCallback((el) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      grow(el);
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [grow]);

  const handleSave = useCallback(() => {
    if (!canSave) {
      return;
    }

    if (text.trim() === initialText.trim()) {
      onDone();
      return;
    }

    setSaving(true);
    dispatch(editRoomStatus(status, text.trim(), spoilerText))
      .then(() => onDone())
      .catch(() => setSaving(false));
  }, [canSave, text, initialText, dispatch, status, spoilerText, onDone]);

  const handleKeyDown = useCallback((e) => {
    // isComposing: Enter that confirms a Korean/Japanese IME syllable is not a save.
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDone();
    }
  }, [handleSave, onDone]);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
    grow(e.target);
  }, [grow]);

  return (
    <div className='room-message__editor'>
      <textarea
        ref={textareaRef}
        className='room-message__editor__textarea'
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={saving}
      />
      <div className='room-message__editor__footer'>
        <span className='room-message__editor__hint'>{intl.formatMessage(messages.editHint)}</span>
        <button type='button' className='room-message__editor__button' onClick={onDone} disabled={saving}>
          {intl.formatMessage(messages.cancel)}
        </button>
        <button
          type='button'
          className='room-message__editor__button room-message__editor__button--primary'
          onClick={handleSave}
          disabled={!canSave}
        >
          {intl.formatMessage(messages.save)}
        </button>
      </div>
    </div>
  );
};

MessageEditor.propTypes = {
  status: PropTypes.object.isRequired,
  initialText: PropTypes.string.isRequired,
  spoilerText: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// momodo: Twitter-DM-style message list for a room. The store keeps the room
// timeline newest-first; we lay it out with `flex-direction: column-reverse`
// so the newest message sits at the bottom and the scroll position is
// naturally anchored there (new messages don't jump the view).
export const RoomChat = ({ roomId, onLoadMore }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const scrollRef = useRef(null);

  const timeline = useSelector((state) => state.getIn(['timelines', `room:${roomId}`]));
  const statuses = useSelector((state) => state.get('statuses'));
  const accounts = useSelector((state) => state.get('accounts'));

  const items = timeline ? timeline.get('items') : null;
  const isLoading = timeline ? timeline.get('isLoading') : true;
  const hasMore = timeline ? timeline.get('hasMore') : false;

  // Build the chronological render list (date separators + grouped bubbles),
  // then reverse it for the column-reverse container.
  const rows = useMemo(() => {
    if (!items) {
      return [];
    }

    const chronological = items
      .toArray()
      .filter((id) => id !== null)
      .map((id) => statuses.get(id))
      .filter((status) => !!status)
      .reverse();

    const out = [];
    let prev = null;

    chronological.forEach((status, index) => {
      const date = new Date(status.get('created_at'));
      const prevDate = prev ? new Date(prev.get('created_at')) : null;

      if (!prevDate || !sameDay(prevDate, date)) {
        out.push({ type: 'date', key: `d-${status.get('id')}`, date });
      }

      const next = chronological[index + 1];
      const nextDate = next ? new Date(next.get('created_at')) : null;

      const sameAuthorAsPrev = prev && prevDate && sameDay(prevDate, date) &&
        prev.get('account') === status.get('account') && (date - prevDate) < GROUP_WINDOW_MS;
      const sameAuthorAsNext = next && nextDate && sameDay(nextDate, date) &&
        next.get('account') === status.get('account') && (nextDate - date) < GROUP_WINDOW_MS;

      out.push({
        type: 'message',
        key: status.get('id'),
        status,
        account: accounts.get(status.get('account')),
        mine: status.get('account') === me,
        first: !sameAuthorAsPrev,
        last: !sameAuthorAsNext,
      });

      prev = status;
    });

    return out.reverse();
  }, [items, statuses, accounts]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading || !hasMore || !items || items.size === 0) {
      return;
    }
    // column-reverse: scrollTop goes negative as the user scrolls up.
    const distanceFromTop = el.scrollHeight - el.clientHeight + el.scrollTop;
    if (distanceFromTop < 240) {
      onLoadMore(items.last());
    }
  }, [isLoading, hasMore, items, onLoadMore]);

  // If the first page doesn't fill the pane, fetch more so "scroll up" works.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !isLoading && hasMore && items && items.size > 0 && el.scrollHeight <= el.clientHeight) {
      onLoadMore(items.last());
    }
  }, [isLoading, hasMore, items, onLoadMore]);

  const handleContentClick = useCallback((e) => {
    const spoiler = e.target.closest && e.target.closest('.md-spoiler');
    if (spoiler) {
      e.preventDefault();
      spoiler.classList.toggle('md-spoiler--revealed');
    }
  }, []);

  const handleMediaClick = useCallback((status, index) => {
    dispatch(openModal({
      modalType: 'MEDIA',
      modalProps: { media: status.get('media_attachments'), index, statusId: status.get('id') },
    }));
  }, [dispatch]);

  // Inline edit: { id, text, spoilerText } of the message being edited. The raw
  // text comes from /source — the store only has the rendered HTML.
  const [editing, setEditing] = useState(null);

  const handleEdit = useCallback((status) => {
    fetchRoomStatusSource(status.get('id'))
      .then((source) => setEditing({ id: status.get('id'), text: source.text || '', spoilerText: source.spoiler_text || '' }))
      .catch(() => undefined);
  }, []);

  const handleEditDone = useCallback(() => setEditing(null), []);

  // The message under edit was deleted (here or from another tab) → close the editor.
  useEffect(() => {
    if (editing && !statuses.get(editing.id)) {
      setEditing(null);
    }
  }, [editing, statuses]);

  if (!items) {
    return <div className='room-chat__loading'><LoadingIndicator /></div>;
  }

  return (
    <div className='room-chat' ref={scrollRef} onScroll={handleScroll}>
      {rows.length === 0 && !isLoading && (
        <div className='room-chat__empty'>
          <FormattedMessage id='empty_column.room' defaultMessage='No messages in this room yet. When members post, they will appear here in real time.' />
        </div>
      )}

      {rows.map((row) => {
        if (row.type === 'date') {
          return (
            <div key={row.key} className='room-chat__date'>
              {intl.formatDate(row.date, { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          );
        }

        const { status, account, mine, first, last } = row;
        const media = status.get('media_attachments');
        const html = status.get('contentHtml') || status.get('content') || '';
        const hasText = html.replace(/<[^>]+>/g, '').trim().length > 0;
        const isEditing = editing && editing.id === status.get('id');
        const edited = !!status.get('edited_at');

        return (
          <div
            key={row.key}
            className={classNames('room-message', {
              'room-message--mine': mine,
              'room-message--theirs': !mine,
              'room-message--first': first,
              'room-message--last': last,
              'room-message--editing': isEditing,
            })}
          >

            {!mine && (
              <div className='room-message__avatar'>
                {last && account && (
                  <Link to={`/@${account.get('acct')}`} title={account.get('acct')}>
                    <img src={account.get('avatar_static') || account.get('avatar')} alt='' />
                  </Link>
                )}
              </div>
            )}

            <div className='room-message__body'>
              {!mine && first && account && (
                <div className='room-message__name'>{account.get('display_name') || account.get('username')}</div>
              )}

              {media && media.size > 0 && (
                <div className={classNames('room-message__media', `room-message__media--${Math.min(media.size, 4)}`)}>
                  {media.toArray().slice(0, 4).map((m, i) => (
                    <button key={m.get('id')} type='button' onClick={() => handleMediaClick(status, i)}>
                      <img src={m.get('preview_url') || m.get('url')} alt={m.get('description') || ''} />
                    </button>
                  ))}
                </div>
              )}

              {isEditing ? (
                <MessageEditor
                  status={status}
                  initialText={editing.text}
                  spoilerText={editing.spoilerText}
                  onDone={handleEditDone}
                />
              ) : hasText && (
                <div className='room-message__bubble'>
                  {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                  <div
                    className='room-message__content'
                    dangerouslySetInnerHTML={{ __html: html }}
                    onClick={handleContentClick}
                  />
                </div>
              )}

              {!isEditing && (last || edited) && (
                <div className='room-message__time'>
                  {edited && <span className='room-message__edited'>{intl.formatMessage(messages.edited)}</span>}
                  {edited && last && ' · '}
                  {last && intl.formatTime(new Date(status.get('created_at')), { hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* After the body in DOM order: --mine rows are row-reverse, so this lands left of the bubble. */}
            {mine && !isEditing && <MessageMenu status={status} onEdit={handleEdit} />}
          </div>
        );
      })}

      {isLoading && <div className='room-chat__loading-more'><LoadingIndicator /></div>}
    </div>
  );
};

RoomChat.propTypes = {
  roomId: PropTypes.string.isRequired,
  onLoadMore: PropTypes.func.isRequired,
};
