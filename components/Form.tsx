
import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { generateUUID } from '@/utils/uuid.ts';

// Design Tokens M3 — Neuro-Minimalismo Clínico
const LABEL_CLASS = "block text-xs font-medium  text-on-surface-variant    mb-1.5";
const SHARED_BASE_CLASS = "block w-full rounded-xl px-4  bg-surface-container-lowest  text-on-surface     outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const BORDER_DEFAULT = "border  border-border";
const BORDER_ERROR = "border border-red-500 focus:ring-red-600 focus:border-red-600";

const INPUT_CLASS = `${SHARED_BASE_CLASS} h-12`;
const TEXTAREA_CLASS = `${SHARED_BASE_CLASS} min-h-[120px] py-3`;

interface BaseFieldProps {
    label?: string;
    error?: string;
    helperText?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseFieldProps { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || generateUUID();
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div className="w-full">
            {label && <label htmlFor={inputId} className={LABEL_CLASS}>{label}</label>}
            <input
                id={inputId}
                ref={ref}
                aria-invalid={!!error}
                aria-describedby={errorId}
                className={`${INPUT_CLASS} ${error ? BORDER_ERROR : BORDER_DEFAULT} ${className}`}
                {...props}
            />
            {error && <p id={errorId} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-foreground-muted ">{helperText}</p>}
        </div>
    );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseFieldProps {
    options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, error, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || props.name || generateUUID();
    const errorId = error ? `${selectId}-error` : undefined;

    return (
        <div className="w-full">
            {label && <label htmlFor={selectId} className={LABEL_CLASS}>{label}</label>}
            <select
                id={selectId}
                ref={ref}
                aria-invalid={!!error}
                aria-describedby={errorId}
                className={`${INPUT_CLASS} ${error ? BORDER_ERROR : BORDER_DEFAULT} ${className}`}
                {...props}
            >
                {options ? options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                )) : children}
            </select>
            {error && <p id={errorId} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>}
        </div>
    );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps { }

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || props.name || generateUUID();
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
        <div className="w-full">
            {label && <label htmlFor={textareaId} className={LABEL_CLASS}>{label}</label>}
            <textarea
                id={textareaId}
                ref={ref}
                aria-invalid={!!error}
                aria-describedby={errorId}
                className={`${TEXTAREA_CLASS} ${error ? BORDER_ERROR : BORDER_DEFAULT} ${className}`}
                {...props}
            />
            {error && <p id={errorId} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">{error}</p>}
        </div>
    );
});

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ label, description, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name || generateUUID();
    return (
        <div className={`flex items-start ${className}`}>
            <div className="flex h-5 items-center">
                <input
                    id={checkboxId}
                    ref={ref}
                    type="checkbox"
                    className="h-4 w-4 rounded-lg border-border text-primary focus:ring-primary transition-colors duration-200"
                    {...props}
                />
            </div>
            <div className="ml-3 text-sm">
                <label htmlFor={checkboxId} className="font-medium text-foreground-muted ">{label}</label>
                {description && <p className=" text-foreground-muted ">{description}</p>}
            </div>
        </div>
    );
});
