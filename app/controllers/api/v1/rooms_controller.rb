# frozen_string_literal: true

class Api::V1::RoomsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write }, except: [:index, :show]

  before_action :require_user!
  before_action :set_room, except: [:index, :create]

  def index
    # momodo: newest activity first (DM-style list)
    @rooms = Room.with_member(current_account).preload(:memberships).to_a.sort_by { |r| -(r.statuses.reorder(id: :desc).pick(:id) || r.id) }
    render json: @rooms, each_serializer: REST::RoomSerializer
  end

  def show
    raise Mastodon::NotPermittedError unless @room.member?(current_account) || @room.join_open?

    render json: @room, serializer: REST::RoomSerializer
  end

  def create
    # momodo: rooms are always invite-only. The "open" join policy was removed
    # (open rooms had no discovery UI, so they were unusable). The `open` enum
    # value is kept in the model for reversibility but is never set here.
    @room = Room.create!(room_params.merge(account: current_account, join_policy: :invite))
    RoomMembership.create!(room: @room, account: current_account) # owner is always a member
    render json: @room, serializer: REST::RoomSerializer
  end

  def update
    authorize_owner!
    @room.update!(room_params)
    render json: @room, serializer: REST::RoomSerializer
  end

  # Open rooms: anyone may join themselves. Invite rooms: only existing members
  # (added by the owner) — a non-member cannot self-join an invite room.
  def join
    raise Mastodon::NotPermittedError unless @room.join_open? || @room.member?(current_account)

    RoomMembership.find_or_create_by!(room: @room, account: current_account)
    render json: @room, serializer: REST::RoomSerializer
  end

  # Any member may leave on their own. The owner leaving is special: a room
  # cannot outlive its manager, so the owner walking out destroys ("폭파") the
  # room for everyone instead of stranding it — see #destroy.
  def leave
    return destroy_room! if @room.owner?(current_account)

    @room.memberships.find_by(account: current_account)&.destroy
    render json: @room, serializer: REST::RoomSerializer
  end

  # Explicit "blow up the room" for clients that want to say so out loud.
  # Same effect as the owner leaving.
  def destroy
    authorize_owner!
    destroy_room!
  end

  private

  def destroy_room!
    DestroyRoomService.new.call(@room)
    render json: @room, serializer: REST::RoomSerializer
  end

  def set_room
    @room = Room.lookup_by_token!(params[:id])
  end

  def authorize_owner!
    raise Mastodon::NotPermittedError unless @room.owner?(current_account)
  end

  def room_params
    params.permit(:title)
  end
end
