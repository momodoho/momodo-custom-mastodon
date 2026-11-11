# frozen_string_literal: true

require 'rails_helper'

# momodo: the room owner renames the room (PUT /api/v1/rooms/:id).
RSpec.describe 'Renaming a room' do
  let(:owner) { Fabricate(:user).account }
  let(:member) { Fabricate(:user).account }
  let(:room) { Room.create!(title: 'Old name', account: owner, join_policy: :invite) }

  def rename(account, title)
    token = Fabricate(:accessible_access_token, resource_owner_id: account.user.id, scopes: 'read write')
    put "/api/v1/rooms/#{room.token}", params: { title: title }, headers: { 'Authorization' => "Bearer #{token.token}" }
  end

  before do
    RoomMembership.create!(room: room, account: owner)
    RoomMembership.create!(room: room, account: member)
  end

  it 'lets the owner rename it, trimmed, and tells members with the room open' do
    allow(redis).to receive(:publish)

    rename(owner, '  New name  ')

    expect(response).to have_http_status(200)
    expect(response.parsed_body[:title]).to eq 'New name'
    expect(room.reload.title).to eq 'New name'
    expect(redis).to have_received(:publish).with("timeline:room:#{room.token}", a_string_including('room.update'))
  end

  it 'does not let other members rename it' do
    rename(member, 'Hijacked')

    expect(response).to have_http_status(403)
    expect(room.reload.title).to eq 'Old name'
  end

  it 'refuses a blank or too long name' do
    rename(owner, '   ')
    expect(response).to have_http_status(422)

    rename(owner, 'a' * (Room::TITLE_LENGTH_LIMIT + 1))
    expect(response).to have_http_status(422)

    expect(room.reload.title).to eq 'Old name'
  end
end
