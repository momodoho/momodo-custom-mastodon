import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import { useDispatch, useSelector } from 'react-redux';

import { openModal } from 'mastodon/actions/modal';

// momodo: Twitter-style "Replying to @a @b" line above the compose box.
//
// The mentions are NOT part of the textarea text (see reducers/compose.js), so
// a backspace can't quietly drop someone from the thread — the only way to add
// or remove a recipient is this line, which opens the recipient picker.
export const ReplyMentions = () => {
  const dispatch = useDispatch();
  const mentions = useSelector(state => state.getIn(['compose', 'reply_mentions']));

  const handleClick = useCallback(() => {
    dispatch(openModal({ modalType: 'REPLY_MENTIONS', modalProps: {} }));
  }, [dispatch]);

  if (!mentions || mentions.size === 0) {
    return null;
  }

  const checked = mentions.filter(mention => mention.get('checked'));

  return (
    <button type='button' className='reply-mentions' onClick={handleClick}>
      {checked.size === 0 ? (
        <FormattedMessage id='reply_mentions.none' defaultMessage='Not replying to anyone' />
      ) : (
        <FormattedMessage
          id='reply_mentions.to'
          defaultMessage='Replying to {accounts}'
          values={{
            accounts: (
              <span className='reply-mentions__accounts'>
                {checked.map(mention => `@${mention.get('acct')}`).join(' ')}
              </span>
            ),
          }}
        />
      )}
    </button>
  );
};
