// momodo: scheduled statuses — clock button + time picker for the compose box.
// Sets compose.scheduled_at (ISO string); the submit action sends it along and
// the backend turns the post into a ScheduledStatus (min. 5 minutes ahead).
import PropTypes from 'prop-types';
import { useCallback, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { useDispatch, useSelector } from 'react-redux';

import Overlay from 'react-overlays/Overlay';

import ScheduleIcon from '@/material-icons/400-24px/schedule.svg?react';
import { changeComposeScheduledAt } from 'mastodon/actions/compose';
import { IconButton } from 'mastodon/components/icon_button';

const messages = defineMessages({
  schedule: { id: 'compose_form.schedule.title', defaultMessage: 'Schedule post' },
  clear: { id: 'compose_form.schedule.clear', defaultMessage: 'Post now (remove schedule)' },
  min_note: { id: 'compose_form.schedule.min_note', defaultMessage: 'At least 5 minutes from now' },
  preset_30m: { id: 'compose_form.schedule.preset_30m', defaultMessage: 'In 30 minutes' },
  preset_1h: { id: 'compose_form.schedule.preset_1h', defaultMessage: 'In 1 hour' },
  preset_3h: { id: 'compose_form.schedule.preset_3h', defaultMessage: 'In 3 hours' },
  preset_1d: { id: 'compose_form.schedule.preset_1d', defaultMessage: 'Tomorrow at this time' },
});

// datetime-local wants a zone-less local string; Date#toISOString is UTC
const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const MINIMUM_OFFSET_MINUTES = 6; // backend requires > 5 minutes ahead

const iconStyle = {
  height: null,
  lineHeight: '27px',
};

export const ScheduleDropdown = ({ disabled }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const scheduledAt = useSelector((state) => state.getIn(['compose', 'scheduled_at']));
  const overlayTargetRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const { value } = e.target;

    dispatch(changeComposeScheduledAt(value ? new Date(value).toISOString() : null));
  }, [dispatch]);

  const handlePreset = useCallback((e) => {
    const minutes = Number(e.currentTarget.getAttribute('data-minutes'));

    dispatch(changeComposeScheduledAt(new Date(Date.now() + (minutes * 60000)).toISOString()));
    setIsOpen(false);
  }, [dispatch]);

  const handleClear = useCallback(() => {
    dispatch(changeComposeScheduledAt(null));
    setIsOpen(false);
  }, [dispatch]);

  const presets = [
    { minutes: 30, text: intl.formatMessage(messages.preset_30m) },
    { minutes: 60, text: intl.formatMessage(messages.preset_1h) },
    { minutes: 180, text: intl.formatMessage(messages.preset_3h) },
    { minutes: 1440, text: intl.formatMessage(messages.preset_1d) },
  ];

  const minValue = toLocalInputValue(new Date(Date.now() + (MINIMUM_OFFSET_MINUTES * 60000)));

  return (
    <div ref={overlayTargetRef}>
      <IconButton
        icon='clock-o'
        iconComponent={ScheduleIcon}
        title={intl.formatMessage(messages.schedule)}
        disabled={disabled}
        onClick={handleToggle}
        expanded={isOpen}
        active={isOpen || !!scheduledAt}
        size={18}
        inverted
        style={iconStyle}
      />

      <Overlay
        show={isOpen}
        offset={[5, 5]}
        placement='bottom'
        flip
        target={overlayTargetRef}
        popperConfig={{ strategy: 'fixed' }}
        onHide={handleClose}
        rootClose
      >
        {({ props, placement }) => (
          <div {...props}>
            <div className={`dropdown-animation privacy-dropdown__dropdown schedule-dropdown ${placement}`}>
              <div className='schedule-dropdown__panel'>
                <input
                  type='datetime-local'
                  className='schedule-dropdown__input'
                  value={scheduledAt ? toLocalInputValue(new Date(scheduledAt)) : ''}
                  min={minValue}
                  onChange={handleInputChange}
                />

                <div className='schedule-dropdown__note'>{intl.formatMessage(messages.min_note)}</div>

                <div className='schedule-dropdown__presets'>
                  {presets.map((preset) => (
                    <button
                      key={preset.minutes}
                      type='button'
                      className='schedule-dropdown__preset'
                      data-minutes={preset.minutes}
                      onClick={handlePreset}
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>

                {scheduledAt && (
                  <button type='button' className='schedule-dropdown__clear' onClick={handleClear}>
                    {intl.formatMessage(messages.clear)}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Overlay>
    </div>
  );
};

ScheduleDropdown.propTypes = {
  disabled: PropTypes.bool,
};
