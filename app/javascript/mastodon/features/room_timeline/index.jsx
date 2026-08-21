import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { defineMessages, FormattedMessage } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import { Link, withRouter } from 'react-router-dom';

import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';

import { injectIntl } from '@/mastodon/components/intl';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { fetchRoom, fetchRooms, leaveRoom, destroyRoom } from 'mastodon/actions/rooms';
import { Icon } from 'mastodon/components/icon';
import { connectRoomStream } from 'mastodon/actions/streaming';
import { expandRoomTimeline } from 'mastodon/actions/timelines';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import BundleColumnError from 'mastodon/features/ui/components/bundle_column_error';
import StatusListContainer from 'mastodon/features/ui/containers/status_list_container';
import { WithRouterPropTypes } from 'mastodon/utils/react_router';

import { RoomComposer } from './components/room_composer';

const messages = defineMessages({
  leaveTitle: { id: 'rooms.leave.title', defaultMessage: 'Leave room' },
  leaveMessage: { id: 'rooms.leave.message', defaultMessage: 'Leave this room? You will no longer see its messages or be able to post here. Posts you already wrote stay in the room.' },
  leaveConfirm: { id: 'rooms.leave.confirm', defaultMessage: 'Leave' },
  destroyTitle: { id: 'rooms.destroy.title', defaultMessage: 'Leave and delete room' },
  destroyMessage: { id: 'rooms.destroy.message', defaultMessage: 'You own this room, so leaving deletes it. Every member is removed and every message in the room is permanently erased. This cannot be undone.' },
  destroyConfirm: { id: 'rooms.destroy.confirm', defaultMessage: 'Delete room' },
  destroyed: { id: 'rooms.destroyed.title', defaultMessage: 'Room deleted' },
});

const mapStateToProps = (state, props) => ({
  room: state.getIn(['rooms', props.params.id]),
  hasUnread: state.getIn(['timelines', `room:${props.params.id}`, 'unread']) > 0,
});

class RoomTimeline extends PureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    hasUnread: PropTypes.bool,
    multiColumn: PropTypes.bool,
    room: PropTypes.oneOfType([ImmutablePropTypes.map, PropTypes.bool]),
    ...WithRouterPropTypes,
  };

  handleHeaderClick = () => {
    this.column.scrollTop();
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

  setRef = c => {
    this.column = c;
  };

  handleLoadMore = maxId => {
    const { id } = this.props.params;
    this.props.dispatch(expandRoomTimeline(id, { maxId }));
  };


  render () {
    const { hasUnread, intl, multiColumn, room } = this.props;
    const { id } = this.props.params;

    if (typeof room === 'undefined') {
      return (
        <Column>
          <div className='scrollable'>
            <LoadingIndicator />
          </div>
        </Column>
      );
    } else if (room === false) {
      return (
        <BundleColumnError multiColumn={multiColumn} errorType='routing' />
      );
    } else if (room.get('deleted')) {
      // The owner blew the room up while we had it open (or we just did it
      // ourselves) — say so instead of leaving a dead timeline on screen.
      return (
        <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.destroyed)}>
          <ColumnHeader
            icon='users'
            iconComponent={GroupsIcon}
            title={intl.formatMessage(messages.destroyed)}
            multiColumn={multiColumn}
            showBackButton
          />

          <div className='empty-column-indicator'>
            <FormattedMessage id='rooms.destroyed.explanation' defaultMessage='The owner left this room, so the room and all of its messages are gone.' />
            {' '}
            <Link to='/rooms'>
              <FormattedMessage id='rooms.destroyed.back' defaultMessage='Back to group messages' />
            </Link>
          </div>

          <Helmet>
            <title>{intl.formatMessage(messages.destroyed)}</title>
            <meta name='robots' content='noindex' />
          </Helmet>
        </Column>
      );
    }

    const title = room.get('title');

    const isMember = room.get('member');
    const isOwner = room.get('owner');

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={title}>
        <ColumnHeader
          icon='users'
          iconComponent={GroupsIcon}
          active={hasUnread}
          title={title}
          onClick={this.handleHeaderClick}
          multiColumn={multiColumn}
        />

        {(isOwner || isMember) && (
          <div className='room-timeline__manage'>
            {isOwner && (
              <Link to={`/rooms/${id}/members`} className='button'>
                <Icon id='user-plus' icon={PersonAddIcon} />
                <FormattedMessage id='rooms.manage_members' defaultMessage='Invite / manage members' />
              </Link>
            )}

            {/* The owner may leave too — but their exit deletes the room, so
                the button says what it really does. */}
            {isMember && (
              <button type='button' className='button button-secondary' onClick={this.handleLeave}>
                {isOwner ? (
                  <FormattedMessage id='rooms.destroy.action' defaultMessage='Leave and delete room' />
                ) : (
                  <FormattedMessage id='rooms.leave.action' defaultMessage='Leave room' />
                )}
              </button>
            )}
          </div>
        )}

        {isMember && (
          <RoomComposer roomId={id} />
        )}

        <StatusListContainer
          trackScroll
          scrollKey={`room_timeline-${id}`}
          timelineId={`room:${id}`}
          onLoadMore={this.handleLoadMore}
          emptyMessage={<FormattedMessage id='empty_column.room' defaultMessage='No messages in this room yet. When members post, they will appear here in real time.' />}
          bindToDocument={!multiColumn}
        />

        <Helmet>
          <title>{title}</title>
          <meta name='robots' content='noindex' />
        </Helmet>
      </Column>
    );
  }

}

export default withRouter(connect(mapStateToProps)(injectIntl(RoomTimeline)));
