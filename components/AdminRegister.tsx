import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerAdmin } from '../services/authService';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useToast } from '../context/ToastContext';
import { UserPlus, Eye, EyeOff, Mail, User, Lock, ArrowLeft } from 'lucide-react';
import { isPasswordValid } from '../utils/passwordUtils';

export const AdminRegister: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'მომხმარებლის სახელი სავალდებულოა';
        } else if (formData.username.length < 3) {
            newErrors.username = 'მომხმარებლის სახელი უნდა იყოს მინიმუმ 3 სიმბოლო';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'ელ-ფოსტა სავალდებულოა';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'არასწორი ელ-ფოსტის ფორმატი';
        }

        if (!formData.password) {
            newErrors.password = 'პაროლი სავალდებულოა';
        } else if (!isPasswordValid(formData.password)) {
            newErrors.password = 'პაროლი არ აკმაყოფილებს მოთხოვნებს';
        }

        if (formData.password !== formData.confirmPassword) {
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
            const response = registerAdmin(
                formData.username,
                formData.email,
                formData.password
            );

            if (response.success) {
                addToast(response.message, 'success');
                navigate('/admin/login', { state: { registered: true } });
            } else {
                addToast(response.message, 'error');
            }
        } catch (error) {
            addToast('რეგისტრაციის დროს მოხდა შეცდომა', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-news-accent rounded-full mb-4">
                        <UserPlus className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-news-black mb-2">ადმინის რეგისტრაცია</h1>
                    <p className="text-gray-600">შექმენით ახალი ადმინისტრატორის ანგარიში</p>
                </div>

                {/* Form */}
                <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-news-accent">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">
                                მომხმარებლის სახელი
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.username ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="შეიყვანეთ მომხმარებლის სახელი"
                                />
                            </div>
                            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                                ელ-ფოსტა
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="example@domain.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                                პაროლი
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="შეიყვანეთ პაროლი"
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
                            <PasswordStrengthIndicator password={formData.password} />
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
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="გაიმეორეთ პაროლი"
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
                                    რეგისტრაცია...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    რეგისტრაცია
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center space-y-2">
                        <button
                            onClick={() => navigate('/admin/login')}
                            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-news-accent transition-colors mx-auto"
                        >
                            <ArrowLeft size={16} />
                            უკან შესვლაზე
                        </button>
                    </div>
                </div>

                {/* Info Notice */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>შენიშვნა:</strong> რეგისტრაციის შემდეგ თქვენს ელ-ფოსტაზე გამოიგზავნება ვერიფიკაციის ლინკი.
                    </p>
                </div>
            </div>
        </div>
    );
};
