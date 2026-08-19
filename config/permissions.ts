import { AppRole, AppPermission } from '../types';

export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  admin: [
    'patient:create', 'patient:view', 'patient:edit', 'patient:delete',
    'patient:transfer', 'patient:archive', 'patient:restore',
    'financial:view', 'financial:manage',
    'clinical_record:view', 'clinical_record:edit',
    'session:create', 'session:edit', 'session:delete',
    'settings:manage', 'reports:view', 'reports:export', 'system:manage'
  ],
  psychologist: [
    'patient:create', 'patient:view', 'patient:edit', 'patient:delete', 'patient:archive', 'patient:restore',
    'financial:view', 'financial:manage',
    'clinical_record:view', 'clinical_record:edit',
    'session:create', 'session:edit', 'session:delete',
    'settings:manage', 'reports:view', 'reports:export'
  ],
  staff: [
    'patient:create', 'patient:view', 'patient:edit',
    'financial:view', 'financial:manage',
    'session:create', 'session:edit', 'session:delete'
  ]
};
