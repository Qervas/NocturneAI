/**
 * useEventSubscription Hook
 *
 * Custom React hook for subscribing to event bus events in Terminal UI components.
 * Handles event listener registration, cleanup, and type-safe event handling.
 */

import { useEffect } from 'react';
import { EventEmitter } from 'events';
import { UIEventType, UIEventPayloads } from '../types.js';

/**
 * Event handler type
 */
export type EventHandler<T extends UIEventType> = (
  payload: UIEventPayloads[T]
) => void;

/**
 * Hook for subscribing to a single event
 *
 * @param eventBus - Event emitter instance
 * @param eventType - Type of event to subscribe to
 * @param handler - Event handler function
 */
export function useEventSubscription<T extends UIEventType>(
  eventBus: EventEmitter,
  eventType: T,
  handler: EventHandler<T>
): void {
  useEffect(() => {
    // Type-safe event listener wrapper
    const listener = (payload: UIEventPayloads[T]) => {
      handler(payload);
    };

    // Subscribe to event
    eventBus.on(eventType, listener);

    // Cleanup on unmount or when dependencies change
    return () => {
      eventBus.off(eventType, listener);
    };
  }, [eventBus, eventType, handler]);
}

/**
 * Hook for subscribing to multiple events
 *
 * @param eventBus - Event emitter instance
 * @param subscriptions - Map of event types to handlers
 */
export function useEventSubscriptions(
  eventBus: EventEmitter,
  subscriptions: Partial<{
    [K in UIEventType]: EventHandler<K>;
  }>
): void {
  useEffect(() => {
    // Create listeners for each subscription
    const listeners: Array<{
      event: string;
      listener: (payload: unknown) => void;
    }> = [];

    for (const [eventType, handler] of Object.entries(subscriptions)) {
      if (handler) {
        const listener = (payload: unknown) => {
          handler(payload as never);
        };
        eventBus.on(eventType, listener);
        listeners.push({ event: eventType, listener });
      }
    }

    // Cleanup all listeners
    return () => {
      for (const { event, listener } of listeners) {
        eventBus.off(event, listener);
      }
    };
  }, [eventBus, subscriptions]);
}

/**
 * Hook for subscribing to all events with a single handler
 *
 * @param eventBus - Event emitter instance
 * @param handler - Handler that receives all events
 */
export function useAllEvents(
  eventBus: EventEmitter,
  handler: (eventType: string, payload: unknown) => void
): void {
  useEffect(() => {
    // Create a listener for all event types
    const listeners: Array<{
      event: UIEventType;
      listener: (payload: unknown) => void;
    }> = [];

    // Subscribe to all known event types
    for (const eventType of Object.values(UIEventType)) {
      const listener = (payload: unknown) => {
        handler(eventType, payload);
      };
      eventBus.on(eventType, listener);
      listeners.push({ event: eventType, listener });
    }

    // Cleanup
    return () => {
      for (const { event, listener } of listeners) {
        eventBus.off(event, listener);
      }
    };
  }, [eventBus, handler]);
}

/**
 * Hook for subscribing to events with automatic state updates
 *
 * @param eventBus - Event emitter instance
 * @param eventType - Type of event to subscribe to
 * @param onEvent - Callback that updates state based on event
 */
export function useEventState<T extends UIEventType>(
  eventBus: EventEmitter,
  eventType: T,
  onEvent: (payload: UIEventPayloads[T]) => void
): void {
  useEffect(() => {
    const listener = (payload: UIEventPayloads[T]) => {
      try {
        onEvent(payload);
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error);
      }
    };

    eventBus.on(eventType, listener);

    return () => {
      eventBus.off(eventType, listener);
    };
  }, [eventBus, eventType, onEvent]);
}

/**
 * Hook for one-time event subscription
 *
 * @param eventBus - Event emitter instance
 * @param eventType - Type of event to subscribe to
 * @param handler - Event handler function (called only once)
 */
export function useEventOnce<T extends UIEventType>(
  eventBus: EventEmitter,
  eventType: T,
  handler: EventHandler<T>
): void {
  useEffect(() => {
    const listener = (payload: UIEventPayloads[T]) => {
      handler(payload);
    };

    // Use 'once' for one-time subscription
    eventBus.once(eventType, listener);

    // Cleanup in case component unmounts before event fires
    return () => {
      eventBus.off(eventType, listener);
    };
  }, [eventBus, eventType, handler]);
}
