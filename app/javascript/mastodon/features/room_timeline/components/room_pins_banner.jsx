import PropTypes from 'prop-types';
import { useMemo } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { useSelector } from 'react-redux';

import CampaignIcon from '@/material-icons/400-24px/campaign.svg?react';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';
import { Icon } from 'mastodon/components/icon';

const messages = defineMessages({
  label: { id: 'rooms.pins.banner', defaultMessage: 'Notice' },
  photo: { id: 'rooms.pins.photo', defaultMessage: 'Photo' },
  more: { id: 'rooms.pins.more', defaultMessage: '+{count}' },
  open: { id: 'rooms.pins.title', defaultMessage: 'Group notices' },
});

// One plain-text line from the rendered message. DOMParser builds an inert
// document (no image loads, no handlers), and spoilers stay hidden.
const plainText = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('.md-spoiler').forEach((el) => { el.textContent = '▒▒▒'; });
  doc.querySelectorAll('br').forEach((el) => el.replaceWith(' '));
  doc.querySelectorAll('p').forEach((el) => el.append(' '));
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

// momodo: KakaoTalk-style notice strip under the room header — the newest
// 그룹 공지 in one line; tapping it opens the full list.
export const RoomPinsBanner = ({ roomId, onOpen }) => {
  const intl = useIntl();
  const pins = useSelector(state => state.getIn(['room_pins', roomId]));
  const statuses = useSelector(state => state.get('statuses'));

  const visible = useMemo(
    () => (pins ? pins.filter((pin) => statuses.has(pin.get('id'))) : null),
    [pins, statuses],
  );

  const latest = visible && visible.size > 0 ? statuses.get(visible.first().get('id')) : null;

  const text = useMemo(() => {
    if (!latest) {
      return '';
    }

    const fromHtml = plainText(latest.get('contentHtml') || latest.get('content') || '');
    return fromHtml || (latest.get('media_attachments').size > 0 ? intl.formatMessage(messages.photo) : '');
  }, [latest, intl]);

  if (!latest) {
    return null;
  }

  return (
    <button type='button' className='room-pins-banner' onClick={onOpen} title={intl.formatMessage(messages.open)}>
      <Icon id='bullhorn' icon={CampaignIcon} className='room-pins-banner__icon' />
      <span className='room-pins-banner__label'>{intl.formatMessage(messages.label)}</span>
      <span className='room-pins-banner__text'>{text}</span>
      {visible.size > 1 && (
        <span className='room-pins-banner__count'>{intl.formatMessage(messages.more, { count: visible.size - 1 })}</span>
      )}
      <Icon id='chevron-right' icon={ChevronRightIcon} className='room-pins-banner__chevron' />
    </button>
  );
};

RoomPinsBanner.propTypes = {
  roomId: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
};
