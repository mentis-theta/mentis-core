/**
 * Event Bus for React Components Synchronization
 */
export const EVENT_REQUESTS_UPDATED = 'mentis:requestsUpdated';

export const triggerRequestsUpdate = () => {
    window.dispatchEvent(new Event(EVENT_REQUESTS_UPDATED));
};
