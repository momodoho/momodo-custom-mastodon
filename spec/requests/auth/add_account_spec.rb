# frozen_string_literal: true

require 'rails_helper'

# momodo: the multi-account "ring" (README §B). Logging in while already signed
# in adds the new account instead of replacing it, and the previous account's
# SessionActivation must survive so it stays switchable.
#
# The 2FA cases are regression coverage for a real breakage: the OTP second step
# is handled by a *prepended* before_action that already calls `sign_in`, so
# `preserve_current_session_for_add!` used to detach that freshly signed-in user
# and Devise failed the request with "invalid e-mail address or password" —
# which broke 2FA login for everyone, ring or not.
RSpec.describe 'Adding an account to the browser ring' do
  let!(:alice) { Fabricate(:user, email: 'alice@example.com', password: 'password-alice', confirmed_at: Time.now.utc) }
  let!(:bob) { Fabricate(:user, email: 'bob@example.com', password: 'password-bob', confirmed_at: Time.now.utc) }

  def sign_in_with(email, password)
    post user_session_path, params: { user: { email: email, password: password } }
  end

  def two_factor_user(email, password)
    Fabricate(:user, email: email, password: password, confirmed_at: Time.now.utc,
                     otp_required_for_login: true, otp_secret: User.generate_otp_secret(32))
  end

  it 'keeps the first account switchable after a second one signs in' do
    sign_in_with(alice.email, 'password-alice')
    expect(response).to redirect_to(root_path)

    alice_sessions = SessionActivation.where(user: alice).pluck(:session_id)
    expect(alice_sessions).to_not be_empty

    sign_in_with(bob.email, 'password-bob')
    expect(response).to redirect_to(root_path)

    get root_path
    expect(controller.current_user).to eq bob
    expect(SessionActivation.where(user: alice).pluck(:session_id)).to match_array(alice_sessions)
  end

  it 'signs in a two-factor account that has no prior session' do
    dave = two_factor_user('dave@example.com', 'password-dave')

    sign_in_with(dave.email, 'password-dave')
    expect(response).to have_http_status(200) # the OTP prompt

    post user_session_path, params: { user: { otp_attempt: dave.reload.current_otp } }
    expect(response).to redirect_to(root_path)

    get root_path
    expect(controller.current_user).to eq dave
  end

  it 'adds a two-factor account on top of an existing session' do
    carol = two_factor_user('carol@example.com', 'password-carol')

    sign_in_with(alice.email, 'password-alice')
    alice_sessions = SessionActivation.where(user: alice).pluck(:session_id)

    sign_in_with(carol.email, 'password-carol')
    expect(response).to have_http_status(200) # the OTP prompt

    post user_session_path, params: { user: { otp_attempt: carol.reload.current_otp } }
    expect(response).to redirect_to(root_path)

    get root_path
    expect(controller.current_user).to eq carol
    expect(SessionActivation.where(user: alice).pluck(:session_id)).to match_array(alice_sessions)
  end
end
