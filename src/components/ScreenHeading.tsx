import { useSyncExternalStore } from 'react';
import { getScreenHeading, subscribeScreenHeading } from '../a11y/screenHeading';

/** Visually hidden <h1> for the current screen (see a11y/screenHeading). */
export function ScreenHeading() {
  const text = useSyncExternalStore(subscribeScreenHeading, getScreenHeading, getScreenHeading);
  return text ? <h1 className="sr-only">{text}</h1> : null;
}
