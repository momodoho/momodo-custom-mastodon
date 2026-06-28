import classNames from 'classnames';

import logo from '@/images/logo.svg';
import { customLogoLight, customLogoDark } from 'mastodon/initial_state';

// A custom logo is in play if either scheme was uploaded for the active theme.
// There is no cross-scheme fallback: a scheme with no upload shows the default
// Mastodon logo (matching the admin "missing → default" choice).
const hasCustomLogo = !!(customLogoLight ?? customLogoDark);
const lightSrc = customLogoLight ?? logo;
const darkSrc = customLogoDark ?? logo;

// momodo: when an admin uploaded a custom logo, render it directly as an <img>
// (light/dark variants toggled by data-color-scheme via CSS) so it shows in the
// React app too, not just on server-rendered pages.
const CustomLogo: React.FC<{ className?: string }> = ({ className }) => (
  <span className={classNames('logo logo--custom', className)}>
    <img src={lightSrc} alt='' className='logo--custom-light' />
    <img src={darkSrc} alt='' className='logo--custom-dark' />
  </span>
);

export const WordmarkLogo: React.FC = () =>
  hasCustomLogo ? (
    <CustomLogo className='logo--custom-wordmark' />
  ) : (
    <svg viewBox='0 0 261 66' className='logo logo--wordmark' role='img'>
      <title>Mastodon</title>
      <use xlinkHref='#logo-symbol-wordmark' />
    </svg>
  );

export const IconLogo: React.FC<{ className?: string }> = ({ className }) =>
  hasCustomLogo ? (
    <CustomLogo className={className} />
  ) : (
    <svg
      viewBox='0 0 79 79'
      className={classNames('logo logo--icon', className)}
      role='img'
    >
      <title>Mastodon</title>
      <use xlinkHref='#logo-symbol-icon' />
    </svg>
  );

export const SymbolLogo: React.FC = () =>
  hasCustomLogo ? (
    <CustomLogo />
  ) : (
    <img src={logo} alt='Mastodon' className='logo logo--icon' />
  );
