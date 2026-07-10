// momodo: Discord-style ||spoiler|| — hidden until clicked (per render).
import { useCallback, useState } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import classNames from 'classnames';

const messages = defineMessages({
  reveal: { id: 'status.md_spoiler.reveal', defaultMessage: 'Reveal spoiler' },
});

interface MdSpoilerProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export const MdSpoiler: React.FC<MdSpoilerProps> = ({
  children,
  className,
  ...props
}) => {
  const intl = useIntl();
  const [revealed, setRevealed] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!revealed) {
        e.preventDefault();
        e.stopPropagation();
        setRevealed(true);
      }
    },
    [revealed],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setRevealed(true);
      }
    },
    [revealed],
  );

  return (
    <span
      {...props}
      className={classNames(className, { 'md-spoiler--revealed': revealed })}
      role='button'
      tabIndex={0}
      aria-expanded={revealed}
      aria-label={revealed ? undefined : intl.formatMessage(messages.reveal)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </span>
  );
};
