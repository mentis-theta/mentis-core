import React, { useState, useMemo } from "react";
import { differenceInDays, parseISO, setYear, isBefore, startOfDay } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Birthday {
    id: string;
    name: string;
    date: string; // ISO date format expected 'YYYY-MM-DD'
    daysUntil: number;
}

interface AniversariantesWidgetProps {
    upcomingBirthdays: { name: string; date: string }[];
}

// Days-until range shown in the header
const DAYS_RANGE = 7;

// ── Helpers ────────────────────────────────────────────────────────────────────
function urgencyAccentClasses(daysUntil: number): { bar: string; badge: string } {
    if (daysUntil <= 7) {
        return {
            bar: "bg-pink-500 dark:bg-pink-400",
            badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
        };
    }
    return {
        bar: "bg-border",
        badge: "bg-surface-container text-on-surface-variant"
    };
}

// ── BirthdayRow ────────────────────────────────────────────────────────────────
function BirthdayRow({ birthday }: { birthday: Birthday }) {
    const accent = urgencyAccentClasses(birthday.daysUntil);

    // Format visual date (e.g., DD/MM)
    const displayDate = useMemo(() => {
        try {
            const d = parseISO(birthday.date);
            return d.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
        } catch {
            return birthday.date;
        }
    }, [birthday.date]);

    return (
        <div className="flex items-center gap-3.5 py-3 px-4 rounded-2xl bg-transparent hover:bg-surface-container-low transition-colors cursor-default">
            {/* Left indicator bar — 3px wide, full height */}
            <div className={`w-[3px] self-stretch rounded-full shrink-0 min-h-[20px] ${accent.bar}`} />

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-surface-dim text-on-surface flex items-center justify-center font-sans text-sm font-medium shrink-0">
                {birthday.name.charAt(0).toUpperCase()}
            </div>

            {/* Name and Badge */}
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-on-surface font-sans overflow-hidden text-ellipsis whitespace-nowrap block">
                    {birthday.name}
                </span>
                {/* Days-until badge — only show if within range */}
                {birthday.daysUntil <= DAYS_RANGE && (
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-sans text-xs font-medium ${accent.badge}`}>
                        {birthday.daysUntil === 0
                            ? "Hoje!"
                            : birthday.daysUntil === 1
                                ? "Amanhã"
                                : `em ${birthday.daysUntil} dias`}
                    </span>
                )}
            </div>

            {/* Date */}
            <span className="text-xs text-on-surface-variant font-sans shrink-0 tabular-nums">
                {displayDate}
            </span>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export const AniversariantesWidget: React.FC<AniversariantesWidgetProps> = ({ upcomingBirthdays }) => {
    const [showAll, setShowAll] = useState(false);

    // Parse mapped birthdays and calculate days until
    const calculatedBirthdays: Birthday[] = useMemo(() => {
        const today = startOfDay(new Date());
        const currentYear = today.getFullYear();

        return upcomingBirthdays.map((b, index) => {
            let daysUntil = 999;
            try {
                const birth = parseISO(b.date);
                let nextBirthday = setYear(birth, currentYear);

                // If the birthday already passed this year, it's next year
                if (isBefore(nextBirthday, today)) {
                    nextBirthday = setYear(birth, currentYear + 1);
                }
                daysUntil = differenceInDays(nextBirthday, today);

            } catch (e) {
                console.warn("Invalid date format in birthday:", b.date);
            }

            return {
                id: index.toString(),
                name: b.name,
                date: b.date,
                daysUntil
            };
        }).sort((a, b) => a.daysUntil - b.daysUntil); // sort numerically by proximity
    }, [upcomingBirthdays]);


    const visible = calculatedBirthdays.filter((b) => b.daysUntil <= DAYS_RANGE);
    const upcoming = calculatedBirthdays.filter((b) => b.daysUntil > DAYS_RANGE);

    // Se não tiver ninguém exibindo, fallback
    const displayed = showAll ? calculatedBirthdays : visible;

    return (
        <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-3xl shadow-sm pt-5 px-3 pb-4">
            {/* ── Header ── */}
            <div className="flex justify-between items-center px-2 pb-2">
                <div>
                    <h2 className="text-xl font-semibold text-on-surface font-sans m-0">
                        Aniversariantes
                    </h2>
                    {/* Assist Chip — days range pill */}
                    <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200/50 dark:bg-pink-900/20 dark:border-pink-800/30 text-pink-600 dark:text-pink-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M19 4H18V2H16V4H8V2H6V4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="currentColor" />
                        </svg>
                        <span className="text-xs font-medium font-sans">
                            próximos {DAYS_RANGE} dias
                        </span>
                    </div>
                </div>

                {/* Cake icon — tonal container */}
                <div className="w-11 h-11 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 text-pink-600 dark:text-pink-400">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 6C13.1 6 14 5.1 14 4C14 3.62 13.9 3.27 13.71 2.97L12 0L10.29 2.97C10.1 3.27 10 3.62 10 4C10 5.1 10.9 6 12 6Z" fill="currentColor" />
                        <path d="M20 10H4C2.9 10 2 10.9 2 12V14C2 14.75 2.4 15.39 3 15.73V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V15.73C21.6 15.39 22 14.75 22 14V12C22 10.9 21.1 10 20 10ZM19 20H5V16H19V20ZM20 14H4V12H20V14Z" fill="currentColor" />
                    </svg>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mx-2 mt-1 mb-2" />

            {/* ── Birthday rows ── */}
            <div className="flex flex-col gap-0.5">
                {displayed.length === 0 && (
                    <p className="text-center font-sans text-sm text-foreground-muted py-4 m-0">
                        Nenhum aniversariante num raio de {DAYS_RANGE} dias.
                    </p>
                )}

                {displayed.map((b) => (
                    <BirthdayRow key={b.id} birthday={b} />
                ))}
            </div>

            {/* ── Show more / less ── */}
            {upcoming.length > 0 && (
                <div className="pt-2.5 px-2 pb-1">
                    <button
                        onClick={() => setShowAll((s) => !s)}
                        className="inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer py-1 group"
                    >
                        <span className="text-sm font-medium text-foreground-muted group-hover:text-primary group-hover:underline font-sans transition-colors">
                            {showAll ? "Ver menos" : `Ver mais ${upcoming.length} aniversariante${upcoming.length > 1 ? "s" : ""}`}
                        </span>
                        <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            className={`text-foreground-muted group-hover:text-primary transition-transform duration-250 ${showAll ? "rotate-180" : "rotate-0"}`}
                        >
                            <path d="M7 10l5 5 5-5z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
