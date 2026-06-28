# frozen_string_literal: true

module Status::Visibility
  extend ActiveSupport::Concern

  included do
    enum :visibility,
         { public: 0, unlisted: 1, private: 2, direct: 3, limited: 4 },
         suffix: :visibility,
         validate: true

    scope :distributable_visibility, -> { where(visibility: %i(public unlisted)) }
    scope :list_eligible_visibility, -> { where(visibility: %i(public unlisted private)) }
    scope :not_direct_visibility, -> { where.not(visibility: :direct) }

    validates :visibility, exclusion: { in: %w(direct limited) }, if: :reblog?

    before_validation :set_visibility, unless: :visibility?
  end

  class_methods do
    # momodo: closed community — public posting is disabled (local/unlisted only).
    def selectable_visibilities
      visibilities.keys - %w(direct limited public)
    end
  end

  def hidden?
    !distributable?
  end

  def distributable?
    public_visibility? || unlisted_visibility?
  end

  alias sign? distributable?

  private

  def set_visibility
    self.visibility ||= reblog.visibility if reblog?
    self.visibility ||= visibility_from_account
  end

  def visibility_from_account
    # momodo: default to unlisted (never public) so nothing leaks externally.
    account.locked? ? :private : :unlisted
  end
end
