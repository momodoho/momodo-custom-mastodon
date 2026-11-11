# frozen_string_literal: true

require 'rails_helper'

# momodo: "그룹 공지" — pinned room messages.
RSpec.describe 'Room pins (그룹 공지)' do
  let(:owner) { Fabricate(:user).account }
  let(:alice) { Fabricate(:user).account }
  let(:bob) { Fabricate(:user).account }
  let(:outsider) { Fabricate(:user).account }
  let(:room) { Room.create!(title: 'Test room', account: owner, join_policy: :invite) }

  def token_for(account)
    Fabricate(:accessible_access_token, resource_owner_id: account.user.id, scopes: 'read write')
  end

  def headers_for(account)
    { 'Authorization' => "Bearer #{token_for(account).token}" }
  end

  def post_in_room(account, text = 'hello')
    Fabricate(:status, account: account, room: room, visibility: :limited, text: text)
  end

  def pins_for(account)
    get "/api/v1/rooms/#{room.token}/pins", headers: headers_for(account)
    response.parsed_body
  end

  def pin(account, status)
    post "/api/v1/rooms/#{room.token}/pins", params: { status_id: status.id }, headers: headers_for(account)
  end

  def unpin(account, status)
    delete "/api/v1/rooms/#{room.token}/pins/#{status.id}", headers: headers_for(account)
  end

  before do
    [owner, alice, bob].each { |a| RoomMembership.create!(room: room, account: a) }
  end

  it 'lets any member pin any message, newest pin first, with the pinner' do
    first = post_in_room(bob, 'first')
    second = post_in_room(owner, 'second')

    pin(alice, first)
    expect(response).to have_http_status(200)
    pin(bob, second)

    body = pins_for(owner)
    expect(response).to have_http_status(200)
    expect(body.pluck(:id)).to eq [second.id.to_s, first.id.to_s]
    expect(body.first[:status][:id]).to eq second.id.to_s
    expect(body.last[:pinned_by][:id]).to eq alice.id.to_s
  end

  it 'pins a message only once' do
    status = post_in_room(bob)
    pin(alice, status)
    pin(bob, status)

    expect(response).to have_http_status(200)
    expect(room.pins.count).to eq 1
    expect(room.pins.first.account).to eq alice
  end

  it 'tells members with the room open' do
    status = post_in_room(bob)
    allow(redis).to receive(:publish)

    pin(alice, status)

    expect(redis).to have_received(:publish).with("timeline:room:#{room.token}", a_string_including('room.pins'))
  end

  it 'refuses messages from another room' do
    other = Room.create!(title: 'Elsewhere', account: alice, join_policy: :invite)
    RoomMembership.create!(room: other, account: alice)
    foreign = Fabricate(:status, account: alice, room: other, visibility: :limited)

    pin(alice, foreign)
    expect(response).to have_http_status(404)
  end

  it 'keeps non-members out' do
    status = post_in_room(bob)

    pins_for(outsider)
    expect(response).to have_http_status(403)

    pin(outsider, status)
    expect(response).to have_http_status(403)
  end

  it 'lets the pinner, the author or the owner unpin, but not other members' do
    status = post_in_room(bob)

    pin(alice, status)
    unpin(Fabricate(:user).account.tap { |a| RoomMembership.create!(room: room, account: a) }, status)
    expect(response).to have_http_status(403)

    [alice, bob, owner].each do |who|
      pin(alice, status)
      unpin(who, status)
      expect(response).to have_http_status(200)
      expect(room.pins.count).to eq 0
    end
  end

  it 'drops the notice when the message is deleted' do
    status = post_in_room(bob)
    pin(alice, status)

    status.discard
    expect(pins_for(alice)).to eq []

    status.destroy!
    expect(RoomPin.count).to eq 0
  end

  it 'caps the number of notices per room' do
    stub_const('RoomPin::LIMIT', 2)
    statuses = Array.new(3) { |i| post_in_room(bob, "m#{i}") }

    statuses.first(2).each { |s| pin(alice, s) }
    pin(alice, statuses.last)

    expect(response).to have_http_status(422)
    expect(room.pins.count).to eq 2
  end
end
