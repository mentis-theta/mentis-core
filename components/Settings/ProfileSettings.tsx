import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '../Button';
import { useToast } from '@/contexts/ToastContext';

import { PersonalDataForm } from './sections/PersonalDataForm';
import { ProfessionalDataForm } from './sections/ProfessionalDataForm';



export const ProfileSettings: React.FC = () => (
    <div className="space-y-6">
        <PersonalDataForm />
        <ProfessionalDataForm />
    </div>
);
