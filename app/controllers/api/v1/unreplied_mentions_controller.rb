# frozen_string_literal: true

# momodo: "답장 안 한 메시지" — among the RECENT_LIMIT most recent statuses that
# mention the current account (others' posts only), return the ones the account
# has not handled yet. "Handled" = directly replied to, favourited, or boosted.
# No pagination by design: the window is capped.
class Api::V1::UnrepliedMentionsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }
  before_action :require_user!

  RECENT_LIMIT = 100

  def index
    @statuses = preload_collection(unreplied_statuses, Status)
    render json: @statuses, each_serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new(@statuses, current_user&.account_id)
  end

  private

  def unreplied_statuses
    recent_ids = Mention.where(account: current_account, silent: false)
                        .joins(:status)
                        .where.not(statuses: { account_id: current_account.id })
                        .order(status_id: :desc)
                        .limit(RECENT_LIMIT)
                        .pluck(:status_id)

    handled_ids  = current_account.statuses.where(in_reply_to_id: recent_ids).reorder(nil).distinct.pluck(:in_reply_to_id)
    handled_ids |= current_account.favourites.where(status_id: recent_ids).pluck(:status_id)
    handled_ids |= current_account.statuses.where(reblog_of_id: recent_ids).reorder(nil).distinct.pluck(:reblog_of_id)

    Status.where(id: recent_ids - handled_ids).order(id: :desc)
  end
end
