import PropTypes from 'prop-types';
import { useState, useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { useDispatch } from 'react-redux';

import AddPhotoIcon from '@/material-icons/400-24px/add_photo_alternate.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { submitRoomStatus } from 'mastodon/actions/rooms';
import api from 'mastodon/api';
import { Icon } from 'mastodon/components/icon';

const MAX_IMAGES = 4;

const messages = defineMessages({
  placeholder: { id: 'room.compose.placeholder', defaultMessage: 'Message this room…' },
  send: { id: 'room.compose.send', defaultMessage: 'Send' },
  attach: { id: 'room.compose.attach_image', defaultMessage: 'Attach images' },
  remove: { id: 'room.compose.remove_image', defaultMessage: 'Remove image' },
});

// momodo room composer: bare textarea (NO @-mention) + image-only attachments.
// Posts go only to this room (server forces room scope, strips mentions, and
// rejects non-image media).
export const RoomComposer = ({ roomId }) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [media, setMedia] = useState([]); // { id, preview }
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadOne = useCallback(async (file) => {
    const data = new FormData();
    data.append('file', file);
    let { data: m } = await api().post('/api/v2/media', data);
    // 202 = still processing → poll until the URL is ready
    let tries = 0;
    while (!m.url && tries < 10) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await api().get(`/api/v1/media/${m.id}`);
      m = res.data;
      tries += 1;
    }
    return { id: m.id, preview: m.preview_url || m.url };
  }, []);

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';

    const room = MAX_IMAGES - media.length;
    const slice = files.slice(0, room);
    if (slice.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const uploaded = [];
      for (const f of slice) {
        // eslint-disable-next-line no-await-in-loop
        uploaded.push(await uploadOne(f));
      }
      setMedia((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
    } catch {
      // ignore upload errors
    } finally {
      setUploading(false);
    }
  }, [media.length, uploadOne]);

  const handleRemove = useCallback((id) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSubmit = useCallback(() => {
    const value = text.trim();

    if ((value.length === 0 && media.length === 0) || submitting || uploading) {
      return;
    }

    setSubmitting(true);

    dispatch(submitRoomStatus(roomId, value, media.map((m) => m.id)))
      .then(() => {
        setText('');
        setMedia([]);
        return undefined;
      })
      .catch(() => undefined)
      .finally(() => {
        setSubmitting(false);
      });
  }, [text, media, submitting, uploading, dispatch, roomId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSend = !submitting && !uploading && (text.trim().length > 0 || media.length > 0);

  return (
    <div className='room-composer'>
      <textarea
        className='room-composer__textarea'
        placeholder={intl.formatMessage(messages.placeholder)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={submitting}
      />

      <button
        type='button'
        className='room-composer__attach'
        title={intl.formatMessage(messages.attach)}
        onClick={() => fileRef.current?.click()}
        disabled={media.length >= MAX_IMAGES || uploading || submitting}
      >
        <Icon id='image' icon={AddPhotoIcon} />
      </button>

      <button
        type='button'
        className='button room-composer__send'
        onClick={handleSubmit}
        disabled={!canSend}
      >
        {intl.formatMessage(messages.send)}
      </button>

      <input
        ref={fileRef}
        type='file'
        accept='image/*'
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />

      {(media.length > 0 || uploading) && (
        <div className='room-composer__thumbs'>
          {media.map((m) => (
            <span key={m.id} className='room-composer__thumb'>
              <img src={m.preview} alt='' />
              <button
                type='button'
                className='room-composer__thumb__remove'
                title={intl.formatMessage(messages.remove)}
                onClick={() => handleRemove(m.id)}
              >
                <Icon id='times' icon={CloseIcon} />
              </button>
            </span>
          ))}
          {uploading && <span className='room-composer__thumb room-composer__thumb--loading' />}
        </div>
      )}
    </div>
  );
};

RoomComposer.propTypes = {
  roomId: PropTypes.string.isRequired,
};
