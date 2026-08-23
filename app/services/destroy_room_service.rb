# frozen_string_literal: true

# momodo: "방 폭파" — the room owner leaving destroys the room for everyone.
#
# Membership is what grants access (every check is live: #show, the room
# timeline, posting, and the streaming handshake all re-read room_memberships),
# so wiping the memberships synchronously locks the room down for all members
# the instant the owner leaves — even if the background cleanup is delayed.
# The posts and the room row itself are then removed by RoomDestroyWorker,
# because a busy room can hold far too many posts to delete inside a request.
class DestroyRoomService < BaseService
  include Redisable

  # @param [Room] room
  def call(room)
    @room = room

    @room.memberships.delete_all
    kick_live_members!
    RoomDestroyWorker.perform_async(@room.id)

    @room
  end

  private

  # Anyone with the room column open is watching the room's stream; tell them
  # the room is gone so their client can drop it instead of hanging on a dead
  # channel until the next navigation. Published after the memberships are
  # gone, so a client that reacts by reconnecting is already locked out.
  def kick_live_members!
    redis.publish("timeline:room:#{@room.token}", { event: :'room.destroyed', payload: @room.token }.to_json)
  end
end
