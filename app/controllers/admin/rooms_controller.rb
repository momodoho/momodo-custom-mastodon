# frozen_string_literal: true

require 'csv'

module Admin
  class RoomsController < BaseController
    before_action :set_room, only: [:show, :export, :remove_member]

    def index
      authorize :room, :index?
      @rooms = Room.includes(:account).order(id: :desc).page(params[:page])
    end

    # Operator view of a room's members, with the ability to remove ("퇴장") any
    # member except the owner.
    def show
      authorize @room, :show?
      @memberships = @room.memberships.includes(account: [:account_stat, :user]).reorder(id: :asc)
    end

    # momodo: operator removes a member ("러너") from a room. The member's existing
    # posts stay in the room (other members keep seeing them); the removed account
    # simply loses access on the next live membership check. The owner cannot be
    # removed, which would otherwise strand the room.
    def remove_member
      authorize @room, :remove_member?

      account = Account.find(params[:account_id])

      if @room.owner?(account)
        flash[:alert] = I18n.t('admin.rooms.cannot_remove_owner')
      else
        @room.memberships.where(account_id: account.id).destroy_all
        flash[:notice] = I18n.t('admin.rooms.member_removed', acct: account.acct)
      end

      redirect_to admin_room_path(@room)
    end

    # momodo: export a room's full contents as CSV (operator moderation).
    def export
      authorize @room, :export?
      send_data room_csv(@room), filename: "room-#{@room.id}.csv", type: 'text/csv'
    end

    private

    def set_room
      @room = Room.find(params[:id])
    end

    def room_csv(room)
      CSV.generate(headers: true) do |csv|
        csv << %w(created_at account visibility text)
        room.statuses.includes(:account).reorder(id: :asc).find_each do |status|
          csv << [status.created_at.iso8601, status.account.acct, status.visibility, status.text]
        end
      end
    end
  end
end
