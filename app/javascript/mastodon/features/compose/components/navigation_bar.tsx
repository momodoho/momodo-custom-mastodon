import { useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { cancelReplyCompose } from 'mastodon/actions/compose';
import { Account } from 'mastodon/components/account';
import { IconButton } from 'mastodon/components/icon_button';
import { MoreLink } from 'mastodon/features/navigation_panel/components/more_link';
import { me } from 'mastodon/initial_state';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const messages = defineMessages({
  cancel: { id: 'reply_indicator.cancel', defaultMessage: 'Cancel' },
});

export const NavigationBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const isReplying = useAppSelector(
    (state) => !!state.compose.get('in_reply_to'),
  );

  const handleCancelClick = useCallback(() => {
    dispatch(cancelReplyCompose());
  }, [dispatch]);

  if (!me) {
    return null;
  }

  return (
    <div className='navigation-bar'>
      <Account id={me} minimal />

      {isReplying && (
        <IconButton
          title={intl.formatMessage(messages.cancel)}
          icon=''
          iconComponent={CloseIcon}
          onClick={handleCancelClick}
        />
      )}

      {/* momodo: hamburger (More) button beside the profile picture/name. */}
      <MoreLink compact />
    </div>
  );
};
