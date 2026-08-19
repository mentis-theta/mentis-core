
import React, { useCallback, useState, useMemo } from 'react';
import type { Patient, Folder } from '@/types.ts';
import { PlusIcon, UserGroupIcon, ShieldCheckIcon, DownloadIcon, SwitchHorizontalIcon, ChevronLeftIcon, EyeIcon, EyeOffIcon } from '../Icons';
import Button from '../Button.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { usePatientList } from '@/hooks/usePatientList.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useColors } from '../Settings/ColorContext.tsx';
import { useFolderOperations } from '@/hooks/useFolderOperations.ts';
import { useDataExport } from '@/hooks/useDataExport.ts';
import { getSchedulingRequests } from '@/services/bookingService.ts';
import { SchedulingRequestsList } from '../Session/SchedulingRequestsList.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { usePrivacyMode } from '@/contexts/PrivacyContext';
import { useSchedulingRequests } from '@/hooks/useSchedulingRequests';
import CreateGroupModal from './CreateGroupModal.tsx';
import DeleteFolderConfirmModal from './DeleteFolderConfirmModal.tsx';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XIcon } from '../Icons';

// --- Droppable Folder Chip ---
const FolderChip = React.memo(({
  folder,
  isSelected,
  onClick,
  onDelete
}: {
  folder: Folder | null;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) => {
  const { getColorClasses } = useColors();
  const { setNodeRef, isOver } = useDroppable({
    id: folder ? `folder-${folder.id}` : 'folder-all',
    data: { type: 'folder', folderId: folder?.id || null },
  });

  const baseClasses = "flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap border cursor-pointer select-none";

  let colorClasses = "";
  if (!folder) { // "All" chip
    colorClasses = isSelected
      ? "bg-indigo-950 text-white border-indigo-950 dark:bg-indigo-300 dark:text-indigo-950 shadow-sm scale-[1.02]"
      : " bg-surface-container text-foreground-muted border-border hover:bg-surface-container-high hover:border-slate-300 ";
  } else {
    const c = folder.color as any;
    colorClasses = isSelected
      ? getColorClasses(c, 'solid') + " border-transparent shadow-sm scale-[1.02]"
      : isOver
        ? `bg-${c}-100 text-${c}-800 border-${c}-300 ring-2 ring-${c}-400`
        : getColorClasses(c, 'soft') + " border-transparent hover:brightness-95";
  }

  return (
    <div ref={setNodeRef} onClick={onClick} className={`${baseClasses} ${colorClasses}`}>
      {folder ? folder.name : 'Todos'}
      {folder && onDelete && isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="ml-1 hover:bg-black/10 rounded-full p-2.5 md:p-0.5 flex items-center justify-center transition-colors duration-200"
          title="Excluir Pasta"
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});

// --- Sortable Patient Item ---
const PatientListItem = React.memo(({
  patient,
  folders,
  isSelected,
  onSelect,
  isSelectionMode,
  toggleSelection,
  isDragDisabled
}: {
  patient: Patient;
  folders: Folder[];
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  isSelectionMode: boolean;
  toggleSelection: (id: string) => void;
  isDragDisabled?: boolean;
}) => {
  const { colors, getColorClasses } = useColors();
  const privacyCtx = usePrivacyMode();

  // Sortable Hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: patient.id,
    data: { type: 'patient', patientId: patient.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none'
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Seleção por CTRL desabilitada para estabilizar o Wizard de Grupos
    if (isSelectionMode) {
      e.preventDefault();
      toggleSelection(patient.id);
    } else {
      onSelect(patient.id, false);
    }
  };

  const statusColor = colors[patient.status || 'active'];

  const allFolderIds = new Set<string>();
  if (patient.folderIds) patient.folderIds.forEach(id => allFolderIds.add(id));
  if (patient.folderId) allFolderIds.add(patient.folderId);
  const validFolders = folders?.filter(f => allFolderIds.has(f.id)) || [];

  const isArchived = patient.is_active === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-stretch
        rounded-2xl
        transition-all duration-300 ease-in-out
        ${isDragging ? 'opacity-50 z-50 relative scale-[1.02] shadow-lg' : ''}
        ${isSelected
          ? 'bg-primary/10 ring-1 ring-primary/20 shadow-sm'
          : 'bg-surface-container-low border border-border/60 hover:bg-surface-container-high hover:shadow-md hover:border-primary/20'
        }
      `}
    >
      {/* 1. Drag Handle (Left) */}
      <div
        {...(!isDragDisabled ? listeners : {})}
        {...(!isDragDisabled ? attributes : {})}
        className={`w-9 flex items-center justify-center rounded-l-xl transition-colors duration-200 touch-none ${
          isDragDisabled 
            ? 'cursor-not-allowed text-slate-200 dark:text-slate-700/50' 
            : 'cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:hover:text-slate-500'
        }`}
        title={isDragDisabled ? "Limpe os filtros para reordenar" : "Arrastar para reordenar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-opacity duration-200 ${isDragDisabled ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isDragDisabled ? (
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          ) : (
            <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4zm6-12a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z" />
          )}
        </svg>
      </div>

      {/* 2. Avatar */}
      <div className="flex items-center pl-1 pr-3 py-3">
        <div className={`
          h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
          transition-all duration-300
          ${isSelected
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-surface-container-low text-foreground-muted dark:bg-slate-700'
          }
        `}>
          {patient.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* 3. Content Area */}
      <div
        onClick={handleCardClick}
        className="flex-1 min-w-0 py-3 pr-4 cursor-pointer select-none"
      >
        <div className="flex items-center justify-between min-w-0 gap-2">
          <p className={`truncate font-semibold text-sm capitalize transition-colors duration-200 ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : ' text-on-surface   '}`}>
            {patient.name}
          </p>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {!isArchived && (
              <div className="flex space-x-1">
                {validFolders.map(f => {
                  const colorClass = getColorClasses(f.color as any, 'solid').split(' ')[0];
                  return (
                    <span
                      key={f.id}
                      className={`h-2 w-2 rounded-full ${colorClass} transition-transform duration-200 hover:scale-125`}
                      title={`Grupo: ${f.name}`}
                    />
                  );
                })}
              </div>
            )}
            {isArchived ? (
              <span className="text-[11px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-300 font-medium">
                Arquivado
              </span>
            ) : (
              <div className="flex items-center space-x-1.5">
                {patient.status === 'inactive' && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-[1px] rounded-full dark:bg-slate-800 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                    Inativo
                  </span>
                )}
                <span className={`h-2.5 w-2.5 rounded-full bg-${statusColor}-500 ring-2 ring-white dark:ring-slate-800 transition-all duration-300`} />
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-foreground-muted mt-0.5 font-mono tracking-wide">
          {privacyCtx.getMaskedValue(patient.cpf, 'cpf', `list-cpf-${patient.id}`)}
        </p>
      </div>
    </div>
  );
}, (prev, next) => prev.isSelected === next.isSelected && prev.patient === next.patient && prev.isSelectionMode === next.isSelectionMode && prev.folders === next.folders);

interface PatientListProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string) => void;
  onAddPatient: () => void;
  onShowStaffManagement: () => void;
  onShowAdminDashboard: () => void;
  onImportData: (fileContent: string) => void;
  onToggleCollapse: () => void;
  onUpdatePatient: (id: string, updates: Partial<Patient>) => void;
  onReorderPatients?: (orderedIds: string[]) => void;
}

const PatientList: React.FC<PatientListProps> = ({
  patients, selectedPatientId,
  onSelectPatient, onAddPatient, onShowStaffManagement,
  onShowAdminDashboard, onImportData, onToggleCollapse,
  onUpdatePatient, onReorderPatients
}) => {
  const { currentUser } = useAuth();
  const { can } = usePermissions();
  const { 
    isLoadingData, refreshPatients, restorePatient, updateMultiplePatients 
  } = usePatientContext(); 
  const { addToast } = useToast();
  const { exportPatientsCSV } = useDataExport();
  const privacyCtx = usePrivacyMode();
  const { folders, addFolder, deleteFolder } = useFolderOperations();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();

  const isRequestsTab = location.pathname.includes('/requests');
  const [patientListTab, setPatientListTab] = useState<'active'|'archived'|'requests'>(isRequestsTab ? 'requests' : 'active');
  const selectedRequestId = isRequestsTab ? patientId : null;
  const { pendingCount } = useSchedulingRequests();
  
  const selectRequest = (id: string | null) => {
      if (id) navigate(`/patients/requests/${id}`);
      else navigate(`/patients/requests`);
  };

  const handleToggleView = (mode: 'active' | 'archived' | 'requests') => {
    setPatientListTab(mode);
    if (mode === 'requests') {
        navigate('/patients/requests');
    } else {
        navigate('/patients');
        refreshPatients(mode === 'archived');
    }
  };

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [patientsToGroup, setPatientsToGroup] = useState<string[]>([]);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const {
    searchTerm, paginatedPatients, currentPage, totalPages, importFileRef,
    handleSearchChange, handlePageChange, triggerImport, handleFileSelected,
    isEmpty, hasPatients, isLoading
  } = usePatientList({ patients, isLoadingData, onImportData, patientListTab, selectedFolderId });

  const isDragDisabled = !!searchTerm || !!selectedFolderId || patientListTab !== 'active';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);

    // Se for o primeiro item a ser selecionado e já houver alguém na tela lendo dados
    if (newSet.size === 0 && selectedPatientId) {
      // Se clicou no paciente diferente do aberto, queremos o aberto + o novo.
      if (selectedPatientId !== id) {
        newSet.add(selectedPatientId);
      }
    }

    // Toggle normal
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setSelectedIds(newSet);
  };

  const handleCreateGroupFromSelection = () => {
    if (selectedIds.size < 1) return;
    setPatientsToGroup(Array.from(selectedIds));
    setIsGroupModalOpen(true);
  };

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const handleCreateGroup = async (name: string, color: string, finalSelectedIds: string[]) => {
    setIsCreatingGroup(true);
    addToast('Organizando pacientes no grupo...', 'info');

    try {
      const newFolder = await addFolder(name, color);

      // Prepara mutação em lote
      const updates = finalSelectedIds.map(pid => {
        const patient = patients.find(p => p.id === pid);
        const newFolderIds = new Set(patient?.folderIds || []);
        if (patient?.folderId) newFolderIds.add(patient.folderId);
        newFolderIds.add(newFolder.id);

        return {
          id: pid,
          partial: {
            folderIds: Array.from(newFolderIds),
            folderId: undefined
          }
        };
      });

      if (updateMultiplePatients) {
        await updateMultiplePatients(updates);
      } else {
        // Fallback caso não encontre no context
        updates.forEach(u => onUpdatePatient(u.id, u.partial));
      }

      // Reset selection and close modal correctly
      setSelectedIds(new Set());
      setPatientsToGroup([]);
      setIsGroupModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Erro ao criar grupo.', 'error');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    // 1. Drop on Folder
    if (over.data.current?.type === 'folder') {
      const folderId = over.data.current.folderId;
      const patient = patients.find(p => p.id === activeId);

      if (patient) {
        let newFolderIds = new Set(patient.folderIds || []);
        if (patient.folderId) newFolderIds.add(patient.folderId);
        if (folderId) newFolderIds.add(folderId);
        else if (selectedFolderId) newFolderIds.delete(selectedFolderId);

        onUpdatePatient(activeId, { folderIds: Array.from(newFolderIds), folderId: undefined });
      }
      // Select cleanup
      if (selectedIds.has(activeId)) {
        const newSet = new Set(selectedIds);
        newSet.delete(activeId);
        setSelectedIds(newSet);
      }
      return;
    }

    // 2. Reordering Logic
    if (activeId !== over.id && onReorderPatients && !isDragDisabled) {
      // We sort based on the VISIBLE PAGINATED LIST context.
      const activePatients = patients.filter(p => p.is_active !== false);
      const oldIndex = activePatients.findIndex(p => p.id === activeId);
      const newIndex = activePatients.findIndex(p => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(activePatients, oldIndex, newIndex).map(p => p.id);
        onReorderPatients(newOrder);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter} sensors={sensors}>
      <div className="flex h-full bg-transparent border-r border-border/40 transition-colors duration-200 min-w-0">

        {/* Main List */}
        <div className="flex-1 flex flex-col h-full bg-surface min-w-0">
          {/* Header & Tools - M3 Darker Gradient Area */}
          <div className="flex-shrink-0 px-4 pt-5 pb-3 bg-gradient-to-b from-surface-dim to-surface border-b border-border/20">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-on-surface tracking-tight">
                  {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Pacientes'}
                </h2>
              </div>
              <div className="flex items-center space-x-1.5">
                {selectedIds.size > 0 && (
                  <Button size="sm" onClick={handleCreateGroupFromSelection} disabled={isCreatingGroup} className={`mr-1 !rounded-full bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all duration-300 ${isCreatingGroup ? 'opacity-50' : ''}`}>
                    {isCreatingGroup ? 'Aguarde...' : `Criar Grupo (${selectedIds.size})`}
                  </Button>
                )}
                <button
                  onClick={privacyCtx.togglePrivacyMode}
                  title={privacyCtx.isPrivacyMode ? 'Revelar dados sensíveis' : 'Ocultar dados sensíveis (LGPD)'}
                  className={`min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-3 md:p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${privacyCtx.isPrivacyMode
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'text-foreground-muted hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  {privacyCtx.isPrivacyMode ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
                </button>
                <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="!rounded-xl min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center">
                  <ChevronLeftIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* View Mode Toggle — M3 Segmented Button */}
            <div className="flex items-center bg-surface-container-highest/60 rounded-full p-1 border border-border/30 shadow-sm mb-4 w-fit mx-auto lg:mx-0">
              <button
                onClick={() => handleToggleView('active')}
                className={`px-5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${patientListTab === 'active'
                  ? 'bg-surface dark:bg-slate-800 shadow-md text-primary dark:text-indigo-400 scale-[1.02]'
                  : 'text-foreground-muted hover:text-on-surface dark:hover:text-slate-300'
                  }`}
              >
                Ativos
              </button>
              <button
                onClick={() => handleToggleView('requests')}
                className={`px-5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 ${patientListTab === 'requests'
                  ? 'bg-surface dark:bg-slate-800 shadow-md text-primary dark:text-indigo-400 scale-[1.02]'
                  : 'text-foreground-muted hover:text-on-surface dark:hover:text-slate-300'
                  }`}
              >
                Solicitações
                {pendingCount > 0 && (
                  <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold ${patientListTab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-surface-container-low text-foreground-muted font-bold'}`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search & Folders (Hidden in Requests tab) */}
            <div className={`transition-all duration-300 overflow-hidden ${patientListTab === 'requests' ? 'opacity-0 max-h-0' : 'opacity-100 max-h-[120px]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 bg-surface-container/50 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-on-surface placeholder-foreground-muted/60 transition-all duration-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/40 focus:outline-none focus:scale-[1.005]"
                />
                
                {/* Discreet Archived Toggle */}
                <button
                  onClick={() => handleToggleView(patientListTab === 'archived' ? 'active' : 'archived')}
                  title={patientListTab === 'archived' ? "Ocultar Arquivados" : "Exibir Arquivados"}
                  className={`flex-shrink-0 flex items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                    patientListTab === 'archived'
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-surface-container/50 text-foreground-muted border-border/80 hover:bg-surface-container-high'
                  }`}
                >
                  {patientListTab === 'archived' ? <EyeIcon className="h-4.5 w-4.5" /> : <EyeOffIcon className="h-4.5 w-4.5" />}
                </button>
              </div>

              {/* --- CHIPS SCROLL AREA --- */}
              <div className="flex items-center overflow-x-auto no-scrollbar pb-1 mask-linear-fade space-x-2 mb-2">
                <FolderChip folder={null} isSelected={selectedFolderId === null} onClick={() => setSelectedFolderId(null)} />
                {folders.map(folder => (
                  <FolderChip key={folder.id} folder={folder} isSelected={selectedFolderId === folder.id} onClick={() => setSelectedFolderId(folder.id)} onDelete={() => setFolderToDelete(folder)} />
                ))}
                <button onClick={() => { setPatientsToGroup([]); setIsGroupModalOpen(true); }} className="flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium bg-surface-container text-foreground-muted hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 transition-all duration-300 whitespace-nowrap border border-dashed border-border " title="Nova Pasta">
                  <PlusIcon className="h-4 w-4 mr-1" /> Nova
                </button>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-[0.3cm] pb-[0.3cm] min-w-0" tabIndex={0}>
            {patientListTab === 'requests' ? (
              <div className="px-1 pt-1 h-full">
                <SchedulingRequestsList isMasterList selectedRequestId={selectedRequestId} onSelectRequest={selectRequest} />
              </div>
            ) : isLoading ? (
              <div className="flex flex-col space-y-[0.3cm] px-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-surface-container/50 animate-pulse rounded-2xl border border-border/20"></div>
                ))}
              </div>
            ) : !isEmpty ? (
              <SortableContext items={paginatedPatients?.map(p => p.id) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-[0.3cm]">
                  {paginatedPatients?.map((patient) => (
                    <React.Fragment key={patient.id}>
                      <PatientListItem
                        patient={patient}
                        folders={folders}
                        isSelected={selectedIds.has(patient.id) || selectedPatientId === patient.id}
                        onSelect={(id) => onSelectPatient(id)}
                        isSelectionMode={selectedIds.size > 0}
                        toggleSelection={toggleSelection}
                        isDragDisabled={isDragDisabled}
                      />
                      {patientListTab === 'archived' && (
                        <div className="flex justify-end pr-4 pb-1">
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); restorePatient(patient.id); }} className="!rounded-full text-xs">
                            Restaurar
                          </Button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center mb-3">
                  <UserGroupIcon className="h-6 w-6 text-slate-300 " />
                </div>
                <p className="text-sm text-foreground-muted ">
                  {patientListTab === 'archived'
                    ? 'Nenhum paciente arquivado.'
                    : (hasPatients ? 'Nenhum nesta pasta.' : 'Lista vazia.')}
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="border-t border-border/70 p-4 space-y-3 bg-surface/80 backdrop-blur-sm">
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button variant="secondary" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="!rounded-xl">Anterior</Button>
                <span className="text-xs text-foreground-muted font-medium">{currentPage} / {totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="!rounded-xl">Próximo</Button>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <Button variant="ghost" size="sm" onClick={triggerImport} className="!rounded-xl"><SwitchHorizontalIcon className="h-4 w-4 mr-1" /> Importar</Button>
              <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleFileSelected} />
              <Button variant="ghost" size="sm" onClick={async () => {
 addToast('Gerando lista...', 'info');
                const res = await exportPatientsCSV();
 if (res.success) addToast('Lista de pacientes exportada!', 'success');
 else addToast(res.error || 'Erro', 'error');
              }} className="!rounded-xl"><DownloadIcon className="h-4 w-4 mr-1" /> Exportar</Button>
            </div>
            <Button onClick={onAddPatient} disabled={!can('patient:create')} className="w-full !rounded-xl">
              <PlusIcon /> <span className="ml-2">Novo Paciente</span>
            </Button>
          </div>
        </div>

        <CreateGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => {
            setIsGroupModalOpen(false);
            setSelectedIds(new Set()); // Limpa flag visual de ctrl click da lista de paciente
            setPatientsToGroup([]); // Zera a flag invisivel
          }}
          onSave={handleCreateGroup}
          initialName={patientsToGroup.length > 0 ? "Novo Grupo" : ""}
          preSelectedIds={patientsToGroup}
          patients={patients}
        />
        <DeleteFolderConfirmModal isOpen={!!folderToDelete} folder={folderToDelete} onClose={() => setFolderToDelete(null)} onConfirm={() => { if (folderToDelete) { deleteFolder(folderToDelete.id); if (selectedFolderId === folderToDelete.id) setSelectedFolderId(null); setFolderToDelete(null); } }} affectedPatients={folderToDelete ? patients.filter(p => (p.folderIds?.includes(folderToDelete.id)) || p.folderId === folderToDelete.id) : []} />
        <DragOverlay>
          {/* ... */}
        </DragOverlay>
      </div>
    </DndContext >
  );
};

export default PatientList;
