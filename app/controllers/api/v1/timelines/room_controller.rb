# frozen_string_literal: true

class Api::V1::Timelines::RoomController < Api::V1::Timelines::BaseController
  before_action -> { doorkeeper_authorize! :read }
  before_action :require_user!
  before_action :set_room
  before_action :set_statuses

  PERMITTED_PARAMS = %i(limit).freeze

  def show
    render json: @statuses,
           each_serializer: REST::StatusSerializer,
           relationships: StatusRelationshipsPresenter.new(@statuses, current_user.account_id)
  end

  private

  def set_room
    @room = Room.find(params[:id])
    # Live membership check: only current members can read the room timeline.
    raise Mastodon::NotPermittedError unless @room.member?(current_account)
  end

  def set_statuses
    @statuses = preload_collection(room_statuses, Status)
  end

  def room_statuses
    @room.statuses.to_a_paginated_by_id(
      limit_param(DEFAULT_STATUSES_LIMIT),
      params_slice(:max_id, :since_id, :min_id)
    )
  end

  def next_path
    api_v1_timelines_room_url params[:id], next_path_params
  end

  def prev_path
    api_v1_timelines_room_url params[:id], prev_path_params
  end
end
