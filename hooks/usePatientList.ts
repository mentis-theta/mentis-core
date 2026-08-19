import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Patient } from '../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';

interface UsePatientListProps {
  patients: Patient[];
  isLoadingData?: boolean;
  onImportData: (fileContent: string) => void;
  itemsPerPage?: number;
  patientListTab?: 'active' | 'archived' | 'requests';
  selectedFolderId?: string | null;
}

export const usePatientList = ({ patients, isLoadingData = false, onImportData, itemsPerPage = 15, patientListTab = 'active', selectedFolderId = null }: UsePatientListProps) => {
 const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Filter Logic
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    // 1. Filter by View Mode (Active vs Archived)
    let list = patients.filter(p => patientListTab === 'archived' ? p.is_active === false : p.is_active !== false);

    // 2. Filter by Folder
    if (selectedFolderId) {
      list = list.filter(p =>
        (p.folderIds && p.folderIds.includes(selectedFolderId)) ||
        p.folderId === selectedFolderId
      );
    }

    // 3. Filter by Search Term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        list = list.filter(p => 
          p.name.toLowerCase().includes(term) ||
          p.cpf.includes(term)
        );
    }

    return list;
  }, [patients, searchTerm, patientListTab, selectedFolderId]);

  // Reset pagination on filter change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, patientListTab, selectedFolderId]);

  // Pagination Logic
  const totalPages = filteredPatients ? Math.ceil(filteredPatients.length / itemsPerPage) : 0;
  const paginatedPatients = useMemo(() => 
    filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredPatients, currentPage, itemsPerPage]
  );

  // Handlers
  const handleSearchChange = (term: string) => setSearchTerm(term);
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const triggerImport = () => {
    importFileRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        onImportData(fileContent);
      };
 reader.onerror = () => addToast("Erro ao ler arquivo", "error");
      reader.readAsText(file);
      e.target.value = ''; // Reset input
    }
  };

  return {
    searchTerm,
    paginatedPatients,
    currentPage,
    totalPages,
    importFileRef,
    handleSearchChange,
    handlePageChange,
    triggerImport,
    handleFileSelected,
    isEmpty: patients.length === 0 && !isLoadingData,
    hasPatients: patients.length > 0,
    isLoading: isLoadingData
  };
};