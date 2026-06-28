# frozen_string_literal: true

class Api::V1::RoomsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:index, :show]
  before_action -> { doorkeeper_authorize! :write }, except: [:index, :show]

  before_action :require_user!
  before_action :set_room, except: [:index, :create]

  def index
    @rooms = Room.with_member(current_account).order(id: :desc)
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

  # Any member may leave on their own. The owner cannot (it would strand the
  # room with no manager); they keep the room or it must be removed by an admin.
  def leave
    raise Mastodon::NotPermittedError if @room.owner?(current_account)

    @room.memberships.find_by(account: current_account)&.destroy
    render json: @room, serializer: REST::RoomSerializer
  end

  private

  def set_room
    @room = Room.find(params[:id])
  end

  def authorize_owner!
    raise Mastodon::NotPermittedError unless @room.owner?(current_account)
  end

  def room_params
    params.permit(:title)
  end
end
