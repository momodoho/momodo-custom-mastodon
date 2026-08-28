# frozen_string_literal: true

# momodo: injects the admin-uploaded brand logo + backgrounds as a <style> block.
# Uploads are scoped *per theme* (마스토돈 = default / 트위터 = birdui) AND per color
# scheme (light/dark): only the active theme's images are emitted, and each scheme
# uses its own upload with NO cross-scheme fallback (a missing slot shows the
# default Mastodon asset). The custom logo is handled two ways: server-rendered
# pages (login, admin) via the CSS below; the React app via initial_state (see
# components/logo.tsx, which is also fed the active theme's logo).
module BrandingOverridesHelper
  def momodo_branding_styles
    css = +''
    css << momodo_color_css
    css << momodo_logo_css

    if user_signed_in?
      bg = momodo_background_css('body', brand_key(:app_bg, :light), brand_key(:app_bg, :dark))
      css << bg
      # When an app background is set, make the timeline column translucent so the
      # background shows through (inner surfaces transparent to avoid compounding).
      css << timeline_opacity_rules if bg.present?
    else
      css << momodo_background_css('body', brand_key(:login_bg, :light), brand_key(:login_bg, :dark))
    end

    return if css.blank?

    # The nonce is required or Mastodon's CSP blocks the inline <style>.
    content_tag(:style, css.html_safe, nonce: request.content_security_policy_nonce) # rubocop:disable Rails/OutputSafety
  end

  private

  # momodo: admin-set brand colors for the ACTIVE theme, one block per color
  # scheme. Both the Mastodon design tokens and the Bird UI variables are
  # written, because the two themes read different names for the same thing
  # (Bird UI derives links from --color-accent, so the link slot has to
  # overwrite the leaf variables too, or a custom button color would drag the
  # mention color along with it).
  #
  # The theme stylesheets declare their variables on the <html> element
  # (`:root, [data-color-scheme=...]`), so these rules must target the same
  # element and win with !important — a lower-specificity rule elsewhere in the
  # tree would simply be ignored for inheritance.
  def momodo_color_css
    %w(light dark).filter_map { |scheme| color_scheme_rules(scheme) }.join
  end

  def color_scheme_rules(scheme)
    brand = brand_color(:brand, scheme)
    brand_text = brand_color(:brand_text, scheme)
    link = brand_color(:link, scheme)

    return if brand.blank? && brand_text.blank? && link.blank?

    declarations = +''

    if brand.present?
      declarations << <<~CSS
        --color-bg-brand-base: #{brand} !important;
        --color-bg-brand-base-hover: color-mix(in srgb, #{brand} 85%, #000) !important;
        --color-border-brand: #{brand} !important;
        --color-accent: #{brand} !important;
        --color-accent-dark: #{brand} !important;
      CSS
    end

    if brand_text.present?
      declarations << <<~CSS
        --color-text-on-brand-base: #{brand_text} !important;
        --color-button-text: #{brand_text} !important;
        --color-ghost-button-text: #{brand_text} !important;
      CSS
    end

    if link.present?
      declarations << <<~CSS
        --color-text-brand: #{link} !important;
        --color-text-status-links: #{link} !important;
        --color-link: #{link} !important;
        --color-mention: #{link} !important;
        --color-hashtag: #{link} !important;
      CSS
    end

    css = <<~CSS
      [data-color-scheme='#{scheme}'] {
        #{declarations}
      }
    CSS

    css << link_color_rules(scheme, link) if link.present?
    css
  end

  # Bird UI paints every link inside a post with --color-accent, i.e. the same
  # variable as the buttons. Without this the mention/hashtag color would just
  # follow the button color, so the two slots are pinned apart explicitly.
  # (The muted-status gray is restored afterwards, since !important would
  # otherwise brighten filtered posts too.)
  def link_color_rules(scheme, link)
    prefix = "[data-color-scheme='#{scheme}']"

    <<~CSS
      #{prefix} .status__content a:not(.button):not(.status__content__read-more-button):not(.status__content__translate-button),
      #{prefix} .reply-indicator__content a,
      #{prefix} .room-message__content a,
      #{prefix} .status-link.mention,
      #{prefix} .status-link.hashtag,
      #{prefix} .mention {
        color: #{link} !important;
      }

      #{prefix} .muted .status__content a {
        color: var(--color-text-tertiary) !important;
      }
    CSS
  end

  # Reads e.g. Setting.color_brand_birdui_dark. Only #rrggbb values are accepted
  # (the form validates the same shape) so nothing can be injected into the CSS.
  def brand_color(slot, scheme)
    value = Setting.public_send(:"color_#{slot}_#{brand_theme_token}_#{scheme}").to_s.strip
    value.match?(/\A#[0-9a-fA-F]{6}\z/) ? value : nil
  end

  # Map the active theme to its brand-key token. themes.yml only ships `default`
  # (마스토돈) and `bird-ui` (트위터); anything else falls back to default.
  def brand_theme_token
    current_theme == 'bird-ui' ? 'birdui' : 'default'
  end

  # e.g. brand_key(:logo, :dark) => :logo_birdui_dark for the Twitter theme.
  def brand_key(asset, scheme)
    :"#{asset}_#{brand_theme_token}_#{scheme}"
  end

  def momodo_logo_css
    light = momodo_upload_url(brand_key(:logo, :light))
    dark  = momodo_upload_url(brand_key(:logo, :dark))
    return '' if light.blank? && dark.blank?

    css = +''
    # Server-rendered pages (login / admin) show an <svg>/<img class="logo--*">,
    # replaced directly here. Scope strictly per scheme so a light-only upload
    # never leaks into dark (and vice versa) — missing scheme shows the default.
    css << logo_rules("[data-color-scheme='light'] ", light) if light.present?
    css << logo_rules("[data-color-scheme='dark'] ", dark) if dark.present?
    # In the React app the logo is a real <img> (components/logo.tsx). Bird UI
    # otherwise paints a `--logo` background on the nav header *and* hides the
    # inner <img>, which doubled the logo. Kill the background so only the <img>
    # shows, and let the header box size to it. (Only emitted when this theme has
    # a custom logo; otherwise the default Bird UI logo is left untouched.)
    css << <<~CSS
      .layout-single-column .ui__header__logo,
      .layout-multiple-columns .ui__header__logo,
      .layout-single-column .column-link.column-link--logo,
      .layout-multiple-columns .column-link.column-link--logo {
        background-image: none !important;
        width: auto !important;
        height: auto !important;
        padding: 0 8px !important;
      }
      /* On PC (wide layout) the logo otherwise hugs the ceiling — add breathing room. */
      @media screen and (min-width: 890px) {
        .layout-single-column .ui__header__logo,
        .layout-multiple-columns .ui__header__logo,
        .layout-single-column .column-link.column-link--logo,
        .layout-multiple-columns .column-link.column-link--logo {
          margin-top: 16px !important;
        }
      }
    CSS
    css
  end

  def momodo_background_css(base_selector, light_key, dark_key)
    light = momodo_upload_url(light_key)
    dark  = momodo_upload_url(dark_key)
    return '' if light.blank? && dark.blank?

    css = +''
    css << background_rules("[data-color-scheme='light'] #{base_selector}", light) if light.present?
    css << background_rules("[data-color-scheme='dark'] #{base_selector}", dark) if dark.present?
    css
  end

  # Resolve a single (theme, scheme) upload URL. No fallback: a blank slot returns
  # nil so the default Mastodon asset is shown.
  def momodo_upload_url(key)
    instance_presenter.public_send(key)&.file&.url
  end

  # Replace server-rendered logos: <img class="logo"> (via `content`) and
  # <svg class="logo"><use></svg> (hide the symbol, paint a background on the box),
  # sized as a ~175×85 banner.
  def logo_rules(prefix, url)
    <<~CSS
      #{prefix}.logo--icon, #{prefix}.logo--wordmark {
        content: url("#{url}") !important;
        background: url("#{url}") center / contain no-repeat !important;
        width: 175px !important;
        height: 85px !important;
        max-width: 100% !important;
      }
      #{prefix}.logo--icon > *, #{prefix}.logo--wordmark > * { display: none !important; }
    CSS
  end

  def timeline_opacity_rules
    # Put the 70% surface on the main panel and make the inner structural
    # surfaces transparent, so the uploaded background shows through uniformly.
    <<~CSS
      .columns-area__panels__main {
        background-color: color-mix(in srgb, var(--color-bg-primary, var(--background-color, #fff)) 70%, transparent) !important;
      }
      .columns-area__panels__main .column,
      .columns-area__panels__main .scrollable,
      .columns-area__panels__main .item-list,
      .columns-area__panels__main .status,
      .columns-area__panels__main .status__wrapper,
      .columns-area__panels__main .detailed-status,
      .columns-area__panels__main article,
      .columns-area__panels__main .account,
      .columns-area__panels__main .column-header,
      .columns-area__panels__main .column-header__wrapper,
      .columns-area__panels__main .empty-column-indicator,
      .columns-area__panels__main .load-more {
        background-color: transparent !important;
        background-image: none !important;
      }
    CSS
  end

  def background_rules(selector, url)
    <<~CSS
      #{selector} {
        background-image: url("#{url}") !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
      }
    CSS
  end
end
