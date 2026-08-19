// Analytics Tracking Module for Mentis CRO Masterplan

export type MentisEvent = 
    | 'page_view'
    | 'calendar_viewed'
    | 'service_clicked'
    | 'faq_opened'
    | 'social_clicked'
    | 'calendar_slot_selected'
    | 'booking_started'
    | 'booking_abandoned'
    | 'booking_waitlist_clicked'
    | 'booking_completed';

export const trackMentisEvent = (eventName: MentisEvent, properties?: Record<string, any>) => {
    try {
        // In a real production environment, this would send data to PostHog, Mixpanel, or Google Analytics.
        // For MVP, we log to console to verify the funnel behavior.
        const payload = {
            event: eventName,
            timestamp: new Date().toISOString(),
            ...properties
        };
        
        console.log(`[Mentis Analytics] ${eventName}`, payload);
        
        // TODO: In the future, send this to Supabase or External Analytics API
        // supabase.from('analytics_events').insert([payload]);

    } catch (err) {
        // Silent failure to avoid breaking the user flow
        console.error("[Analytics Error] Failed to track event", err);
    }
};
