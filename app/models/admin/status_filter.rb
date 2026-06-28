# frozen_string_literal: true

class Admin::StatusFilter
  KEYS = %i(
    media
    visibility
    with_account
    report_id
  ).freeze

  IGNORED_PARAMS = %w(page report_id).freeze

  attr_reader :params

  def initialize(account, params)
    @account = account
    @params  = params
  end

  def results
    # momodo: moderators can review every visibility here (including direct
    # messages), so the base scope is no longer limited to public/unlisted.
    scope = @account.statuses

    params.each do |key, value|
      next if IGNORED_PARAMS.include?(key.to_s)

      scope.merge!(scope_for(key, value.to_s.strip)) if value.present?
    end

    scope
  end

  private

  def scope_for(key, value)
    case key.to_s
    when 'media'
      Status.joins(:media_attachments).merge(@account.media_attachments).group(:id).recent
    when 'visibility'
      visibility_scope_for(value)
    when 'with_account'
      with_account_scope_for(value)
    else
      raise Mastodon::InvalidParameterError, "Unknown filter: #{key}"
    end
  end

  # DM (direct) vs everything else.
  def visibility_scope_for(value)
    case value
    when 'direct'
      Status.where(visibility: :direct)
    when 'not_direct'
      Status.where.not(visibility: :direct)
    else
      raise Mastodon::InvalidParameterError, "Unknown visibility filter: #{value}"
    end
  end

  # Statuses where the given account is mentioned — i.e. what this account said
  # to that person (handy to pull up a DM conversation by counterpart).
  def with_account_scope_for(value)
    target = resolve_account(value)
    return Status.none if target.nil?

    Status.joins(:mentions).where(mentions: { account_id: target.id }).group(:id)
  end

  def resolve_account(value)
    value = value.to_s.strip.delete_prefix('@')
    return if value.blank?
    return Account.find_by(id: value) if value.match?(/\A\d+\z/)

    username, _, domain = value.partition('@')
    domain = nil if domain.blank? || domain.casecmp?(Rails.configuration.x.local_domain.to_s)
    Account.find_remote(username, domain) || Account.find_local(username)
  end
end
