import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserGroupIcon, CalendarIcon, ChartBarIcon, CurrencyDollarIcon, BookOpenIcon, CogIcon } from '../Icons';
import { Shield } from 'lucide-react';
import { Can } from '../Auth/Can';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    to: string;
    title?: string;
    id?: string;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, title, id, onClick }) => (
    <NavLink
        id={id}
        to={to}
        title={title ?? label}
        onClick={onClick}
        className={({ isActive }) => `flex flex-col items-center justify-center w-full py-1.5 gap-0.5 group focus:outline-none ${isActive ? 'active-nav-item' : ''}`}
    >
        {({ isActive }) => (
            <>
                {/* Pill indicator */}
                <span className={`
                    flex items-center justify-center
                    w-14 h-8 rounded-2xl
                    transition-all duration-200
                    ${isActive
                        ? 'bg-primary/10'
                        : 'group-hover:bg-primary/5 dark:group-hover:bg-white/5'
                    }
                `}>
                    <span className={`
                        transition-all duration-200
                        ${isActive
                            ? ' text-primary '
                            : ' text-on-surface-variant group-hover:text-on-surface'
                        }
                    `}>
                        {icon}
                    </span>
                </span>

                {/* Label */}
                <span className={`
                    text-[11px] leading-tight font-medium tracking-tight
                    transition-colors duration-200
                    ${isActive
                        ? ' text-primary '
                        : ' text-on-surface-variant group-hover:text-on-surface'
                    }
                `}>
                    {label}
                </span>
            </>
        )}
    </NavLink>
);

const Divider = () => (
    <div className="mx-3 my-1 border-t border-border/70 " />
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const { currentUser } = useAuth();

    return (
        <nav className={`
            fixed md:static inset-y-0 left-0 z-50
            w-20 h-full
            bg-surface/70 backdrop-blur-md  
            border-r border-border/80   
            flex flex-col items-center
            pt-4 pb-4
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 shadow-none'}
        `}>
            <div className="flex flex-col w-full space-y-0.5 mt-1 px-1">
                <NavItem
                    icon={<ChartBarIcon className="h-5 w-5" />}
                    label="Visão Geral"
                    to="/dashboard"
                    onClick={onClose}
                />
                <NavItem
                    icon={<CurrencyDollarIcon className="h-5 w-5" />}
                    label="Financeiro"
                    to="/financial"
                    onClick={onClose}
                />

                <Divider />

                <NavItem
                    id="tour-pacientes"
                    icon={<UserGroupIcon className="h-5 w-5" />}
                    label="Pacientes"
                    to="/patients"
                    onClick={onClose}
                />
                <NavItem
                    id="tour-agenda"
                    icon={<CalendarIcon className="h-5 w-5" />}
                    label="Agenda"
                    to="/calendar"
                    onClick={onClose}
                />
                <NavItem
                    icon={<BookOpenIcon className="h-5 w-5" />}
                    label="Biblioteca"
                    to="/library"
                    onClick={onClose}
                />

                <Can perform="settings:manage">
                    <>
                        <Divider />
                        <NavItem
                            icon={<UserGroupIcon className="h-5 w-5" />}
                            label="Equipe"
                            to="/staff"
                            onClick={onClose}
                        />
                    </>
                </Can>

                <Can perform="system:manage">
                    <>
                        <Divider />
                        <NavItem
                            icon={<Shield className="h-5 w-5" />}
                            label="Admin"
                            to="/admin"
                            onClick={onClose}
                        />
                    </>
                </Can>
            </div>

            <div className="flex-1" />
            <Divider />

            <div className="w-full px-1 pb-3">
                <NavItem
                    id="tour-meu-link"
                    icon={<CogIcon className="h-5 w-5" />}
                    label="Config."
                    to="/settings"
                    onClick={onClose}
                />
            </div>
        </nav>
    );
};

export default Sidebar;
