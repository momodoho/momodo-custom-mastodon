// momodo: Discord-style text effects — formatting dropdown for the compose box.
// Picking an item inserts the markdown command at the cursor (or wraps the
// current selection). Modeled on privacy_dropdown.
import PropTypes from 'prop-types';
import { useCallback, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import Overlay from 'react-overlays/Overlay';

import CodeIcon from '@/material-icons/400-24px/code.svg?react';
import FormatBoldIcon from '@/material-icons/400-24px/format_bold.svg?react';
import FormatItalicIcon from '@/material-icons/400-24px/format_italic.svg?react';
import FormatStrikethroughIcon from '@/material-icons/400-24px/format_strikethrough.svg?react';
import FormatUnderlinedIcon from '@/material-icons/400-24px/format_underlined.svg?react';
import TextFormatIcon from '@/material-icons/400-24px/text_format.svg?react';
import VisibilityOffIcon from '@/material-icons/400-24px/visibility_off.svg?react';
import { DropdownSelector } from 'mastodon/components/dropdown_selector';
import { IconButton } from 'mastodon/components/icon_button';

const messages = defineMessages({
  format: { id: 'compose_form.format.title', defaultMessage: 'Text formatting' },
  bold: { id: 'compose_form.format.bold', defaultMessage: 'Bold' },
  italic: { id: 'compose_form.format.italic', defaultMessage: 'Italic' },
  underline: { id: 'compose_form.format.underline', defaultMessage: 'Underline' },
  strikethrough: { id: 'compose_form.format.strikethrough', defaultMessage: 'Strikethrough' },
  spoiler: { id: 'compose_form.format.spoiler', defaultMessage: 'Spoiler' },
  spoiler_meta: { id: 'compose_form.format.spoiler_meta', defaultMessage: 'Hidden until clicked' },
  code: { id: 'compose_form.format.code', defaultMessage: 'Code' },
  codeblock: { id: 'compose_form.format.codeblock', defaultMessage: 'Code block' },
});

const FORMAT_SYNTAX = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '*', suffix: '*' },
  underline: { prefix: '__', suffix: '__' },
  strikethrough: { prefix: '~~', suffix: '~~' },
  spoiler: { prefix: '||', suffix: '||' },
  code: { prefix: '`', suffix: '`' },
  codeblock: { prefix: '```\n', suffix: '\n```' },
};

const iconStyle = {
  height: null,
  lineHeight: '27px',
};

export const FormatDropdown = ({ onSelect, disabled }) => {
  const intl = useIntl();
  const overlayTargetRef = useRef(null);
  const previousFocusTargetRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    if (isOpen && previousFocusTargetRef.current) {
      previousFocusTargetRef.current.focus({ preventScroll: true });
    }
    setIsOpen(false);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  }, [handleClose, isOpen]);

  const registerPreviousFocusTarget = useCallback(() => {
    if (!isOpen) {
      previousFocusTargetRef.current = document.activeElement;
    }
  }, [isOpen]);

  const handleChange = useCallback((value) => {
    const syntax = FORMAT_SYNTAX[value];

    if (syntax) {
      onSelect(syntax.prefix, syntax.suffix);
    }
  }, [onSelect]);

  const options = [
    { value: 'bold', icon: 'bold', iconComponent: FormatBoldIcon, text: intl.formatMessage(messages.bold), meta: '**텍스트**' },
    { value: 'italic', icon: 'italic', iconComponent: FormatItalicIcon, text: intl.formatMessage(messages.italic), meta: '*텍스트*' },
    { value: 'underline', icon: 'underline', iconComponent: FormatUnderlinedIcon, text: intl.formatMessage(messages.underline), meta: '__텍스트__' },
    { value: 'strikethrough', icon: 'strikethrough', iconComponent: FormatStrikethroughIcon, text: intl.formatMessage(messages.strikethrough), meta: '~~텍스트~~' },
    { value: 'spoiler', icon: 'eye-slash', iconComponent: VisibilityOffIcon, text: intl.formatMessage(messages.spoiler), meta: `||텍스트|| — ${intl.formatMessage(messages.spoiler_meta)}` },
    { value: 'code', icon: 'code', iconComponent: CodeIcon, text: intl.formatMessage(messages.code), meta: '`코드`' },
    { value: 'codeblock', icon: 'code', iconComponent: CodeIcon, text: intl.formatMessage(messages.codeblock), meta: '```여러 줄```' },
  ];

  return (
    <div ref={overlayTargetRef}>
      <IconButton
        icon='text-format'
        iconComponent={TextFormatIcon}
        title={intl.formatMessage(messages.format)}
        disabled={disabled}
        onClick={handleToggle}
        onMouseDown={registerPreviousFocusTarget}
        expanded={isOpen}
        active={isOpen}
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
      >
        {({ props, placement }) => (
          <div {...props}>
            <div className={`dropdown-animation privacy-dropdown__dropdown ${placement}`}>
              <DropdownSelector
                items={options}
                value=''
                onClose={handleClose}
                onChange={handleChange}
              />
            </div>
          </div>
        )}
      </Overlay>
    </div>
  );
};

FormatDropdown.propTypes = {
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
