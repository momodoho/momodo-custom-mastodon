# frozen_string_literal: true

# momodo: per-member read marker for group messages (rooms). A room counts as
# "has new messages" for a member when someone else posted a status with an id
# above this marker. Status ids are time-ordered snowflakes, so one bigint is
# enough — no timestamps, no per-message read rows.
class AddLastReadStatusIdToRoomMemberships < ActiveRecord::Migration[8.1]
  def up
    add_column :room_memberships, :last_read_status_id, :bigint unless column_exists?(:room_memberships, :last_read_status_id)

    # Existing members start caught up, so deploying this doesn't light the
    # badge for every message ever posted. Memberships created later start at
    # NULL (= nothing read), so being invited to a busy room shows it as new.
    safety_assured do
      execute <<~SQL.squish
        UPDATE room_memberships m
        SET last_read_status_id = s.max_id
        FROM (SELECT room_id, MAX(id) AS max_id FROM statuses WHERE room_id IS NOT NULL GROUP BY room_id) s
        WHERE s.room_id = m.room_id AND m.last_read_status_id IS NULL
      SQL
    end
  end

  def down
    remove_column :room_memberships, :last_read_status_id if column_exists?(:room_memberships, :last_read_status_id)
  end
end
