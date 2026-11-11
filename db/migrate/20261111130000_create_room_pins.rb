# frozen_string_literal: true

# momodo: "그룹 공지" — messages pinned to the top of a room, like a KakaoTalk
# chat-room notice. One row per pinned message; the pinner is kept so they (or
# the message author / room owner) can take it down again. Both foreign keys
# cascade, so deleting the message or blowing up the room drops the notice too.
class CreateRoomPins < ActiveRecord::Migration[8.1]
  def change
    create_table :room_pins do |t|
      t.references :room, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :status, null: false, foreign_key: { on_delete: :cascade }
      t.references :account, null: true, foreign_key: { on_delete: :nullify }
      t.timestamps
    end

    add_index :room_pins, [:room_id, :status_id], unique: true
  end
end
