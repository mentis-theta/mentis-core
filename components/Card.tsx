import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
}

const Card: React.FC<CardProps> = ({
    children,
    padding = 'md',
    className = '',
    ...props
}) => {
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-6 sm:p-8',
        lg: 'p-8 sm:p-10',
    };

    return (
        <div
            className={`bg-surface border border-border rounded-2xl md:rounded-[28px] shadow-sm text-foreground overflow-hidden ${paddingStyles[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
