# frozen_string_literal: true

# momodo: real-time member-only "rooms" (Twitter-circle-style channels).
# A room is a channel: a status bound to a room (statuses.room_id) is visible
# only to that room's current members, and only appears in that room's timeline.
class CreateRooms < ActiveRecord::Migration[8.1]
  def change
    create_table :rooms do |t|
      t.string :title, null: false, default: ''
      t.references :account, null: false, foreign_key: { on_delete: :cascade } # owner/creator
      t.integer :join_policy, null: false, default: 0 # 0 = invite, 1 = open
      t.timestamps
    end

    create_table :room_memberships do |t|
      t.references :room, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.timestamps
    end

    add_index :room_memberships, [:room_id, :account_id], unique: true

    # Nullable column add is safe; the supporting index is added concurrently
    # in the next migration. No FK on statuses (consistent with Mastodon, which
    # omits FKs on the hot statuses table); cleanup handled at the model layer.
    add_column :statuses, :room_id, :bigint, null: true
  end
end
