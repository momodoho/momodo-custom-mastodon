import type { FC } from 'react';

import { FormattedMessage } from 'react-intl';

import type { NavLinkProps } from 'react-router-dom';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useAccountId } from '@/mastodon/hooks/useAccountId';

import { TabLink, TabList } from '../tab_list';

import classes from './styles.module.scss';

const isActive: Required<NavLinkProps>['isActive'] = (match, location) =>
  match?.url === location.pathname ||
  (!!match?.url && location.pathname.startsWith(`${match.url}/tagged/`));

export const AccountTabs: FC = () => {
  const accountId = useAccountId();
  const account = useAccount(accountId);

  if (!account) {
    return <hr className={classes.noTabs} />;
  }

  const { acct } = account;

  // momodo: classic profile tabs — Posts / Posts and replies / Media.
  return (
    <TabList>
      <TabLink isActive={isActive} to={`/@${acct}`}>
        <FormattedMessage id='account.posts' defaultMessage='Posts' />
      </TabLink>
      <TabLink to={`/@${acct}/with_replies`}>
        <FormattedMessage
          id='account.posts_with_replies'
          defaultMessage='Posts and replies'
        />
      </TabLink>
      <TabLink exact to={`/@${acct}/media`}>
        <FormattedMessage id='account.media' defaultMessage='Media' />
      </TabLink>
    </TabList>
  );
};
