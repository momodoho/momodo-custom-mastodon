# frozen_string_literal: true

# Owner-managed room membership: list members, invite (add), remove.
class Api::V1::Rooms::AccountsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read }, only: [:show]
  before_action -> { doorkeeper_authorize! :write }, except: [:show]

  before_action :require_user!
  before_action :set_room

  after_action :insert_pagination_headers, only: :show

  def show
    raise Mastodon::NotPermittedError unless @room.member?(current_account)

    @accounts = load_accounts
    render json: @accounts, each_serializer: REST::AccountSerializer
  end

  def create
    authorize_owner!
    Account.where(id: account_ids).find_each do |account|
      RoomMembership.find_or_create_by!(room: @room, account: account)
    end
    render_empty
  end

  def destroy
    authorize_owner!
    # The owner cannot be removed from their own room.
    RoomMembership.where(room: @room, account_id: account_ids).where.not(account_id: @room.account_id).destroy_all
    render_empty
  end

  private

  def set_room
    @room = Room.find(params[:room_id])
  end

  def authorize_owner!
    raise Mastodon::NotPermittedError unless @room.owner?(current_account)
  end

  def load_accounts
    if unlimited?
      @room.members.without_suspended.includes(:account_stat, :user).all
    else
      @room.members.without_suspended.includes(:account_stat, :user).paginate_by_max_id(limit_param(DEFAULT_ACCOUNTS_LIMIT), params[:max_id], params[:since_id])
    end
  end

  def unlimited?
    params[:limit] == '0'
  end

  def account_ids
    Array(resource_params[:account_ids])
  end

  def resource_params
    params.permit(account_ids: [])
  end

  def next_path
    return if unlimited?

    api_v1_room_accounts_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    return if unlimited?

    api_v1_room_accounts_url pagination_params(since_id: pagination_since_id) unless @accounts.empty?
  end

  def pagination_collection
    @accounts
  end

  def records_continue?
    @accounts.size == limit_param(DEFAULT_ACCOUNTS_LIMIT)
  end
end
