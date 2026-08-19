import React from 'react';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    hideSubText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', hideSubText = false, ...props }) => {
    return (
        <div className={`flex items-center text-primary ${className}`} {...props}>
            <div className="font-[Georgia,serif] text-[1.8em] leading-none mr-[0.3em] font-normal">
                Ψ
            </div>
            <div className="flex flex-col">
                <div className="text-[1em] font-black uppercase tracking-[0.04em] leading-none">
                    Mentis
                </div>
                {!hideSubText && (
                    <div className="text-[0.45em] font-bold uppercase tracking-[0.04em] opacity-80 mt-[0.2em] leading-none whitespace-nowrap">
                        Psicologia Clínica Baseada em Evidências
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logo;
