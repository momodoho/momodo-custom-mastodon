# frozen_string_literal: true

# momodo: rooms used to be addressed by their sequential primary key
# (`/rooms/34`), which let anyone probe how many rooms exist and enumerate
# them. Public addressing now uses an unguessable random token instead; the
# numeric id stays internal (statuses.room_id, memberships, admin screens).
class AddTokenToRooms < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def up
    add_column :rooms, :token, :string unless column_exists?(:rooms, :token)

    # Backfill in place — every existing room gets a token, and its old
    # numeric URL stops resolving.
    Room.reset_column_information
    Room.where(token: nil).find_each do |room|
      room.update_columns(token: Room.generate_unique_token)
    end

    add_index :rooms, :token, unique: true, algorithm: :concurrently unless index_exists?(:rooms, :token)
    safety_assured { change_column_null :rooms, :token, false }
  end

  def down
    remove_index :rooms, :token if index_exists?(:rooms, :token)
    remove_column :rooms, :token if column_exists?(:rooms, :token)
  end
end
