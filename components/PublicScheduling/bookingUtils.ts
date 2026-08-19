import { setHours, setMinutes, addMinutes, isBefore, isAfter, startOfDay, isSameDay, addDays } from 'date-fns';
import type { PublicAvailability, DaySchedule } from '@/types';

interface GetSlotsParams {
    date: Date;
    profile: any;
    availability: PublicAvailability[];
}

export const getSlotsForDay = ({ date, profile, availability }: GetSlotsParams): Date[] => {
    if (!profile || !profile.serviceHours) return [];
    if (isBefore(date, startOfDay(new Date()))) return [];

    const dayOfWeek = date.getDay();
    const schedule: DaySchedule = profile.serviceHours[dayOfWeek];

    if (!schedule || !schedule.enabled) return [];

    const slots: Date[] = [];
    const now = new Date();

    const [startHour, startMinute] = schedule.start.split(':').map(Number);
    const [endHour, endMinute] = schedule.end.split(':').map(Number);

    let currentSlot = setMinutes(setHours(date, startHour), startMinute);
    const endDay = setMinutes(setHours(date, endHour), endMinute);

    const parsedBreaks = (schedule.breaks || []).map((b: any) => {
        const [sH, sM] = b.start.split(':').map(Number);
        const [eH, eM] = b.end.split(':').map(Number);
        return {
            start: setMinutes(setHours(date, sH), sM),
            end: setMinutes(setHours(date, eH), eM)
        };
    });

    const settings = profile.schedulingSettings || {};
    const minAdvanceHours = settings.minAdvanceHours || 0;
    const BUFFER_MINUTES = settings.bufferMinutes || 0;
    const SLOT_DURATION = settings.sessionDuration || 60; // Fallback to 60 as in production

    let iterations = 0;
    const MAX_SLOTS = 50; // Trava máxima de horários num dia

    while (iterations < MAX_SLOTS) {
        iterations++;
        const slotEnd = addMinutes(currentSlot, SLOT_DURATION);

        // STRICT CLOSING TIME CHECK (No Tolerance)
        if (slotEnd > endDay) break;

        if (isSameDay(date, now)) {
            const minTime = addMinutes(now, minAdvanceHours * 60);
            if (isBefore(currentSlot, minTime)) {
                const nextSlotStart = addMinutes(slotEnd, BUFFER_MINUTES);
                currentSlot = nextSlotStart > currentSlot ? nextSlotStart : addMinutes(currentSlot, 1);
                continue;
            }
        } else if (isBefore(date, now) && !isSameDay(date, now)) {
            break;
        }

        if (settings.futureDays) {
            const maxFutureDate = addDays(new Date(), settings.futureDays);
            if (isAfter(date, maxFutureDate)) break;
        }

        const inBreak = parsedBreaks.some((b: any) => {
            return (currentSlot < b.end && slotEnd > b.start);
        });

        if (inBreak) {
            // Avança para após o break ou pelo menos 1 minuto para evitar travamento
            const endBreakTime = parsedBreaks.find((b: any) => currentSlot < b.end && slotEnd > b.start)?.end;
            currentSlot = endBreakTime ? new Date(endBreakTime) : addMinutes(currentSlot, 30);
            continue;
        }

        const conflict = availability.find(a => {
            if (a.isAvailable) return false;
            const busyStart = new Date(a.startTime);
            const busyEnd = new Date(a.endTime);
            return (currentSlot < busyEnd && slotEnd > busyStart);
        });

        if (!conflict) {
            slots.push(new Date(currentSlot));
        }
        
        // Avança a partir do final do slot, garantindo progresso mínimo
        const nextSlotStart = addMinutes(slotEnd, BUFFER_MINUTES);
        currentSlot = nextSlotStart > currentSlot ? nextSlotStart : addMinutes(currentSlot, 1);
    }
    
    return slots;
};

export const formatCpf = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatPhone = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
};
