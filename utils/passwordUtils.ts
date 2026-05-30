// Simple password hashing utility (production would use bcrypt)
export const hashPassword = (password: string): string => {
    // Simple hash simulation - in production use bcrypt
    let hash = 0;
    const salt = 'paqtebi_salt_2024';
    const combined = password + salt;

    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return `hash_${Math.abs(hash).toString(36)}`;
};

export const verifyPassword = (password: string, hash: string): boolean => {
    return hashPassword(password) === hash;
};

export interface PasswordStrength {
    score: number; // 0-4
    label: 'ძალიან სუსტი' | 'სუსტი' | 'საშუალო' | 'ძლიერი' | 'ძალიან ძლიერი';
    color: string;
    requirements: {
        minLength: boolean;
        hasUpperCase: boolean;
        hasLowerCase: boolean;
        hasNumber: boolean;
        hasSpecialChar: boolean;
    };
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;

    let score: number;
    let label: PasswordStrength['label'];
    let color: string;

    if (metRequirements === 0 || password.length === 0) {
        score = 0;
        label = 'ძალიან სუსტი';
        color = '#ef4444';
    } else if (metRequirements <= 2) {
        score = 1;
        label = 'სუსტი';
        color = '#f97316';
    } else if (metRequirements === 3) {
        score = 2;
        label = 'საშუალო';
        color = '#eab308';
    } else if (metRequirements === 4) {
        score = 3;
        label = 'ძლიერი';
        color = '#84cc16';
    } else {
        score = 4;
        label = 'ძალიან ძლიერი';
        color = '#22c55e';
    }

    return { score, label, color, requirements };
};

export const isPasswordValid = (password: string): boolean => {
    const strength = validatePasswordStrength(password);
    return Object.values(strength.requirements).every(Boolean);
};

export const generateResetToken = (): string => {
    return `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateVerificationToken = (): string => {
    return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
