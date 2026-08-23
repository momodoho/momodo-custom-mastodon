import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import { importFetchedAccounts } from 'mastodon/actions/importer';
import { apiGetRoomAccounts } from 'mastodon/api/rooms';
import { Avatar } from 'mastodon/components/avatar';
import { DisplayName } from 'mastodon/components/display_name';
import { Icon } from 'mastodon/components/icon';
import { IconButton } from 'mastodon/components/icon_button';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';

const messages = defineMessages({
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
});

const MemberRow = ({ accountId, ownerId, onClose }) => {
  const account = useSelector(state => state.getIn(['accounts', accountId]));

  if (!account) {
    return null;
  }

  return (
    <Link
      to={`/@${account.get('acct')}`}
      className='room-members-modal__account'
      onClick={onClose}
      title={`@${account.get('acct')}`}
    >
      <Avatar account={account} size={36} />

      <div className='room-members-modal__account__name'>
        <DisplayName account={account} />
      </div>

      {accountId === ownerId && (
        <span className='room-members-modal__account__badge'>
          <FormattedMessage id='rooms.owner_badge' defaultMessage='Owner' />
        </span>
      )}
    </Link>
  );
};

MemberRow.propTypes = {
  accountId: PropTypes.string.isRequired,
  ownerId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

// momodo: "멤버 N명" in the room header opens this — every member can see who
// is in the room (the manage screen stays owner-only).
export const RoomMembersModal = ({ roomId, onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const room = useSelector(state => state.getIn(['rooms', roomId]));

  const [accountIds, setAccountIds] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiGetRoomAccounts(roomId)
      .then((data) => {
        if (cancelled) {
          return '';
        }

        dispatch(importFetchedAccounts(data));
        setAccountIds(data.map((account) => account.id));
        return '';
      })
      .catch(() => {
        if (!cancelled) {
          setAccountIds([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, roomId]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const isOwner = !!(room && room.get('owner'));
  const ownerId = room ? room.get('account_id') : null;

  return (
    <div className='modal-root__modal dialog-modal room-members-modal'>
      <div className='dialog-modal__header'>
        <IconButton
          className='dialog-modal__header__close'
          title={intl.formatMessage(messages.close)}
          icon='times'
          iconComponent={CloseIcon}
          onClick={handleClose}
        />
        <span className='dialog-modal__header__title'>
          <FormattedMessage id='rooms.members.title' defaultMessage='Members' />
        </span>
      </div>

      <div className='dialog-modal__content'>
        {accountIds === null ? (
          <div className='room-members-modal__loading'><LoadingIndicator /></div>
        ) : (
          <div className='room-members-modal__list'>
            {accountIds.map(accountId => (
              <MemberRow key={accountId} accountId={accountId} ownerId={ownerId} onClose={handleClose} />
            ))}
          </div>
        )}

        {isOwner && (
          <div className='dialog-modal__content__actions'>
            <Link to={`/rooms/${roomId}/members`} className='button' onClick={handleClose}>
              <Icon id='user-plus' icon={PersonAddIcon} />
              <FormattedMessage id='rooms.manage_members' defaultMessage='Invite / manage members' />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

RoomMembersModal.propTypes = {
  roomId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
