// momodo: "답장 안 한 메시지" — among my 100 most recent incoming mentions,
// the ones I have not directly replied to, rendered as real statuses so the
// reply button works right here. Re-fetches on every visit (no pagination —
// the window is capped at 100 server-side).
import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { List as ImmutableList } from 'immutable';

import { useDispatch } from 'react-redux';

import MarkEmailUnreadIcon from '@/material-icons/400-24px/mark_email_unread.svg?react';
import { importFetchedStatuses } from 'mastodon/actions/importer';
import api from 'mastodon/api';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import StatusList from 'mastodon/components/status_list';

const messages = defineMessages({
  heading: { id: 'column.unreplied_mentions', defaultMessage: 'Unreplied messages' },
});

const UnrepliedMentions = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [statusIds, setStatusIds] = useState(null);

  const reload = useCallback(() => {
    api().get('/api/v1/unreplied_mentions')
      .then((response) => {
        dispatch(importFetchedStatuses(response.data));
        setStatusIds(ImmutableList(response.data.map((status) => status.id)));
        return undefined;
      })
      .catch(() => setStatusIds(ImmutableList()));
  }, [dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.heading)}>
      <ColumnHeader
        icon='envelope'
        iconComponent={MarkEmailUnreadIcon}
        title={intl.formatMessage(messages.heading)}
        multiColumn={multiColumn}
        showBackButton
      />

      <StatusList
        trackScroll={!multiColumn}
        statusIds={statusIds || ImmutableList()}
        scrollKey='unreplied_mentions'
        isLoading={statusIds === null}
        bindToDocument={!multiColumn}
        emptyMessage={<FormattedMessage id='unreplied_mentions.empty' defaultMessage='Nothing here — you have replied to all of your recent 100 mentions.' />}
      />

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

UnrepliedMentions.propTypes = {
  multiColumn: PropTypes.bool,
};

// eslint-disable-next-line import/no-default-export
export default UnrepliedMentions;
