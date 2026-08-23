import PropTypes from 'prop-types';
import { useState } from 'react';

import classNames from 'classnames';

import { RoomList } from './room_list';

// momodo: Twitter-DM-style two-pane shell. Wide screens show the chat list
// beside the open conversation; narrow screens show one pane at a time
// (`/rooms` = list, `/rooms/:id` = conversation).
export const RoomsShell = ({ activeId, children, pane }) => {
  const [creating, setCreating] = useState(false);

  return (
    <div className={classNames('column rooms-shell', `rooms-shell--${pane}`)} role='region'>
      <aside className='rooms-shell__list'>
        <RoomList activeId={activeId} creating={creating} onCreatingChange={setCreating} />
      </aside>
      <section className='rooms-shell__main'>
        {children}
      </section>
    </div>
  );
};

RoomsShell.propTypes = {
  activeId: PropTypes.string,
  children: PropTypes.node,
  pane: PropTypes.oneOf(['list', 'chat']).isRequired,
};
