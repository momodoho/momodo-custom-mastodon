# frozen_string_literal: true

class REST::ScheduledStatusSerializer < ActiveModel::Serializer
  attributes :id, :scheduled_at, :params

  has_many :media_attachments, serializer: REST::MediaAttachmentSerializer

  def id
    object.id.to_s
  end

  def params
    object.params.merge(
      # momodo: snowflake ids exceed JS Number.MAX_SAFE_INTEGER — send as string
      # (upstream stringifies quoted_status_id but forgot in_reply_to_id)
      in_reply_to_id: object.params['in_reply_to_id']&.to_s,
      quoted_status_id: object.params['quoted_status_id']&.to_s,
      quote_approval_policy: InteractionPolicy::POLICY_FLAGS.keys.find { |key| object.params['quote_approval_policy']&.anybits?(InteractionPolicy::POLICY_FLAGS[key] << 16) }&.to_s || 'nobody'
    )
  end
end
