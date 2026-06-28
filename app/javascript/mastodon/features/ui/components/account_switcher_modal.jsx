import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import CheckIcon from '@/material-icons/400-24px/check.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import DeleteIcon from '@/material-icons/400-24px/delete.svg?react';
import { Icon } from 'mastodon/components/icon';
import { accountRing } from 'mastodon/initial_state';

const messages = defineMessages({
  title: { id: 'account_switcher.title', defaultMessage: 'Manage accounts' },
  add: { id: 'account_switcher.add', defaultMessage: 'Add an existing account' },
  logoutAll: { id: 'account_switcher.logout_all', defaultMessage: 'Log out of all accounts' },
  remove: { id: 'account_switcher.remove', defaultMessage: 'Remove this account' },
  active: { id: 'account_switcher.active', defaultMessage: 'Active account' },
  removeConfirm: { id: 'account_switcher.remove_confirm', defaultMessage: 'Remove this account from this browser? You will need to log in again to add it back.' },
  logoutAllConfirm: { id: 'account_switcher.logout_all_confirm', defaultMessage: 'Log out of every account on this browser?' },
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
});

const csrfToken = () => document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || '';

const apiRequest = (url, method) => fetch(url, {
  method,
  credentials: 'same-origin',
  headers: {
    'X-CSRF-Token': csrfToken(),
    'X-Requested-With': 'XMLHttpRequest',
  },
});

const AccountSwitcherModal = ({ onClose }) => {
  const intl = useIntl();
  const [accounts, setAccounts] = useState(accountRing || []);
  const [busy, setBusy] = useState(false);

  const handleSwitch = useCallback((account) => () => {
    if (account.active || busy) {
      return;
    }

    setBusy(true);

    apiRequest(`/auth/accounts/switch?id=${encodeURIComponent(account.id)}`, 'POST')
      .then(() => { window.location.href = '/home'; })
      .catch(() => { setBusy(false); });
  }, [busy]);

  const handleKeyDown = useCallback((account) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSwitch(account)();
    }
  }, [handleSwitch]);

  const handleRemove = useCallback((account) => (e) => {
    e.stopPropagation();

    if (busy || !window.confirm(intl.formatMessage(messages.removeConfirm))) {
      return;
    }

    setBusy(true);

    apiRequest(`/auth/accounts/${encodeURIComponent(account.id)}`, 'DELETE')
      .then(() => {
        if (account.active) {
          window.location.href = '/home';
        } else {
          setAccounts((current) => current.filter(a => a.id !== account.id));
          setBusy(false);
        }
      })
      .catch(() => { setBusy(false); });
  }, [busy, intl]);

  const handleAddAccount = useCallback(() => {
    window.location.href = '/auth/sign_in?add=1';
  }, []);

  const handleLogoutAll = useCallback(() => {
    if (busy || !window.confirm(intl.formatMessage(messages.logoutAllConfirm))) {
      return;
    }

    setBusy(true);

    apiRequest('/auth/accounts/all', 'DELETE')
      .then(() => { window.location.href = '/auth/sign_in'; })
      .catch(() => { setBusy(false); });
  }, [busy, intl]);

  return (
    <div className='modal-root__modal account-switcher-modal'>
      <div className='account-switcher-modal__header'>
        <button className='account-switcher-modal__close' onClick={onClose} aria-label={intl.formatMessage(messages.close)}>
          <Icon id='close' icon={CloseIcon} />
        </button>
        <h3>{intl.formatMessage(messages.title)}</h3>
      </div>

      <ul className='account-switcher-modal__list'>
        {accounts.map(account => (
          <li
            key={account.id}
            className={`account-switcher-modal__account${account.active ? ' active' : ''}`}
            role='button'
            tabIndex={0}
            onClick={handleSwitch(account)}
            onKeyDown={handleKeyDown(account)}
          >
            <div className='account-switcher-modal__account__avatar' style={{ backgroundImage: `url(${account.avatar})` }} />

            <div className='account-switcher-modal__account__details'>
              <bdi><strong className='account-switcher-modal__account__display-name'>{account.display_name}</strong></bdi>
              <span className='account-switcher-modal__account__acct'>@{account.acct}</span>
            </div>

            {account.active && (
              <Icon id='check' icon={CheckIcon} className='account-switcher-modal__account__active' title={intl.formatMessage(messages.active)} />
            )}

            <button
              className='account-switcher-modal__account__remove'
              onClick={handleRemove(account)}
              aria-label={intl.formatMessage(messages.remove)}
              title={intl.formatMessage(messages.remove)}
            >
              <Icon id='delete' icon={DeleteIcon} />
            </button>
          </li>
        ))}
      </ul>

      <div className='account-switcher-modal__actions'>
        <button className='account-switcher-modal__button' onClick={handleAddAccount}>
          {intl.formatMessage(messages.add)}
        </button>
        <button className='account-switcher-modal__button account-switcher-modal__button--danger' onClick={handleLogoutAll}>
          {intl.formatMessage(messages.logoutAll)}
        </button>
      </div>
    </div>
  );
};

AccountSwitcherModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AccountSwitcherModal;
