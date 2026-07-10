// momodo: scheduled statuses (예약툿) — chronological list of this account's
// scheduled posts. Cancel deletes; "edit" is delete + load back into the
// compose box (the backend cannot edit a scheduled status's content).
import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { useDispatch } from 'react-redux';

import ScheduleIcon from '@/material-icons/400-24px/schedule.svg?react';
import { loadScheduledStatusCompose } from 'mastodon/actions/compose';
import { importFetchedStatus } from 'mastodon/actions/importer';
import { openModal } from 'mastodon/actions/modal';
import api from 'mastodon/api';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';

const messages = defineMessages({
  heading: { id: 'column.scheduled_statuses', defaultMessage: 'Scheduled posts' },
  cancel: { id: 'scheduled_statuses.cancel', defaultMessage: 'Cancel' },
  edit: { id: 'scheduled_statuses.edit', defaultMessage: 'Edit (re-schedule)' },
  reply: { id: 'scheduled_statuses.reply', defaultMessage: 'Reply' },
  media: { id: 'scheduled_statuses.media', defaultMessage: '{count, plural, one {# attachment} other {# attachments}}' },
  confirmCancelTitle: { id: 'scheduled_statuses.confirm_cancel_title', defaultMessage: 'Cancel scheduled post?' },
  confirmCancelMessage: { id: 'scheduled_statuses.confirm_cancel_message', defaultMessage: 'The post will not be published. This cannot be undone.' },
  confirmCancelButton: { id: 'scheduled_statuses.confirm_cancel_button', defaultMessage: 'Cancel post' },
  confirmEditTitle: { id: 'scheduled_statuses.confirm_edit_title', defaultMessage: 'Edit this scheduled post?' },
  confirmEditMessage: { id: 'scheduled_statuses.confirm_edit_message', defaultMessage: 'The schedule will be cancelled and the content loaded back into the compose box (attachments must be re-added). Post or re-schedule it from there.' },
  confirmEditButton: { id: 'scheduled_statuses.confirm_edit_button', defaultMessage: 'Load into compose box' },
});

const ScheduledStatusItem = ({ item, onCancel, onEdit }) => {
  const intl = useIntl();

  const params = item.params || {};
  const mediaCount = (item.media_attachments || []).length;

  return (
    <div className='scheduled-statuses__item'>
      <div className='scheduled-statuses__item__time'>
        <span>
          {intl.formatDate(item.scheduled_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        {params.in_reply_to_id && (
          <span className='scheduled-statuses__item__reply-chip'>{intl.formatMessage(messages.reply)}</span>
        )}
      </div>

      {params.spoiler_text && (
        <div className='scheduled-statuses__item__meta'>CW: {params.spoiler_text}</div>
      )}

      <div className='scheduled-statuses__item__text'>{params.text}</div>

      {mediaCount > 0 && (
        <div className='scheduled-statuses__item__meta'>
          {intl.formatMessage(messages.media, { count: mediaCount })}
        </div>
      )}

      <div className='scheduled-statuses__item__actions'>
        <button type='button' onClick={onEdit} data-id={item.id}>
          {intl.formatMessage(messages.edit)}
        </button>
        <button type='button' className='danger' onClick={onCancel} data-id={item.id}>
          {intl.formatMessage(messages.cancel)}
        </button>
      </div>
    </div>
  );
};

ScheduledStatusItem.propTypes = {
  item: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

const ScheduledStatuses = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const [items, setItems] = useState(null);

  const reload = useCallback(() => {
    api().get('/api/v1/scheduled_statuses', { params: { limit: 40 } })
      .then((response) => {
        const sorted = [...response.data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
        setItems(sorted);
        return undefined;
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const removeItem = useCallback((id) => {
    return api().delete(`/api/v1/scheduled_statuses/${id}`).then(() => {
      setItems((prev) => (prev || []).filter((item) => item.id !== id));
      return undefined;
    });
  }, []);

  const handleCancel = useCallback((e) => {
    const id = e.currentTarget.getAttribute('data-id');

    dispatch(openModal({
      modalType: 'CONFIRM',
      modalProps: {
        title: intl.formatMessage(messages.confirmCancelTitle),
        message: intl.formatMessage(messages.confirmCancelMessage),
        confirm: intl.formatMessage(messages.confirmCancelButton),
        onConfirm: () => {
          removeItem(id).catch(() => undefined);
        },
      },
    }));
  }, [dispatch, intl, removeItem]);

  const handleEdit = useCallback((e) => {
    const id = e.currentTarget.getAttribute('data-id');
    const item = (items || []).find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    dispatch(openModal({
      modalType: 'CONFIRM',
      modalProps: {
        title: intl.formatMessage(messages.confirmEditTitle),
        message: intl.formatMessage(messages.confirmEditMessage),
        confirm: intl.formatMessage(messages.confirmEditButton),
        onConfirm: () => {
          removeItem(id).then(() => {
            const params = item.params || {};

            // The replied-to status must be in the store BEFORE compose gets
            // in_reply_to, or the reply indicator crashes the app. If the
            // original was deleted meanwhile, drop the reply linkage.
            if (params.in_reply_to_id) {
              return api().get(`/api/v1/statuses/${params.in_reply_to_id}`)
                .then((response) => {
                  dispatch(importFetchedStatus(response.data));
                  dispatch(loadScheduledStatusCompose(params));
                  return undefined;
                })
                .catch(() => {
                  dispatch(loadScheduledStatusCompose({ ...params, in_reply_to_id: null }));
                });
            }

            dispatch(loadScheduledStatusCompose(params));
            return undefined;
          }).catch(() => undefined);
        },
      },
    }));
  }, [dispatch, intl, items, removeItem]);

  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.heading)}>
      <ColumnHeader
        icon='clock-o'
        iconComponent={ScheduleIcon}
        title={intl.formatMessage(messages.heading)}
        multiColumn={multiColumn}
        showBackButton
      />

      {items === null && <LoadingIndicator />}

      {items !== null && items.length === 0 && (
        <div className='scheduled-statuses__empty'>
          <FormattedMessage id='scheduled_statuses.empty' defaultMessage='No scheduled posts yet. Use the clock button in the compose box.' />
        </div>
      )}

      {items !== null && items.map((item) => (
        <ScheduledStatusItem key={item.id} item={item} onCancel={handleCancel} onEdit={handleEdit} />
      ))}

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

ScheduledStatuses.propTypes = {
  multiColumn: PropTypes.bool,
};

// eslint-disable-next-line import/no-default-export
export default ScheduledStatuses;
