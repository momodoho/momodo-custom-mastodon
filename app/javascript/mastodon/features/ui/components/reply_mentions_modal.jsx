import PropTypes from 'prop-types';
import { useCallback, useEffect } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import ImmutablePropTypes from 'react-immutable-proptypes';
import { useDispatch, useSelector } from 'react-redux';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { fetchAccount } from 'mastodon/actions/accounts';
import { toggleReplyMention, setAllReplyMentions, selectReplyMentions } from 'mastodon/actions/compose';
import { Avatar } from 'mastodon/components/avatar';
import { Button } from 'mastodon/components/button';
import { CheckBox } from 'mastodon/components/check_box';
import { DisplayName } from 'mastodon/components/display_name';
import { IconButton } from 'mastodon/components/icon_button';

const messages = defineMessages({
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
});

const MentionRow = ({ mention }) => {
  const dispatch = useDispatch();
  const id = mention.get('id');
  const acct = mention.get('acct');
  const checked = !!mention.get('checked');
  const account = useSelector(state => (id ? state.getIn(['accounts', id]) : undefined));

  // A mention can point at somebody we have never rendered (e.g. reloading a
  // scheduled reply), so pull the account in for the avatar / display name.
  useEffect(() => {
    if (id && !account) {
      dispatch(fetchAccount(id));
    }
  }, [dispatch, id, account]);

  const handleChange = useCallback(() => {
    dispatch(toggleReplyMention(acct));
  }, [dispatch, acct]);

  return (
    <button
      type='button'
      className='reply-mentions-modal__account'
      onClick={handleChange}
      aria-pressed={checked}
    >
      {account ? (
        <>
          <Avatar account={account} size={36} />
          <div className='reply-mentions-modal__account__name'>
            <DisplayName account={account} />
          </div>
        </>
      ) : (
        <>
          <span className='reply-mentions-modal__account__placeholder' />
          <div className='reply-mentions-modal__account__name'>
            <strong>{mention.get('username') || acct}</strong>
            <span>@{acct}</span>
          </div>
        </>
      )}

      <CheckBox value={acct} checked={checked} />
    </button>
  );
};

MentionRow.propTypes = {
  mention: ImmutablePropTypes.map.isRequired,
};

// momodo: Twitter's "답글을 받는 사람" sheet — pick who actually gets mentioned
// (and notified) by this reply. Everyone can be unchecked; the reply still
// threads under the original post either way.
export const ReplyMentionsModal = ({ onClose }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const mentions = useSelector(selectReplyMentions);

  const allChecked = !!mentions && mentions.size > 0 && mentions.every(mention => mention.get('checked'));

  const handleToggleAll = useCallback(() => {
    dispatch(setAllReplyMentions(!allChecked));
  }, [dispatch, allChecked]);

  return (
    <div className='modal-root__modal dialog-modal reply-mentions-modal'>
      <div className='dialog-modal__header'>
        <IconButton
          className='dialog-modal__header__close'
          title={intl.formatMessage(messages.close)}
          icon='times'
          iconComponent={CloseIcon}
          onClick={onClose}
        />
        <span className='dialog-modal__header__title'>
          <FormattedMessage id='reply_mentions.modal.title' defaultMessage='People in this reply' />
        </span>
      </div>

      <div className='dialog-modal__content'>
        <div className='dialog-modal__content__description'>
          <FormattedMessage
            id='reply_mentions.modal.description'
            defaultMessage='Only the people you check are mentioned and notified. Unchecking everyone still posts the reply in the thread.'
            tagName='p'
          />
        </div>

        <div className='reply-mentions-modal__list'>
          {mentions && mentions.map(mention => (
            <MentionRow key={mention.get('acct')} mention={mention} />
          ))}
        </div>

        <div className='dialog-modal__content__actions'>
          <Button secondary onClick={handleToggleAll}>
            {allChecked ? (
              <FormattedMessage id='reply_mentions.modal.uncheck_all' defaultMessage='Uncheck all' />
            ) : (
              <FormattedMessage id='reply_mentions.modal.check_all' defaultMessage='Check all' />
            )}
          </Button>

          <Button onClick={onClose}>
            <FormattedMessage id='reply_mentions.modal.done' defaultMessage='Done' />
          </Button>
        </div>
      </div>
    </div>
  );
};

ReplyMentionsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};
