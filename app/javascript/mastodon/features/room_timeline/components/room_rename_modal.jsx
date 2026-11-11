import PropTypes from 'prop-types';
import { useCallback, useId, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { useDispatch, useSelector } from 'react-redux';

import { renameRoom } from 'mastodon/actions/rooms';
import { EmojiTextInputField } from 'mastodon/components/form_fields';
import { ConfirmationModal } from 'mastodon/features/ui/components/confirmation_modals';

const messages = defineMessages({
  title: { id: 'rooms.rename.title', defaultMessage: 'Rename room' },
  save: { id: 'rooms.rename.save', defaultMessage: 'Save' },
});

// Same as Room::TITLE_LENGTH_LIMIT on the server.
const MAX_LENGTH = 256;

// momodo: the room owner renames the room. Members see the new name right away
// (the server pushes `room.update` over the room stream).
export const RoomRenameModal = ({ roomId, onClose }) => {
  const intl = useIntl();
  const titleId = useId();
  const dispatch = useDispatch();
  const current = useSelector(state => state.getIn(['rooms', roomId, 'title'])) || '';

  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();
  const invalid = trimmed.length === 0 || value.length > MAX_LENGTH;

  const handleSave = useCallback(() => {
    if (saving || invalid) {
      return;
    }

    if (trimmed === current) {
      onClose();
      return;
    }

    setSaving(true);
    dispatch(renameRoom(roomId, trimmed))
      .then(() => onClose())
      .catch(() => setSaving(false));
  }, [saving, invalid, trimmed, current, dispatch, roomId, onClose]);

  return (
    <ConfirmationModal
      title={intl.formatMessage(messages.title)}
      titleId={titleId}
      confirm={intl.formatMessage(messages.save)}
      onConfirm={handleSave}
      onClose={onClose}
      updating={saving}
      disabled={invalid}
      noCloseOnConfirm
      noFocusButton
    >
      <EmojiTextInputField
        value={value}
        onChange={setValue}
        aria-labelledby={titleId}
        counterMax={MAX_LENGTH}
        label=''
        // eslint-disable-next-line jsx-a11y/no-autofocus -- This is a modal, it's fine.
        autoFocus
      />
    </ConfirmationModal>
  );
};

RoomRenameModal.propTypes = {
  roomId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
