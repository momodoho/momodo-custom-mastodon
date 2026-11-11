# frozen_string_literal: true

# momodo: "그룹 공지" — messages pinned to the top of a room.
#   GET    /api/v1/rooms/:room_id/pins             list (newest pin first)
#   POST   /api/v1/rooms/:room_id/pins             pin   { status_id }
#   DELETE /api/v1/rooms/:room_id/pins/:status_id  unpin
# Members only. Any member may pin; the pinner, the message author or the room
# owner may unpin. Members with the room open are told over its stream.
class Api::V1::Rooms::PinsController < Api::BaseController
  include Redisable

  before_action -> { doorkeeper_authorize! :read }, only: [:index]
  before_action -> { doorkeeper_authorize! :write }, except: [:index]

  before_action :require_user!
  before_action :set_room
  before_action :require_member!

  def index
    pins = @room.pins.visible.includes(:account, status: [:account, :media_attachments]).to_a
    render json: pins, each_serializer: REST::RoomPinSerializer,
           relationships: StatusRelationshipsPresenter.new(pins.map(&:status), current_account.id)
  end

  def create
    status = @room.statuses.kept.find(params.require(:status_id))
    pin = @room.pins.find_or_initialize_by(status: status)

    if pin.new_record?
      pin.account = current_account
      # Plain message (no "Validation failed:" prefix) — the web UI shows it as a toast.
      return render json: { error: pin.errors.full_messages.to_sentence }, status: 422 unless pin.save

      broadcast_change!
    end

    render_pin(pin)
  rescue ActiveRecord::RecordNotUnique
    # Two members pinned the same message at the same moment — the other one won.
    render_pin(@room.pins.find_by!(status_id: status.id))
  end

  def destroy
    pin = @room.pins.find_by!(status_id: params[:id])
    raise Mastodon::NotPermittedError unless pin.removable_by?(current_account)

    pin.destroy!
    broadcast_change!
    render_empty
  end

  private

  def render_pin(pin)
    render json: pin, serializer: REST::RoomPinSerializer,
           relationships: StatusRelationshipsPresenter.new([pin.status], current_account.id)
  end

  def set_room
    @room = Room.lookup_by_token!(params[:room_id])
  end

  def require_member!
    raise Mastodon::NotPermittedError unless @room.member?(current_account)
  end

  # Payload is just the room token — clients refetch the (small) list.
  def broadcast_change!
    redis.publish("timeline:room:#{@room.token}", { event: :'room.pins', payload: @room.token }.to_json)
  end
end
