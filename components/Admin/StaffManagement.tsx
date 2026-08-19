
import React, { useState, useMemo } from 'react';
import type { User } from '@/types.ts';
import Button from '../Button.tsx';
import { UserCircleIcon } from '../Icons';

interface StaffManagementProps {
  currentUser: User;
  allUsers: User[];
  onLinkStaff: (staffEmail: string) => Promise<{ success: boolean; error?: string }>;
  onUnlinkStaff: (staffId: string) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ currentUser, allUsers, onLinkStaff, onUnlinkStaff }) => {
  const [staffEmail, setStaffEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const linkedStaffMember = useMemo(() => {
    const linkedId = currentUser.linkedUserIds?.[0];
    if (!linkedId) return null;
    return allUsers.find(u => u.id === linkedId);
  }, [currentUser, allUsers]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await onLinkStaff(staffEmail);

    if (result.success) {
      setSuccessMessage('Funcionário vinculado com sucesso!');
      setStaffEmail('');
    } else {
      setError(result.error || 'Ocorreu um erro desconhecido.');
    }
    setIsLoading(false);
  };

  const handleUnlink = () => {
    if (linkedStaffMember) {
      onUnlinkStaff(linkedStaffMember.id);
      setSuccessMessage('Funcionário desvinculado com sucesso!');
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8 bg-surface transition-colors duration-200">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">Gerenciar Equipe</h2>
        <p className=" text-foreground-muted mb-8">Vincule um funcionário à sua conta para permitir que ele gerencie seus pacientes.</p>

        {linkedStaffMember ? (
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-xl font-bold text-on-surface mb-4">Funcionário Vinculado</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <UserCircleIcon className="h-10 w-10 text-foreground-muted " />
                <div>
                  <p className="font-semibold text-on-surface ">{linkedStaffMember.name}</p>
                  <p className="text-sm text-foreground-muted ">{linkedStaffMember.email}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={handleUnlink}>
                Desvincular
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLink} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-xl font-bold text-on-surface mb-4">Vincular Novo Funcionário</h3>
            <p className="text-sm text-foreground-muted mb-4">Digite o e-mail do funcionário que você deseja vincular. A conta do funcionário já deve ter sido criada no sistema.</p>
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-start sm:space-x-2">
              <div className="flex-grow">
                <label htmlFor="staff-email" className="sr-only">Email do Funcionário</label>
                <input
                  type="email"
                  id="staff-email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="block w-full rounded-md border-border dark:bg-slate-700 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                  placeholder="email@do-funcionario.com"
                  required
                />
              </div>
              <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </form>
        )}

        {successMessage && <p className="mt-4 text-sm text-green-600 dark:text-green-400 text-center">{successMessage}</p>}
      </div>
    </div>
  );
};

export default StaffManagement;
