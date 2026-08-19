import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MoonIcon, SunIcon } from '../Icons';
import { User, Settings, LogOut } from 'lucide-react';

interface UserMenuProps {
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
    onOpenSettings?: (tab?: 'profile' | 'hours' | 'organization') => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ theme, toggleTheme, onOpenSettings }) => {
    const { currentUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentUser) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-surface-container-low transition-colors"
                title="Menu do Usuário"
            >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm ring-2 ring-surface">
                    {currentUser.name.charAt(0).toUpperCase()}
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-xl py-1 ring-1 ring-black ring-opacity-5 z-50 transform origin-top-right transition-all">
                    <div className="px-4 py-3 text-sm text-foreground-muted border-b border-border bg-surface rounded-t-lg">
                        <span className="block text-xs uppercase font-semibold tracking-wider mb-1">Conta</span>
                        <span className="font-bold text-on-surface truncate block capitalize text-base">{currentUser.name}</span>
                        <span className="text-xs text-foreground-muted block truncate">{currentUser.email}</span>
                    </div>

                    <div className="py-1">
                        {toggleTheme && (
                            <button
                                onClick={() => { toggleTheme(); }}
                                className="w-full text-left px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low flex items-center justify-between group"
                            >
                                <span className="flex items-center">
                                    {theme === 'dark' ? <SunIcon className="mr-2 h-4 w-4 text-foreground-muted group-hover:text-yellow-500" /> : <MoonIcon className="mr-2 h-4 w-4 text-foreground-muted group-hover:text-blue-500" />}
                                    {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                                </span>
                            </button>
                        )}

                        {onOpenSettings && (
                            <>
                                <button
                                    onClick={() => { setIsOpen(false); onOpenSettings('profile'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low flex items-center group"
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    Perfil
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); onOpenSettings('organization'); }}
                                    className="w-full text-left px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low flex items-center justify-between group"
                                >
                                    <span className="flex items-center">
                                        <Settings className="mr-2 h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
                                        Configurações
                                    </span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="border-t border-border pt-1">
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center group"
                        >
                            <LogOut className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            Sair
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
