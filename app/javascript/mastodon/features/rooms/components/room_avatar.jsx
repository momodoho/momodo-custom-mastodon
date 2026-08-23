import PropTypes from 'prop-types';

import ImmutablePropTypes from 'react-immutable-proptypes';

// momodo: DM-style room avatar — a single member avatar for 1:1-ish rooms,
// two stacked avatars when there are more people, a placeholder when empty.
export const RoomAvatar = ({ room, size }) => {
  const preview = room.get('members_preview');
  const members = preview ? preview.toArray() : [];
  const count = room.get('members_count') || members.length;

  const style = { width: size, height: size };

  if (members.length === 0) {
    return (
      <span className='room-avatar room-avatar--empty' style={style}>
        {(room.get('title') || '?').trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  if (count <= 2 || members.length === 1) {
    return (
      <span className='room-avatar' style={style}>
        <img src={members[0].get('avatar')} alt='' />
      </span>
    );
  }

  return (
    <span className='room-avatar room-avatar--stack' style={style}>
      <img className='room-avatar__back' src={members[1].get('avatar')} alt='' />
      <img className='room-avatar__front' src={members[0].get('avatar')} alt='' />
    </span>
  );
};

RoomAvatar.propTypes = {
  room: ImmutablePropTypes.map.isRequired,
  size: PropTypes.number,
};

RoomAvatar.defaultProps = {
  size: 48,
};
