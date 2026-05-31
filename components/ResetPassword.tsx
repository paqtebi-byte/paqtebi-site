import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyResetToken, resetPassword } from '../services/authService';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useToast } from '../context/ToastContext';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { isPasswordValid } from '../utils/passwordUtils';

export const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        let mounted = true;

        verifyResetToken(token).then((response) => {
            if (!mounted) return;
            setTokenValid(response.success);
            if (!response.success) {
                addToast(response.message, 'error');
            }
        });

        return () => {
            mounted = false;
        };
    }, [token, addToast]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!password) {
            newErrors.password = 'პაროლი სავალდებულოა';
        } else if (!isPasswordValid(password)) {
            newErrors.password = 'პაროლი არ აკმაყოფილებს მოთხოვნებს';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'პაროლები არ ემთხვევა';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await resetPassword(token, password);

            if (response.success) {
                addToast(response.message, 'success');
                navigate('/admin/login', { state: { passwordReset: true } });
            } else {
                addToast(response.message, 'error');
            }
        } catch (error) {
            addToast('პაროლის შეცვლის დროს მოხდა შეცდომა', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (tokenValid === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-news-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">ტოკენის შემოწმება...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border-t-4 border-red-500 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <X className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-news-black mb-4">არასწორი ლინკი</h2>
                    <p className="text-gray-600 mb-6">
                        პაროლის აღდგენის ლინკი არასწორია ან ვადაგასულია.
                    </p>
                    <button
                        onClick={() => navigate('/admin/forgot-password')}
                        className="w-full bg-news-accent text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
                    >
                        ხელახლა მოთხოვნა
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <Lock className="text-green-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-news-black mb-2">ახალი პაროლის დაყენება</h1>
                    <p className="text-gray-600">შეიყვანეთ თქვენი ახალი პაროლი</p>
                </div>

                <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-news-accent">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                                ახალი პაროლი
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="შეიყვანეთ ახალი პაროლი"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                            <PasswordStrengthIndicator password={password} />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                                პაროლის დადასტურება
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="გაიმეორეთ ახალი პაროლი"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-news-accent text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    პაროლის შეცვლა...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    პაროლის შეცვლა
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Missing import
import { X } from 'lucide-react';
