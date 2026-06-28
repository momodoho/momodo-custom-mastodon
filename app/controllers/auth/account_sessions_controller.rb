# frozen_string_literal: true

# Manages switching between, and signing out of, the multiple accounts a single
# browser is logged into (the "account ring"). Adding an account is handled by
# the regular login form in `add` mode (see Auth::SessionsController).
class Auth::AccountSessionsController < ApplicationController
  before_action :authenticate_user!

  # Switch the active account to another account already in this browser's ring.
  def switch
    target = ring_session_for(params[:id])

    activate(target) if target&.user

    head :no_content
  end

  # Remove a single account from the ring and revoke its session. If it was the
  # active account, fall back to another account in the ring (or full logout).
  def remove
    target = ring_session_for(params[:id])

    if target
      was_active = target.session_id == current_session&.session_id
      AccountRing.remove(cookies, target.session_id)
      target.destroy! # deactivates the SessionActivation + its access token
      activate_remaining_or_logout if was_active
    end

    head :no_content
  end

  # Sign out of every account in the ring at once.
  def remove_all
    SessionActivation.where(session_id: AccountRing.read(cookies)).destroy_all
    AccountRing.clear(cookies)
    sign_out(current_user)

    head :no_content
  end

  private

  # Resolve a public account id to one of *this browser's* ring sessions. The
  # ring cookie is signed, so only genuinely-authenticated accounts resolve.
  def ring_session_for(account_id)
    ids = AccountRing.read(cookies)
    return if account_id.blank? || ids.blank?

    SessionActivation.where(session_id: ids).includes(user: :account)
                     .find { |session| session.user&.account&.id&.to_s == account_id.to_s }
  end

  def activate(activation)
    # Point the active-session cookie at the target before re-authenticating, so
    # the Warden after_set_user hook keeps the target's existing session/token
    # instead of minting a new one. `auth_id` is the hook's documented fallback.
    cookies.signed['_session_id'] = cookie_options(activation.session_id)
    request.session[:auth_id] = activation.session_id
    sign_in(activation.user, force: true)
  end

  def activate_remaining_or_logout
    next_id      = AccountRing.read(cookies).last
    next_session = next_id && SessionActivation.includes(:user).find_by(session_id: next_id)

    if next_session&.user
      activate(next_session)
    else
      AccountRing.clear(cookies)
      sign_out(current_user)
    end
  end

  def cookie_options(value)
    { value: value, expires: 1.year.from_now, httponly: true, same_site: :lax }
  end
end
