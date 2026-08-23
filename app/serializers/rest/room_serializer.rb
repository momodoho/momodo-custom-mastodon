# frozen_string_literal: true

class REST::RoomSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :id, :title, :join_policy, :members_count, :owner, :member, :account_id,
             :last_message, :members_preview

  MEMBERS_PREVIEW_LIMIT = 4

  # paired markers only — a lone "~~~" or "**" stays as typed
  MARKDOWN_PAIRS = [/```(?:[a-zA-Z0-9+#-]{1,20}\n)?(.+?)```/m, /`([^`\n]+?)`/, /\*\*\*(.+?)\*\*\*/, /\*\*(.+?)\*\*/, /__(.+?)__/, /~~(.+?)~~/, /\|\|(.+?)\|\|/, /(?<![\w*])\*([^*\n]+?)\*(?![\w*])/, /(?<![\w_])_([^_\n]+?)_(?![\w_])/].freeze

  # momodo: the public id IS the random token — the numeric primary key never
  # leaves the server, so rooms can't be enumerated by URL.
  def id
    object.token
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

  # momodo: Twitter-DM-style room list needs a snippet of the newest message.
  # Text only (HTML stripped) — the full status is fetched by the room timeline.
  def last_message
    status = object.statuses.reorder(id: :desc).includes(:account, :media_attachments).first
    return nil if status.nil?

    {
      id: status.id.to_s,
      created_at: status.created_at,
      text: snippet_for(status),
      account: {
        id: status.account_id.to_s,
        acct: status.account.acct,
        display_name: status.account.display_name.presence || status.account.username,
        avatar: full_asset_url(status.account.avatar_static_url),
      },
    }
  end

  # momodo: a few member avatars (other than the viewer, when possible) so the
  # list can draw a stacked "group" avatar like a DM client does.
  def members_preview
    scope = object.members.reorder(nil).limit(MEMBERS_PREVIEW_LIMIT + 1).to_a
    viewer_id = current_user&.account_id
    others, me = scope.partition { |a| a.id != viewer_id }
    (others + me).first(MEMBERS_PREVIEW_LIMIT).map do |account|
      {
        id: account.id.to_s,
        acct: account.acct,
        display_name: account.display_name.presence || account.username,
        avatar: full_asset_url(account.avatar_static_url),
      }
    end
  end

  private

  def snippet_for(status)
    # Drop the Discord-style markdown markers (**bold**, ||spoiler||, …) so the
    # preview reads like plain text.
    text = ActionController::Base.helpers.strip_tags(status.text.to_s)
    MARKDOWN_PAIRS.each { |re| text = text.gsub(re, '\\1') }
    text = text.squish
    return text if text.present?
    return I18n.t('rooms.snippet.image', count: status.media_attachments.size) if status.media_attachments.any?

    ''
  end
end
