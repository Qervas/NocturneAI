/**
 * Terminal UI Hooks
 *
 * Custom React hooks for managing state, events, and interactions
 * in the Terminal UI components.
 */

export { useUIState } from './useUIState.js';
export type { UseUIStateReturn } from './useUIState.js';

export {
  useEventSubscription,
  useEventSubscriptions,
  useAllEvents,
  useEventState,
  useEventOnce
} from './useEventSubscription.js';
export type { EventHandler } from './useEventSubscription.js';

export {
  useKeyBindings,
  useViewNavigation,
  useListNavigation,
  getKeyBindingDescriptions,
  DEFAULT_KEY_BINDINGS
} from './useKeyBindings.js';
export type {
  KeyActionHandler,
  KeyBindingsConfig
} from './useKeyBindings.js';
