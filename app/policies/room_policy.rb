# frozen_string_literal: true

class RoomPolicy < ApplicationPolicy
  def index?
    role.can?(:manage_reports)
  end

  def show?
    index?
  end

  def export?
    index?
  end

  # Removing a member ("러너") is a stronger, user-management action than merely
  # viewing the room, so it requires the manage_users permission.
  def remove_member?
    role.can?(:manage_users)
  end
end
