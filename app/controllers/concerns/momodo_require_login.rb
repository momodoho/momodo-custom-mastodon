# frozen_string_literal: true

# momodo: closed community — anonymous visitors must log in to view any
# user-facing content (profiles, statuses). Only HTML requests are gated;
# ActivityPub/JSON requests pass through so federation keeps working.
module MomodoRequireLogin
  extend ActiveSupport::Concern

  included do
    before_action :momodo_require_login_for_html!
  end

  private

  def momodo_require_login_for_html!
    return if user_signed_in?
    # Let only ActivityPub/JSON (federation) through; gate every other format
    # (HTML, RSS, */* from bots) so anonymous visitors see nothing.
    return if request.format&.to_sym == :json

    redirect_to(new_user_session_path)
  end
end
