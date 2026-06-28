# frozen_string_literal: true

# == Schema Information
#
# Table name: room_memberships
#
#  id         :bigint(8)        not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint(8)        not null
#  room_id    :bigint(8)        not null
#

class RoomMembership < ApplicationRecord
  belongs_to :room, inverse_of: :memberships
  belongs_to :account

  validates :account_id, uniqueness: { scope: :room_id }
end
