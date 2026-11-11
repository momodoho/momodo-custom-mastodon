import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import CampaignIcon from '@/material-icons/400-24px/campaign.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { fetchRoomPins, unpinRoomStatus } from 'mastodon/actions/rooms';
import { Avatar } from 'mastodon/components/avatar';
import { Icon } from 'mastodon/components/icon';
import { IconButton } from 'mastodon/components/icon_button';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import { me } from 'mastodon/initial_state';

const messages = defineMessages({
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
  unpin: { id: 'rooms.pins.unpin', defaultMessage: 'Unpin' },
});

const displayNameOf = (account) =>
  account ? (account.get('display_name') || account.get('username')) : '';

// momodo: may this viewer take the notice down? Mirrors RoomPin#removable_by?
// (the server checks again): whoever pinned it, the message author, the owner.
export const canUnpin = (pin, status, room) =>
  !!pin && (pin.get('pinned_by_id') === me ||
    (status && status.get('account') === me) ||
    !!(room && room.get('owner')));

const PinItem = ({ roomId, pin, room, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const status = useSelector(state => state.getIn(['statuses', pin.get('id')]));
  const author = useSelector(state => status && state.getIn(['accounts', status.get('account')]));
  const pinner = useSelector(state => pin.get('pinned_by_id') && state.getIn(['accounts', pin.get('pinned_by_id')]));

  const handleUnpin = useCallback(() => {
    dispatch(unpinRoomStatus(roomId, pin.get('id')));
  }, [dispatch, roomId, pin]);

  const handleContentClick = useCallback((e) => {
    const spoiler = e.target.closest && e.target.closest('.md-spoiler');
    if (spoiler) {
      e.preventDefault();
      spoiler.classList.toggle('md-spoiler--revealed');
    }
  }, []);

  const handleMediaClick = useCallback((index) => {
    dispatch(openModal({
      modalType: 'MEDIA',
      modalProps: { media: status.get('media_attachments'), index, statusId: status.get('id') },
    }));
  }, [dispatch, status]);

  // The message was deleted after the list was fetched.
  if (!status) {
    return null;
  }

  const html = status.get('contentHtml') || status.get('content') || '';
  const media = status.get('media_attachments');

  return (
    <article className='room-pins-modal__item'>
      <header className='room-pins-modal__item__header'>
        {author && (
          <Link to={`/@${author.get('acct')}`} onClick={onClose} className='room-pins-modal__item__author'>
            <Avatar account={author} size={24} />
            <bdi>{displayNameOf(author)}</bdi>
          </Link>
        )}
        <time dateTime={status.get('created_at')}>
          {intl.formatDate(status.get('created_at'), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </time>
      </header>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className='room-pins-modal__item__content room-message__content'
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleContentClick}
      />

      {media && media.size > 0 && (
        <div className='room-pins-modal__item__media'>
          {media.toArray().slice(0, 4).map((m, i) => (
            <button key={m.get('id')} type='button' onClick={() => handleMediaClick(i)}>
              <img src={m.get('preview_url') || m.get('url')} alt={m.get('description') || ''} />
            </button>
          ))}
        </div>
      )}

      <footer className='room-pins-modal__item__footer'>
        <span>
          <FormattedMessage
            id='rooms.pins.pinned_by'
            defaultMessage='Pinned by {name} · {date}'
            values={{
              name: pinner ? displayNameOf(pinner) : '—',
              date: intl.formatDate(pin.get('pinned_at'), { month: 'short', day: 'numeric' }),
            }}
          />
        </span>

        {canUnpin(pin, status, room) && (
          <button type='button' className='room-pins-modal__item__unpin' onClick={handleUnpin}>
            {intl.formatMessage(messages.unpin)}
          </button>
        )}
      </footer>
    </article>
  );
};

PinItem.propTypes = {
  roomId: PropTypes.string.isRequired,
  pin: PropTypes.object.isRequired,
  room: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

// momodo: "그룹 공지" popup — every notice pinned in this room, newest first.
// Always refetched on open, so it's current even if a stream event was missed.
export const RoomPinsModal = ({ roomId, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const room = useSelector(state => state.getIn(['rooms', roomId]));
  const pins = useSelector(state => state.getIn(['room_pins', roomId]));
  const statuses = useSelector(state => state.get('statuses'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    dispatch(fetchRoomPins(roomId)).then(() => {
      if (!cancelled) {
        setLoading(false);
      }
      return '';
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dispatch, roomId]);

  const visible = pins ? pins.filter((pin) => statuses.has(pin.get('id'))) : null;

  return (
    <div className='modal-root__modal dialog-modal room-pins-modal'>
      <div className='dialog-modal__header'>
        <IconButton
          className='dialog-modal__header__close'
          title={intl.formatMessage(messages.close)}
          icon='times'
          iconComponent={CloseIcon}
          onClick={onClose}
        />
        <span className='dialog-modal__header__title'>
          <FormattedMessage id='rooms.pins.title' defaultMessage='Group notices' />
        </span>
      </div>

      <div className='dialog-modal__content'>
        {loading && !visible ? (
          <div className='room-members-modal__loading'><LoadingIndicator /></div>
        ) : visible && visible.size > 0 ? (
          <div className={classNames('room-pins-modal__list', { 'room-pins-modal__list--refreshing': loading })}>
            {visible.map((pin) => (
              <PinItem key={pin.get('id')} roomId={roomId} pin={pin} room={room} onClose={onClose} />
            ))}
          </div>
        ) : (
          <div className='room-pins-modal__empty'>
            <Icon id='bullhorn' icon={CampaignIcon} />
            <p>
              <FormattedMessage
                id='rooms.pins.empty'
                defaultMessage='No notices yet. Open the ⋯ menu on a message and choose “Pin as notice” to put it here.'
              />
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

RoomPinsModal.propTypes = {
  roomId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
