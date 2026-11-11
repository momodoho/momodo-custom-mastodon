# frozen_string_literal: true

# == Schema Information
#
# Table name: room_pins
#
#  id         :bigint(8)        not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint(8)
#  room_id    :bigint(8)        not null
#  status_id  :bigint(8)        not null
#

# momodo: "그룹 공지" — a message pinned to the top of a room (KakaoTalk-style
# chat notice). Any member can pin any message of the room; the pinner, the
# message's author and the room owner can take it down.
class RoomPin < ApplicationRecord
  LIMIT = 20

  belongs_to :room
  belongs_to :status
  belongs_to :account, optional: true # pinner (nullified if their account goes)

  validates :status_id, uniqueness: { scope: :room_id }
  validate :status_belongs_to_room, on: :create
  validate :within_limit, on: :create

  # Newest notice first; a message being deleted (soft or hard) drops it.
  scope :visible, -> { joins(:status).merge(Status.kept).order(id: :desc) }

  def removable_by?(account)
    return false if account.nil?

    account_id == account.id || status.account_id == account.id || room.owner?(account)
  end

  private

  def status_belongs_to_room
    errors.add(:status, :invalid) if status.nil? || status.room_id != room_id || status.discarded?
  end

  def within_limit
    errors.add(:base, I18n.t('rooms.pins.limit_reached', count: LIMIT)) if room && RoomPin.where(room: room).count >= LIMIT
  end
end
