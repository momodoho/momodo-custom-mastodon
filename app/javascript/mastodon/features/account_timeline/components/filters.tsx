import type { FC } from 'react';

import { useParams } from 'react-router';

import { AccountTabs } from '@/mastodon/components/account_header/tabs';

// momodo: the in-column filter dropdown (All activity / Show replies /
// Show boosts) is removed — the profile tabs drive the filter instead.
// 게시물 tab = public posts + boosts (no replies);
// 게시물과답글 tab = public posts + replies (no boosts).
export const AccountFilters: FC = () => {
  const { acct } = useParams<{ acct: string }>();
  if (!acct) {
    return null;
  }
  return <AccountTabs />;
};
