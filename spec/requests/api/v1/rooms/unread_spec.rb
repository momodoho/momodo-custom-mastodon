# frozen_string_literal: true

require 'rails_helper'

# momodo: group-message unread badge (GET /api/v1/rooms/unread, POST /api/v1/rooms/:id/read).
# The web client polls `unread` on load and every 5 minutes, and calls `read`
# when a room is opened or a live message arrives while it is open.
RSpec.describe 'Room unread badge' do
  let(:alice) { Fabricate(:user).account }
  let(:bob) { Fabricate(:user).account }
  let(:room) { Room.create!(title: 'Test room', account: alice, join_policy: :invite) }

  let(:alice_token) { Fabricate(:accessible_access_token, resource_owner_id: alice.user.id, scopes: 'read write') }
  let(:bob_token) { Fabricate(:accessible_access_token, resource_owner_id: bob.user.id, scopes: 'read write') }

  def unread_for(token)
    get '/api/v1/rooms/unread', headers: { 'Authorization' => "Bearer #{token.token}" }
    expect(response).to have_http_status(200)
    response.parsed_body[:room_ids]
  end

  def mark_read(token, room)
    post "/api/v1/rooms/#{room.token}/read", headers: { 'Authorization' => "Bearer #{token.token}" }
  end

  def post_in_room(account, text = 'hello')
    Fabricate(:status, account: account, room: room, visibility: :limited, text: text)
  end

  before do
    RoomMembership.create!(room: room, account: alice)
    RoomMembership.create!(room: room, account: bob)
  end

  it 'lists a room once someone else posts in it' do
    expect(unread_for(alice_token)).to eq []

    post_in_room(bob)

    expect(unread_for(alice_token)).to eq [room.token]
  end

  it 'ignores my own messages' do
    post_in_room(alice)

    expect(unread_for(alice_token)).to eq []
  end

  it 'clears the room after reading it, until the next message' do
    post_in_room(bob)
    mark_read(alice_token, room)

    expect(response).to have_http_status(200)
    expect(unread_for(alice_token)).to eq []

    post_in_room(bob, 'again')
    expect(unread_for(alice_token)).to eq [room.token]
  end

  it 'never moves the read marker backwards' do
    post_in_room(bob)
    mark_read(alice_token, room)
    newest = room.memberships.find_by(account: alice).last_read_status_id

    mark_read(alice_token, room)
    expect(room.memberships.find_by(account: alice).last_read_status_id).to eq newest
  end

  it 'drops the room again when the unseen message is deleted' do
    status = post_in_room(bob)
    expect(unread_for(alice_token)).to eq [room.token]

    status.discard
    expect(unread_for(alice_token)).to eq []
  end

  it 'does not leak rooms I am not in' do
    other = Room.create!(title: 'Elsewhere', account: bob, join_policy: :invite)
    RoomMembership.create!(room: other, account: bob)
    Fabricate(:status, account: bob, room: other, visibility: :limited)

    expect(unread_for(alice_token)).to_not include(other.token)

    mark_read(alice_token, other)
    expect(response).to have_http_status(403)
  end

  it 'requires a signed-in user' do
    get '/api/v1/rooms/unread'
    expect(response).to have_http_status(401)
  end
end
