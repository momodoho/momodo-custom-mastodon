import { useEffect } from 'react';

import { useDispatch } from 'react-redux';

import { fetchRoomsUnread } from 'mastodon/actions/rooms';

const CHECK_INTERVAL = 5 * 60 * 1000;

// momodo: keeps the group-message unread badge fresh without loading the
// server. One check when the app loads (against the read markers stored on the
// server, so a reload or another device shows the right state), then one every
// 5 minutes while the tab is visible. A hidden tab skips its checks and catches
// up with a single check as soon as it is shown again, if 5 minutes passed.
// Renders nothing.
export const RoomUnreadPoller = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let lastCheck = 0;
    let timer = null;

    const check = () => {
      lastCheck = Date.now();
      dispatch(fetchRoomsUnread()).catch(() => undefined);
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(tick, CHECK_INTERVAL);
    };

    const tick = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
      schedule();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck >= CHECK_INTERVAL) {
        check();
        schedule();
      }
    };

    check();
    schedule();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dispatch]);

  return null;
};
