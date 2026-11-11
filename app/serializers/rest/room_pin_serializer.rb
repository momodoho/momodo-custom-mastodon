# frozen_string_literal: true

# momodo: one "그룹 공지" entry — the pinned message, who pinned it and when.
class REST::RoomPinSerializer < ActiveModel::Serializer
  attributes :id, :pinned_at

  belongs_to :status, serializer: REST::StatusSerializer
  belongs_to :account, key: :pinned_by, serializer: REST::AccountSerializer

  # The status id doubles as the notice id (a message is pinned at most once).
  def id
    object.status_id.to_s
  end

  def pinned_at
    object.created_at
  end
end
