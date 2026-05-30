import React from 'react';
import { validatePasswordStrength } from '../utils/passwordUtils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
    password: string;
    showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
    password,
    showRequirements = true,
}) => {
    const strength = validatePasswordStrength(password);

    if (!password) return null;

    return (
        <div className="mt-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: `${(strength.score / 4) * 100}%`,
                            backgroundColor: strength.color,
                        }}
                    />
                </div>
                <span className="text-xs font-bold" style={{ color: strength.color }}>
                    {strength.label}
                </span>
            </div>

            {/* Requirements Checklist */}
            {showRequirements && (
                <div className="space-y-1">
                    <RequirementItem
                        met={strength.requirements.minLength}
                        text="მინიმუმ 8 სიმბოლო"
                    />
                    <RequirementItem
                        met={strength.requirements.hasUpperCase}
                        text="მინიმუმ 1 დიდი ასო"
                    />
                    <RequirementItem
                        met={strength.requirements.hasLowerCase}
                        text="მინიმუმ 1 პატარა ასო"
                    />
                    <RequirementItem
                        met={strength.requirements.hasNumber}
                        text="მინიმუმ 1 ციფრი"
                    />
                    <RequirementItem
                        met={strength.requirements.hasSpecialChar}
                        text="მინიმუმ 1 სპეციალური სიმბოლო (!@#$%^&*)"
                    />
                </div>
            )}
        </div>
    );
};

const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
        {met ? <Check size={14} /> : <X size={14} />}
        <span>{text}</span>
    </div>
);
