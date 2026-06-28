# frozen_string_literal: true

# == Schema Information
#
# Table name: rooms
#
#  id          :bigint(8)        not null, primary key
#  join_policy :integer          default("invite"), not null
#  title       :string           default(""), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  account_id  :bigint(8)        not null
#

# momodo: a "room" is a member-only real-time channel. Posts written to a room
# (Status#room_id) are visible only to its current members and only appear in
# that room's timeline — no mentions, no notifications, no public/federated leak.
class Room < ApplicationRecord
  include Paginable

  TITLE_LENGTH_LIMIT = 256
  PER_ACCOUNT_LIMIT = 50

  # momodo: rooms are always invite-only. `open` is kept here for reversibility
  # but is never set (no UI / forced to invite on create — see RoomsController).
  enum :join_policy, { invite: 0, open: 1 }, prefix: :join, validate: true

  belongs_to :account # owner/creator

  has_many :memberships, class_name: 'RoomMembership', inverse_of: :room, dependent: :destroy
  has_many :members, through: :memberships, source: :account
  has_many :statuses, inverse_of: :room, dependent: :nullify

  validates :title, presence: true, length: { maximum: TITLE_LENGTH_LIMIT }

  scope :with_member, ->(account) { joins(:memberships).where(room_memberships: { account_id: account }) }

  # Membership is dynamic: leaving the room immediately revokes read access
  # (visibility is checked live, never frozen into the status at write time).
  def member?(account)
    return false if account.nil?

    memberships.exists?(account_id: account.id)
  end

  def owner?(account)
    account_id == account&.id
  end
end
