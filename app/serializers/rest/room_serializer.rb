# frozen_string_literal: true

class REST::RoomSerializer < ActiveModel::Serializer
  attributes :id, :title, :join_policy, :members_count, :owner, :member, :account_id

  def id
    object.id.to_s
  end

  def account_id
    object.account_id.to_s
  end

  def members_count
    object.memberships.size
  end

  def owner
    current_user.present? && object.account_id == current_user.account_id
  end

  def member
    current_user.present? && object.member?(current_user.account)
  end
end
