import { useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import SyncAltIcon from '@/material-icons/400-24px/sync_alt.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { ColumnLink } from 'mastodon/features/ui/components/column_link';
import { useAppDispatch } from 'mastodon/store';

const messages = defineMessages({
  text: { id: 'navigation_bar.account_switcher', defaultMessage: 'Switch account' },
});

export const AccountSwitcherColumnLink: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(openModal({ modalType: 'ACCOUNT_SWITCHER', modalProps: {} }));
    },
    [dispatch],
  );

  return (
    <ColumnLink
      transparent
      id='account-switcher-link'
      href='#'
      icon='sync_alt'
      iconComponent={SyncAltIcon}
      text={intl.formatMessage(messages.text)}
      onClick={handleClick}
    />
  );
};
