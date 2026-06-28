import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useLocation } from 'react-router';

interface AccountTimelineContextValue {
  accountId: string | null;
  boosts: boolean;
  replies: boolean;
  showAllPinned: boolean;
  setBoosts: (value: boolean) => void;
  setReplies: (value: boolean) => void;
  onShowAllPinned: () => void;
}

export const AccountTimelineContext =
  createContext<AccountTimelineContextValue | null>(null);

export function useAccountContext() {
  const values = useContext(AccountTimelineContext);
  if (!values) {
    throw new Error(
      'useAccountFilters must be used within an AccountTimelineProvider',
    );
  }
  return values;
}

export const useAccountContextValue = (accountId?: string | null) => {
  const { pathname } = useLocation();

  // momodo: the profile tabs drive the filter (no dropdown).
  //   게시물        (/@acct)              → public posts + boosts, no replies
  //   게시물과답글  (/@acct/with_replies) → public posts + replies, no boosts
  const withReplies = pathname.endsWith('/with_replies');
  const boosts = !withReplies;
  const replies = withReplies;

  // Filtering is controlled by the tabs, so the setters are no-ops.
  const noop = useCallback((_value: boolean) => {
    // intentionally empty
  }, []);

  const [showAllPinned, setShowAllPinned] = useState(false);
  const handleShowAllPinned = useCallback(() => {
    setShowAllPinned(true);
  }, []);

  // Memoize the context value to avoid unnecessary re-renders.
  return useMemo(
    () => ({
      accountId: accountId ?? null,
      boosts,
      replies,
      showAllPinned,
      setBoosts: noop,
      setReplies: noop,
      onShowAllPinned: handleShowAllPinned,
    }),
    [accountId, boosts, replies, showAllPinned, noop, handleShowAllPinned],
  );
};
