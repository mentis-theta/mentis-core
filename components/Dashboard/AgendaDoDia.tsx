import { useState, useMemo, memo } from "react";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePatientContext } from "@/contexts/PatientContext";
import { useNavigate } from "react-router-dom";
import { Session } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Tag { label: string; }

interface Patient {
  id: string;
  initials: string;
  name: string;
  status: string;
  years: number;
  time: string;
  tags: Tag[];
  attended: boolean;
}

interface Appointment {
  id: string;
  time: string;
  name: string;
}

// ── Segmented Button (Memoized) ────────────────────────────────────────────────────────
const SegmentedBtn = memo(({ label, onClick, isLeft, filled }: {
  label: string; onClick: () => void; isLeft: boolean; filled?: boolean;
}) => {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`px-3.5 py-1.5 border-none font-sans text-sm font-medium transition-colors cursor-pointer outline-none ${isLeft ? 'border-r border-border' : ''} ${filled
        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : 'bg-transparent text-on-surface hover:bg-surface-container-low'
        }`}
    >
      {label}
    </button>
  );
});

// ── Assist Chip (Memoized) ─────────────────────────────────────────────────────────────
const M3AssistChip = memo(({ label }: { label: string }) => {
  return (
    <div className="h-8 px-3 border border-border rounded-lg inline-flex items-center bg-transparent text-on-surface-variant font-sans text-sm font-medium">
      {label}
    </div>
  );
});

