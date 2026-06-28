# frozen_string_literal: true

class MigrateBrandUploadsToPerThemeKeys < ActiveRecord::Migration[8.1]
  # momodo: brand image uploads used to be keyed by color scheme only
  # (logo_light, app_bg_dark, …) and were shared across both themes. They are now
  # keyed per theme × scheme (e.g. logo_birdui_dark). Any existing uploads were
  # made while using the Twitter (bird-ui) theme, so move them into the `birdui`
  # slots; the admin can re-assign them via Admin → Appearance afterwards.
  # No-op on fresh installs (nothing matches). Renames the `var` only — the
  # stored image file is untouched.
  OLD_TO_NEW = {
    'logo_light' => 'logo_birdui_light',
    'logo_dark' => 'logo_birdui_dark',
    'login_bg_light' => 'login_bg_birdui_light',
    'login_bg_dark' => 'login_bg_birdui_dark',
    'app_bg_light' => 'app_bg_birdui_light',
    'app_bg_dark' => 'app_bg_birdui_dark',
  }.freeze

  def up
    rename_vars(OLD_TO_NEW)
  end

  def down
    rename_vars(OLD_TO_NEW.invert)
  end

  private

  def rename_vars(mapping)
    mapping.each do |from, to|
      # Avoid the unique(var) collision if the destination already exists.
      next if SiteUpload.exists?(var: to)

      SiteUpload.where(var: from).update_all(var: to)
      Rails.cache.delete("site_uploads/#{from}")
      Rails.cache.delete("site_uploads/#{to}")
    end
  end
end
