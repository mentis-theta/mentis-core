import React, { useMemo, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { useModals } from '@/contexts/ModalContext';
import { useModalData } from '@/contexts/ModalDataContext';
import { useModalScheduling } from '@/contexts/ModalSchedulingContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import Button from '../Button';
import { ChevronRightIcon, UserGroupIcon } from '../Icons';
import { MESSAGES } from '@/utils/messages';
import { Session, AuditLog } from '@/types';
import ModalManager from '../ModalManager';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Inbox } from 'lucide-react';

// Lazy Imports for Bundle Optimization
import { lazyWithRetry } from '@/utils/lazyLoad';

const PatientList = lazyWithRetry(() => import('../Patient/PatientList'));
import { RequireAdmin } from '../Admin/RequireAdmin';
const PatientDetail = lazyWithRetry(() => import('../Patient/PatientDetail'));
const AdminDashboard = lazyWithRetry(() => import('../Admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const CalendarView = lazyWithRetry(() => import('../CalendarView'));
const MeuEspacoDashboard = lazyWithRetry(() => import('../Dashboard/MeuEspacoDashboard').then(module => ({ default: module.MeuEspacoDashboard })));
const FinancialManager = lazyWithRetry(() => import('../Dashboard/FinancialManager').then(module => ({ default: module.FinancialManager })));
const LibraryPage = lazyWithRetry(() => import('../Library/LibraryPage'));
const SchedulingRequestsList = lazyWithRetry(() => import('../Session/SchedulingRequestsList').then(module => ({ default: module.SchedulingRequestsList })));
const SchedulingRequestDetail = lazyWithRetry(() => import('../Session/SchedulingRequestDetail').then(module => ({ default: module.SchedulingRequestDetail })));
const SettingsPage = lazyWithRetry(() => import('../Settings/SettingsPage'));

// Simple Loading Fallback
const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full w-full text-foreground-muted bg-transparent">
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Carregando...</span>
        </div>
    </div>
);

// --- Sub-seções de Roteamento ---

const CalendarSection = () => {
    const { patients } = usePatientContext();
    const { openModal } = useModals();
    const { setSelectedDateForAppointment } = useModalScheduling();
    const { setSessionToEdit } = useModalData();

    return (
        <div className="min-h-full overflow-y-auto flex flex-col pb-20">
            <div className="px-6 md:px-8 pt-6 md:pt-8 bg-transparent shrink-0">
                <SchedulingRequestsList />
            </div>
            <CalendarView
                patients={patients}
                onAddSession={(date: Date | null) => {
                    setSessionToEdit(null);
                    setSelectedDateForAppointment(date || null);
                    openModal('appointment');
                }}
                onEditSession={(session: Session) => {
                    setSessionToEdit(session);
                    openModal('appointment');
                }}
            />
        </div>
    );
};

const PatientsSection = () => {
    const { patientId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { can } = usePermissions();
    const { patients, updatePatient, reorderPatients, importData } = usePatientContext();
    const { openModal } = useModals();
    const { setPatientToEdit } = useModalData();
    const { addToast } = useToast();
    const confirm = useConfirm();
    
    const [isPatientListCollapsed, setIsPatientListCollapsed] = useState(false);

    const isRequestsTab = location.pathname.includes('/requests');
    const selectedRequestId = isRequestsTab ? patientId : null; // Se estiver na aba requests, o id na URL é da solicitação
    const selectedPatientId = !isRequestsTab ? patientId : null;

    const selectedPatient = useMemo(() =>
        selectedPatientId ? patients.find(p => p.id === selectedPatientId) : null,
    [patients, selectedPatientId]);

    const handleImportData = async (c: string) => {
        const isConfirmed = await confirm({
            title: 'Atenção',
            message: MESSAGES.CONFIRM_OVERWRITE,
            confirmText: 'Sobrescrever Dados'
        });
        if (isConfirmed) {
            const res = await importData(c);
            if (res.success) addToast(MESSAGES.IMPORT_SUCCESS, "success");
            else addToast(res.error || "Erro", "error");
        }
    };

    return (
        <div className="flex h-full relative">
            {/* Lista de Pacientes */}
            <aside className={`
                h-full flex-shrink-0 flex flex-col
                bg-surface   
                border-r border-border/40
                transition-all duration-300 
                ${isPatientListCollapsed ? 'w-0 overflow-hidden' : 'w-full md:w-[35%] lg:w-[30%] xl:w-[25%] md:min-w-[360px] lg:min-w-[420px] overflow-y-auto'}
                ${(selectedPatientId || selectedRequestId) ? 'hidden md:flex' : 'flex'}
            `}>
                <PatientList
                    patients={patients} 
                    selectedPatientId={selectedPatientId || null} 
                    onSelectPatient={(id: string) => navigate(`/patients/${id}`)}
                    onAddPatient={() => { setPatientToEdit(null); openModal('addPatient'); }} 
                    onShowStaffManagement={() => navigate('/staff')}
                    onShowAdminDashboard={() => navigate('/admin')}
                    onImportData={handleImportData}
                    onToggleCollapse={() => setIsPatientListCollapsed(true)}
                    onUpdatePatient={updatePatient}
                    onReorderPatients={reorderPatients}
                />
            </aside>

            {/* Botão expandir desktop */}
            {isPatientListCollapsed && (
                <div className="absolute top-0 left-0 h-full flex items-center z-20">
                    <button onClick={() => setIsPatientListCollapsed(false)} className="min-h-[44px] min-w-[44px] p-2 bg-surface rounded-r-lg shadow-lg border border-l-0 border-border text-foreground-muted hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center">
                        <ChevronRightIcon className="h-6 w-6" />
                    </button>
                </div>
            )}

            {/* Detalhe do Paciente ou da Solicitação */}
            <section className={`
                h-full flex-1 min-w-0
                ${(selectedPatientId || selectedRequestId || isRequestsTab) ? 'block' : 'hidden md:block'}
                bg-transparent   
            `}>
                {isRequestsTab ? (
                    selectedRequestId ? (
                        <SchedulingRequestDetail requestId={selectedRequestId} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
                            <div className="bg-background p-6 rounded-full inline-block mb-4">
                                <Inbox className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg font-medium text-foreground-muted">Selecione uma solicitação ao lado</p>
                            <p className="text-sm mt-2">Clique em um item na lista para ler a mensagem completa e aprovar o agendamento.</p>
                        </div>
                    )
                ) : selectedPatientId ? (
                    <PatientDetail
                        onBackToList={() => navigate('/patients')}
                        canEditSessions={can('session:edit') && (currentUser?.id === selectedPatient?.psychologistId || can('system:manage'))}
                        canManagePatient={can('patient:edit') && (currentUser?.id === selectedPatient?.psychologistId || can('system:manage'))}
                        onEditPatient={() => { setPatientToEdit(patients.find(p => p.id === selectedPatientId) || null); openModal('addPatient'); }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
                        {patients.length === 0 ? (
                            <div className="text-center p-8 max-w-md">
                                <div className="bg-background p-6 rounded-full inline-block mb-4">
                                    <UserGroupIcon className="h-12 w-12 text-foreground-muted" />
                                </div>
                                <h3 className="text-xl font-bold text-on-surface mb-2">
                                    Você ainda não tem pacientes
                                </h3>
                                <p className="text-foreground-muted mb-6">
                                    Comece adicionando seu primeiro paciente para gerenciar sessões, prontuários e evoluções.
                                </p>
                                <Button onClick={() => openModal('addPatient')} size="lg" className="shadow-lg">
                                    <span className="mr-2">+</span> Cadastrar Primeiro Paciente
                                </Button>
                            </div>
                        ) : (
                            <>
                                <UserGroupIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">Selecione um paciente ao lado para ver os detalhes.</p>
                            </>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

const AdminSection = () => {
    return (
        <RequireAdmin>
            <AdminDashboard />
        </RequireAdmin>
    );
};

const StaffSection = () => {
    const { currentUser } = useAuth();
    if (currentUser?.role !== 'psychologist' && currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return <div className="p-8 text-center">Gestão de Equipe em desenvolvimento.</div>;
};

// --- Componente Principal ---

const AppRoutes: React.FC = () => {
    return (
        <div className="h-full flex flex-col overflow-hidden bg-transparent">
            <Suspense fallback={<LoadingFallback />}>
                <div className="h-full w-full flex flex-col animate-fadeIn">
                    <Routes>
                        <Route path="/dashboard" element={<MeuEspacoDashboard />} />
                        <Route path="/financial" element={<FinancialManager />} />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/calendar" element={<CalendarSection />} />
                        
                        {/* Rotas de Pacientes */}
                        <Route path="/patients" element={<PatientsSection />} />
                        <Route path="/patients/:patientId" element={<PatientsSection />} />
                        <Route path="/patients/requests/:patientId" element={<PatientsSection />} />
                        <Route path="/patients/requests" element={<PatientsSection />} />
                        
                        {/* Admin e Staff */}
                        <Route path="/admin" element={<AdminSection />} />
                        <Route path="/staff" element={<StaffSection />} />
                        
                        {/* Configurações */}
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </Suspense>
        </div>
    );
};

export default AppRoutes;
