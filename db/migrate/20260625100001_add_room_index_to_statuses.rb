# frozen_string_literal: true

class AddRoomIndexToStatuses < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :statuses, [:room_id, :id], order: { id: :desc }, where: 'room_id IS NOT NULL', name: :index_statuses_on_room_id_and_id, algorithm: :concurrently
  end
end
