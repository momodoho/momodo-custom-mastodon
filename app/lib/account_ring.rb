# frozen_string_literal: true

# Manages the multi-account "ring": a browser-bound, signed, HttpOnly cookie
# holding the list of session_ids the current browser is logged into.
#
# Each session_id maps to a SessionActivation -> user -> OAuth access token, so
# the ring re-uses Mastodon's existing per-session machinery untouched. Only the
# *active* session (`_session_id`) sources the token embedded for the SPA.
#
# The cookie is signed, so the client cannot forge it: a session_id can only end
# up in the ring by actually logging into that account on this browser. Works
# with both controller cookie jars (`cookies`) and Warden's (`warden.cookies`).
module AccountRing
  COOKIE = '_session_ids'

  module_function

  def read(cookies)
    JSON.parse(cookies.signed[COOKIE].presence || '[]')
  rescue JSON::ParserError, TypeError
    []
  end

  def write(cookies, ids)
    limit = Rails.configuration.x.max_session_activations
    cookies.signed[COOKIE] = {
      value: ids.uniq.last(limit).to_json,
      expires: 1.year.from_now,
      httponly: true,
      same_site: :lax,
    }
  end

  def add(cookies, id)
    return if id.blank?

    write(cookies, read(cookies) + [id])
  end

  def remove(cookies, id)
    write(cookies, read(cookies) - [id])
  end

  def clear(cookies)
    cookies.delete(COOKIE)
  end
end