// ── PatientCard (Memoized for 60FPS) ─────────────────────────────────────────────────
const PatientCard = memo(({
  patient, onReschedule, onAttend, onCardClick,
}: {
  patient: any;
  onReschedule: (p: any) => void;
  onAttend: (p: any) => void;
  onCardClick: (p: any) => void;
}) => {
  const isFirst = patient.initials === "M";
  const avatarClasses = isFirst
    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
    : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";

  return (
    <div
      onClick={() => onCardClick(patient)}
      className="relative overflow-hidden cursor-pointer flex items-center gap-4 py-3 px-4 border-b border-border last:border-b-0 transition-colors hover:bg-surface-container-low active:bg-surface-container"
    >
      {/* Avatar — 40dp */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-sans text-base font-medium shrink-0 ${avatarClasses}`}>
        {patient.initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-base font-semibold text-on-surface font-sans overflow-hidden text-ellipsis whitespace-nowrap">
              {patient.name}
            </div>
            <div className="text-sm font-medium text-on-surface-variant font-sans mt-0.5">
              {patient.status} · {patient.years} anos
            </div>
          </div>

          {/* Segmented Button */}
          <div className="flex border border-border rounded-full overflow-hidden shrink-0">
            <SegmentedBtn label="Reagendar" onClick={() => onReschedule(patient)} isLeft />
            <SegmentedBtn label="Atender" onClick={() => onAttend(patient)} isLeft={false} filled />
          </div>
        </div>

        {/* Tags + trailing chevron */}
        <div className="flex justify-between items-center mt-2.5">
          <div className="flex gap-1.5 flex-wrap">
            {patient.tags.map((tag: any, i: number) => (
              <M3AssistChip key={i} label={tag.label} />
            ))}
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-on-surface-variant shrink-0">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
});

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── Vertical Timeline (Memoized) ───────────────────────────────────────────────
const VerticalTimelineSection = memo(({ attendedIds, allAppointments }: { attendedIds: Set<string>, allAppointments: any[] }) => {
  const currentMinutes = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  return (
    <div className="hidden lg:flex flex-1 flex-col justify-start py-9 px-10 bg-surface-container-lowest border-l border-border">
      <div className="text-sm font-semibold text-on-surface-variant font-sans mb-8 flex items-center gap-1.5">
        <span className="text-primary font-bold">Próximos</span>
        <span>Horários</span>
      </div>

      <div className="flex flex-col gap-0">
        {allAppointments.map((appt, i) => {
          const apptMin = timeToMinutes(appt.time);
          const done = attendedIds.has(appt.id) || apptMin < currentMinutes;
          const isNext = !done && (i === 0 || timeToMinutes(allAppointments[i - 1].time) < currentMinutes || attendedIds.has(allAppointments[i - 1]?.id));
          const isLast = i === allAppointments.length - 1;

          return (
            <div key={appt.id} className="flex items-start min-h-[64px]">
              <div className="w-11 shrink-0 text-right mr-4">
                <span className={`font-mono text-[13px] ${isNext ? 'font-bold text-primary' : done ? 'font-medium text-foreground-muted' : 'font-medium text-on-surface-variant'}`}>
                  {appt.time}
                </span>
              </div>

              <div className="flex flex-col items-center mr-5 self-stretch">
                <div className={`rounded-full shrink-0 transition-all ${isNext
                  ? 'w-3.5 h-3.5 bg-primary ring-4 ring-primary/20 mt-0.5'
                  : done
                    ? 'w-2.5 h-2.5 bg-border mt-1'
                    : 'w-2.5 h-2.5 bg-primary/20 mt-1'
                  }`} />
                {!isLast && (
                  <div className={`w-0.5 flex-1 rounded-sm ${isNext
                    ? 'my-1.5 bg-primary/20'
                    : done
                      ? 'my-1 bg-border'
                      : 'my-1 bg-border/40'
                    }`} />
                )}
              </div>

              <div className={`flex-1 ${isNext ? 'pt-0' : 'pt-0.5'}`}>
                <span className={`font-sans text-sm font-semibold ${done
                  ? 'text-foreground-muted line-through'
                  : isNext
                    ? 'text-on-surface'
                    : 'text-on-surface-variant'
                  }`}>
                  {appt.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Illustration column ────────────────────────────────────────────────────────
function IllustrationColumn() {
  return (
    <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none select-none relative">
      <div className="absolute w-[180px] h-[180px] rounded-full bg-primary/20 opacity-50 blur-[32px] dark:opacity-30" />
      <svg width="160" height="188" viewBox="0 0 160 188" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
        <ellipse cx="80" cy="158" rx="38" ry="18" className="fill-primary/20" />
        <rect x="50" y="104" width="60" height="58" rx="16" className="fill-primary" />
        <path d="M72 104 Q80 116 88 104" strokeWidth="2.5" fill="none" className="stroke-primary/50" />
        <circle cx="80" cy="74" r="27" fill="#F5D5B8" />
        <path d="M54 66 Q57 44 80 46 Q103 44 106 66 Q100 54 80 55 Q60 54 54 66Z" fill="#5A3E2B" />
        <ellipse cx="71" cy="74" rx="3.2" ry="3.8" fill="#3B2A1A" />
        <ellipse cx="89" cy="74" rx="3.2" ry="3.8" fill="#3B2A1A" />
        <circle cx="72.5" cy="72" r="1.1" fill="white" />
        <circle cx="90.5" cy="72" r="1.1" fill="white" />
        <path d="M73 82 Q80 88 87 82" stroke="#C4845A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M50 116 Q36 124 34 140" strokeWidth="11" strokeLinecap="round" className="stroke-primary" />
        <circle cx="33" cy="143" r="7.5" fill="#F5D5B8" />
        <path d="M110 116 Q122 122 124 136" strokeWidth="11" strokeLinecap="round" className="stroke-primary" />
        <rect x="112" y="128" width="30" height="38" rx="6" className="fill-surface-container-lowest stroke-primary/30" strokeWidth="2" />
        <rect x="121" y="124" width="10" height="9" rx="3" className="fill-primary/20" />
        <line x1="117" y1="138" x2="137" y2="138" strokeWidth="1.5" strokeLinecap="round" className="stroke-border" />
        <line x1="117" y1="144" x2="137" y2="144" strokeWidth="1.5" strokeLinecap="round" className="stroke-border" />
        <line x1="117" y1="150" x2="129" y2="150" strokeWidth="1.5" strokeLinecap="round" className="stroke-border" />
        <circle cx="123" cy="132" r="6.5" fill="#F5D5B8" />
        <line x1="124" y1="127" x2="130" y2="118" stroke="#5A3E2B" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="20" cy="172" rx="10" ry="6" className="fill-primary/20" />
        <path d="M20 172 Q16 154 20 142" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary/60" />
        <path d="M20 156 Q27 148 34 151" strokeWidth="2" strokeLinecap="round" className="stroke-primary/60" />
        <path d="M20 162 Q13 155 8 158" strokeWidth="2" strokeLinecap="round" className="stroke-primary/60" />
      </svg>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AgendaDoDia({
  todaysSessions
}: {
  todaysSessions: Session[];
}) {
  const { patients } = usePatientContext();
  const navigate = useNavigate();

  const formattedDateLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const mappedPatients = useMemo(() => {
    const now = new Date();
    return todaysSessions.map(s => {
      const patient = patients.find(p => p.id === (s as any).patientId || p.name === (s as any).patientName);

      let initials = "P";
      let name = (s as any).patientName || "Paciente";
      let years = 0;
      let tags = s.tags || [];

      if (patient) {
        name = patient.name;
        if (patient.birthDate) {
          years = differenceInYears(now, parseISO(patient.birthDate));
        }
      }

      const parts = name.split(" ");
      if (parts.length >= 2) {
        initials = parts[0][0] + parts[1][0];
      } else if (name.length > 0) {
        initials = name[0];
      }

      const timeStr = s.date ? format(parseISO(s.date), "HH:mm") : "00:00";
      return {
        id: s.id || Math.random().toString(),
        patientId: patient?.id,
        initials: initials.toUpperCase(),
        name,
        status: patient?.status === 'active' ? 'Paciente ativo' : 'Paciente',
        years,
        time: timeStr,
        tags: tags.length > 0 ? tags.map((t: any) => ({ label: t.text || t.label || t })) : [],
        attended: s.status === 'completed',
        rawSession: s
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [todaysSessions, patients]);

  const [localAttended] = useState<Set<string>>(new Set());

  const attendedIds = useMemo(() => {
    const set = new Set<string>();
    mappedPatients.forEach(p => {
      if (p.attended || localAttended.has(p.id)) set.add(p.id);
    });
    return set;
  }, [mappedPatients, localAttended]);

  const handleAttend = useMemo(() => (patient: any) => {
    if (patient.patientId) {
      navigate('/patients/' + patient.patientId);
    }
  }, [navigate]);

  const handleReschedule = useMemo(() => (patient: any) => {
    navigate('/calendar');
  }, [navigate]);

  const allAppointments = useMemo(() => mappedPatients.map(p => ({
    id: p.id,
    time: p.time,
    name: p.name
  })), [mappedPatients]);

  return (
    <div className="w-full min-h-[469px] bg-surface-container-lowest rounded-pill-card shadow-airy overflow-hidden flex flex-col lg:flex-row border border-border/40">
      {/* ── Left Column ── */}
      <div className="w-full lg:w-[58%] flex flex-col p-6 md:p-7 min-h-full">
        <div className="flex-1 overflow-hidden">
          {/* Page Header */}
          <div className="mb-5">
            <div className="text-xl font-semibold text-on-surface font-sans">
              Agenda do Dia
            </div>
            <div className="text-sm font-medium text-on-surface-variant font-sans mt-1">
              {formattedDateLabel}
            </div>
          </div>

          {/* Card — Patient List */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm">
            {mappedPatients.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                onReschedule={handleReschedule}
                onAttend={handleAttend}
                onCardClick={handleAttend}
              />
            ))}
          </div>
        </div>

        {/* Extended FAB - Bottom Left */}
        <div className="mt-8 flex justify-start">
          <button
            onClick={() => navigate('/calendar')}
            className="inline-flex items-center gap-2.5 pl-5 pr-6 h-12 rounded-full border-none bg-primary/10 text-primary font-sans text-sm font-bold cursor-pointer shadow-sm transition-all hover:bg-primary/20 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M19 4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Agenda Completa
          </button>
        </div>
      </div>

      {/* ── Right Column: Illustration or Timeline ── */}
      {mappedPatients.length === 0 ? (
        <IllustrationColumn />
      ) : (
        <VerticalTimelineSection attendedIds={attendedIds} allAppointments={allAppointments} />
      )}
    </div>
  );
}
