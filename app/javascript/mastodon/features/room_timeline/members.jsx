import { useCallback, useState, useEffect } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { useParams, Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { importFetchedAccounts } from 'mastodon/actions/importer';
import { fetchRoom } from 'mastodon/actions/rooms';
import {
  apiGetRoomAccounts,
  apiAddAccountToRoom,
  apiRemoveAccountFromRoom,
} from 'mastodon/api/rooms';
import { Avatar } from 'mastodon/components/avatar';
import { Button } from 'mastodon/components/button';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { ColumnSearchHeader } from 'mastodon/components/column_search_header';
import { DisplayName } from 'mastodon/components/display_name';
import ScrollableList from 'mastodon/components/scrollable_list';
import { useSearchAccounts } from 'mastodon/hooks/useSearchAccounts';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const messages = defineMessages({
  manageMembers: { id: 'column.room_members', defaultMessage: 'Manage room members' },
  placeholder: { id: 'rooms.members.search', defaultMessage: 'Search people to invite' },
  add: { id: 'rooms.members.add', defaultMessage: 'Invite' },
  remove: { id: 'rooms.members.remove', defaultMessage: 'Remove' },
});

// A room member can be anyone (unlike lists, which require following first),
// so adding is a direct invite — no follow step.
const AccountItem = ({ accountId, roomId, isMember, isOwner, onToggle }) => {
  const intl = useIntl();
  const account = useAppSelector((state) => state.accounts.get(accountId));

  const handleClick = useCallback(() => {
    if (isMember) {
      void apiRemoveAccountFromRoom(roomId, accountId);
    } else {
      void apiAddAccountToRoom(roomId, accountId);
    }
    onToggle(accountId);
  }, [roomId, accountId, isMember, onToggle]);

  if (!account) {
    return null;
  }

  return (
    <div className='account'>
      <div className='account__wrapper'>
        <Link className='account__display-name' title={account.acct} to={`/@${account.acct}`}>
          <div className='account__avatar-wrapper'>
            <Avatar account={account} size={36} />
          </div>
          <div className='account__contents'>
            <DisplayName account={account} />
          </div>
        </Link>

        {/* the room owner is always a member and cannot be removed */}
        {!isOwner && (
          <div className='account__relationship'>
            <Button
              text={intl.formatMessage(isMember ? messages.remove : messages.add)}
              secondary={isMember}
              onClick={handleClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const RoomMembers = ({ multiColumn }) => {
  const dispatch = useAppDispatch();
  const { id } = useParams();
  const intl = useIntl();

  const [searching, setSearching] = useState(false);
  const [memberIds, setMemberIds] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [mode, setMode] = useState('remove');

  const room = useAppSelector((state) => state.getIn(['rooms', id]));
  const ownerId = room ? room.get('account_id') : null;

  const {
    accounts: accountsFromSearch,
    isLoading: loadingSearchResults,
    searchAccounts: handleSearch,
  } = useSearchAccounts({
    resetOnInputClear: false,
    onSettled: (value) => { setSearching(value.trim().length > 0); },
  });
  const accountIdsFromSearch = accountsFromSearch.map((item) => item.id);

  useEffect(() => {
    if (id) {
      dispatch(fetchRoom(id));

      void apiGetRoomAccounts(id)
        .then((data) => {
          dispatch(importFetchedAccounts(data));
          setMemberIds(data.map((a) => a.id));
          setLoading(false);
          return '';
        })
        .catch(() => { setLoading(false); });
    }
  }, [dispatch, id]);

  const handleSearchClick = useCallback(() => { setMode('add'); }, []);
  const handleDismissSearchClick = useCallback(() => { setMode('remove'); setSearching(false); }, []);

  const handleToggle = useCallback((accountId) => {
    setMemberIds((prev) => (prev.includes(accountId) ? prev.filter((x) => x !== accountId) : [accountId, ...prev]));
  }, []);

  const displayedAccountIds = mode === 'add' && searching ? accountIdsFromSearch : memberIds;

  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.manageMembers)}>
      <ColumnHeader
        title={intl.formatMessage(messages.manageMembers)}
        icon='users'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <ColumnSearchHeader
        placeholder={intl.formatMessage(messages.placeholder)}
        onBack={handleDismissSearchClick}
        onSubmit={handleSearch}
        onActivate={handleSearchClick}
        active={mode === 'add'}
      />

      <ScrollableList
        scrollKey='room_members'
        trackScroll={!multiColumn}
        bindToDocument={!multiColumn}
        isLoading={loading || loadingSearchResults}
        showLoading={loading && displayedAccountIds.length === 0}
        hasMore={false}
        footer={
          <div className='column-footer'>
            <Link to={`/rooms/${id}`} className='button button--block'>
              <FormattedMessage id='rooms.members.done' defaultMessage='Done' />
            </Link>
          </div>
        }
        emptyMessage={
          mode === 'remove' ? (
            <FormattedMessage id='rooms.members.empty' defaultMessage='Only you so far. Search above to invite people.' tagName='span' />
          ) : (
            <FormattedMessage id='rooms.members.no_results' defaultMessage='No results found.' tagName='span' />
          )
        }
      >
        {displayedAccountIds.map((accountId) => (
          <AccountItem
            key={accountId}
            accountId={accountId}
            roomId={id}
            isOwner={accountId === ownerId}
            isMember={displayedAccountIds === memberIds || memberIds.includes(accountId)}
            onToggle={handleToggle}
          />
        ))}
      </ScrollableList>

      <Helmet>
        <title>{intl.formatMessage(messages.manageMembers)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default RoomMembers;
