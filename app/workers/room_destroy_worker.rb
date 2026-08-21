# frozen_string_literal: true

# momodo: background half of DestroyRoomService — deletes a destroyed room's
# posts and finally the room row itself. Access was already revoked inline
# (memberships are gone), so this can take as long as it needs to.
class RoomDestroyWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', lock: :until_executed, lock_ttl: 1.day.to_i

  def perform(room_id)
    room = Room.find(room_id)

    room.memberships.delete_all # belt-and-braces: also covers a retried job
    destroy_statuses!(room)
    room.destroy!
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  # Room posts never entered a home/list feed, were never federated, carry no
  # mentions and are excluded from post counts, so RemoveStatusService has
  # nothing to undo here — only the attached media needs explicit cleanup.
  def destroy_statuses!(room)
    room.statuses.reorder(nil).includes(:media_attachments).find_each do |status|
      status.media_attachments.destroy_all
      status.destroy!
    end
  end
end
