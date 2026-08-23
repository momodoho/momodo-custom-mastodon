import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { defineMessages, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import { Link, withRouter } from 'react-router-dom';

import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';

import { injectIntl } from '@/mastodon/components/intl';
import ArrowBackIcon from '@/material-icons/400-24px/arrow_back.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import LogoutIcon from '@/material-icons/400-24px/logout.svg?react';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { fetchRoom, fetchRooms, leaveRoom, destroyRoom } from 'mastodon/actions/rooms';
import { Icon } from 'mastodon/components/icon';
import { connectRoomStream } from 'mastodon/actions/streaming';
import { expandRoomTimeline } from 'mastodon/actions/timelines';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import { RoomAvatar } from 'mastodon/features/rooms/components/room_avatar';
import { RoomsShell } from 'mastodon/features/rooms/components/rooms_shell';
import BundleColumnError from 'mastodon/features/ui/components/bundle_column_error';
import { WithRouterPropTypes } from 'mastodon/utils/react_router';

import { RoomChat } from './components/room_chat';
import { RoomComposer } from './components/room_composer';

const messages = defineMessages({
  leaveTitle: { id: 'rooms.leave.title', defaultMessage: 'Leave room' },
  leaveMessage: { id: 'rooms.leave.message', defaultMessage: 'Leave this room? You will no longer see its messages or be able to post here. Posts you already wrote stay in the room.' },
  leaveConfirm: { id: 'rooms.leave.confirm', defaultMessage: 'Leave' },
  destroyTitle: { id: 'rooms.destroy.title', defaultMessage: 'Leave and delete room' },
  destroyMessage: { id: 'rooms.destroy.message', defaultMessage: 'You own this room, so leaving deletes it. Every member is removed and every message in the room is permanently erased. This cannot be undone.' },
  destroyConfirm: { id: 'rooms.destroy.confirm', defaultMessage: 'Delete room' },
  destroyed: { id: 'rooms.destroyed.title', defaultMessage: 'Room deleted' },
  back: { id: 'rooms.back', defaultMessage: 'Back' },
  manage: { id: 'rooms.manage_members', defaultMessage: 'Invite / manage members' },
  leave: { id: 'rooms.leave.action', defaultMessage: 'Leave room' },
  destroy: { id: 'rooms.destroy.action', defaultMessage: 'Leave and delete room' },
});

const mapStateToProps = (state, props) => ({
  room: state.getIn(['rooms', props.params.id]),
});

class RoomTimeline extends PureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    room: PropTypes.oneOfType([ImmutablePropTypes.map, PropTypes.bool]),
    ...WithRouterPropTypes,
  };

  handleLeave = () => {
    const { dispatch, history, intl, room } = this.props;
    const { id } = this.props.params;

    // The owner cannot walk out and leave the room behind: their exit blows it
    // up, so they get a heavier warning and a different confirm label.
    const isOwner = !!(room && room.get && room.get('owner'));

    dispatch(openModal({
      modalType: 'CONFIRM',
      modalProps: {
        title: intl.formatMessage(isOwner ? messages.destroyTitle : messages.leaveTitle),
        message: intl.formatMessage(isOwner ? messages.destroyMessage : messages.leaveMessage),
        confirm: intl.formatMessage(isOwner ? messages.destroyConfirm : messages.leaveConfirm),
        onConfirm: () => {
          dispatch(isOwner ? destroyRoom(id) : leaveRoom(id))
            .then(() => {
              dispatch(fetchRooms());
              history.push('/rooms');
              return '';
            })
            .catch(() => {});
        },
      },
    }));
  };

  componentDidMount () {
    const { dispatch } = this.props;
    const { id } = this.props.params;

    dispatch(fetchRoom(id));
    dispatch(expandRoomTimeline(id));

    this.disconnect = dispatch(connectRoomStream(id));
  }

  componentDidUpdate (prevProps) {
    const { dispatch, params: { id } } = this.props;

    if (id !== prevProps.params.id) {
      if (this.disconnect) {
        this.disconnect();
        this.disconnect = null;
      }

      dispatch(fetchRoom(id));
      dispatch(expandRoomTimeline(id));

      this.disconnect = dispatch(connectRoomStream(id));
    }
  }

  componentWillUnmount () {
    if (this.disconnect) {
      this.disconnect();
      this.disconnect = null;
    }
  }

  handleLoadMore = maxId => {
    const { id } = this.props.params;
    this.props.dispatch(expandRoomTimeline(id, { maxId }));
  };


  render () {
    const { intl, room } = this.props;
    const { id } = this.props.params;

    if (typeof room === 'undefined') {
      return (
        <RoomsShell pane='chat' activeId={id}>
          <div className='room-chat__loading'><LoadingIndicator /></div>
        </RoomsShell>
      );
    } else if (room === false) {
      return (
        <BundleColumnError errorType='routing' />
      );
    } else if (room.get('deleted')) {
      // The owner blew the room up while we had it open (or we just did it
      // ourselves) — say so instead of leaving a dead timeline on screen.
      return (
        <RoomsShell pane='chat' activeId={id}>
          <div className='rooms-placeholder'>
            <div className='rooms-placeholder__icon'><Icon id='users' icon={GroupsIcon} /></div>
            <h2>{intl.formatMessage(messages.destroyed)}</h2>
            <p>
              <FormattedMessage id='rooms.destroyed.explanation' defaultMessage='The owner left this room, so the room and all of its messages are gone.' />
            </p>
            <Link to='/rooms' className='button rooms-placeholder__button'>
              <FormattedMessage id='rooms.destroyed.back' defaultMessage='Back to group messages' />
            </Link>
          </div>

          <Helmet>
            <title>{intl.formatMessage(messages.destroyed)}</title>
            <meta name='robots' content='noindex' />
          </Helmet>
        </RoomsShell>
      );
    }

    const title = room.get('title');
    const isMember = room.get('member');
    const isOwner = room.get('owner');

    return (
      <RoomsShell pane='chat' activeId={id}>
        <div className='room-pane'>
          <header className='room-pane__header'>
            <Link to='/rooms' className='room-pane__back' title={intl.formatMessage(messages.back)} aria-label={intl.formatMessage(messages.back)}>
              <Icon id='arrow-left' icon={ArrowBackIcon} />
            </Link>

            <RoomAvatar room={room} size={40} />

            <div className='room-pane__title'>
              <h2>{title}</h2>
              <span className='room-pane__subtitle'>
                <FormattedMessage
                  id='rooms.members_count'
                  defaultMessage='{count, plural, one {# member} other {# members}}'
                  values={{ count: room.get('members_count') }}
                />
              </span>
            </div>

            <div className='room-pane__actions'>
              {isOwner && (
                <Link to={`/rooms/${id}/members`} className='room-pane__action' title={intl.formatMessage(messages.manage)} aria-label={intl.formatMessage(messages.manage)}>
                  <Icon id='user-plus' icon={PersonAddIcon} />
                </Link>
              )}
              {isMember && (
                <button
                  type='button'
                  className='room-pane__action room-pane__action--danger'
                  title={intl.formatMessage(isOwner ? messages.destroy : messages.leave)}
                  aria-label={intl.formatMessage(isOwner ? messages.destroy : messages.leave)}
                  onClick={this.handleLeave}
                >
                  <Icon id='sign-out' icon={LogoutIcon} />
                </button>
              )}
            </div>
          </header>

          <RoomChat roomId={id} onLoadMore={this.handleLoadMore} />

          {isMember && <RoomComposer roomId={id} />}
        </div>

        <Helmet>
          <title>{title}</title>
          <meta name='robots' content='noindex' />
        </Helmet>
      </RoomsShell>
    );
  }

}

export default withRouter(connect(mapStateToProps)(injectIntl(RoomTimeline)));
