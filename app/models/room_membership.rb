# frozen_string_literal: true

# == Schema Information
#
# Table name: room_memberships
#
#  id                  :bigint(8)        not null, primary key
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  account_id          :bigint(8)        not null
#  last_read_status_id :bigint(8)
#  room_id             :bigint(8)        not null
#

class RoomMembership < ApplicationRecord
  belongs_to :room, inverse_of: :memberships
  belongs_to :account

  validates :account_id, uniqueness: { scope: :room_id }

  # momodo: unread badge for group messages.
  #
  # Tokens of the rooms where someone other than `account` posted after the
  # member's read marker. One query, one EXISTS per membership, each served by
  # index_statuses_on_room_id_and_id — cheap enough to poll every few minutes.
  def self.unread_room_tokens_for(account)
    joins(:room)
      .where(account: account)
      .where(<<~SQL.squish, account_id: account.id)
        EXISTS (
          SELECT 1 FROM statuses s
          WHERE s.room_id = room_memberships.room_id
            AND s.id > COALESCE(room_memberships.last_read_status_id, 0)
            AND s.account_id <> :account_id
            AND s.deleted_at IS NULL
        )
      SQL
      .pluck('rooms.token')
  end

  # Move the read marker up to the room's newest status. Only ever forward —
  # two tabs racing can't drag it back.
  def mark_read!
    newest_id = Status.where(room_id: room_id).maximum(:id)
    return if newest_id.nil?

    self.class.where(id: id)
      .where('last_read_status_id IS NULL OR last_read_status_id < ?', newest_id)
      .update_all(last_read_status_id: newest_id)
  end
end
