import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [resetLink, setResetLink] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            addToast('გთხოვთ შეიყვანოთ ელ-ფოსტა', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            addToast('არასწორი ელ-ფოსტის ფორმატი', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await requestPasswordReset(email);
            addToast(response.message, response.success ? 'success' : 'error');

            if (response.success) {
                const link = '';
                setEmailSent(true);
                console.log('🔐 Reset Link:', window.location.origin + link);
            }
        } catch (error) {
            addToast('მოთხოვნის დროს მოხდა შეცდომა', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (emailSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border-t-4 border-green-500">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <Send className="text-green-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-news-black mb-4">პაროლის აღდგენის ლინკი</h2>
                        <p className="text-gray-600 mb-4">
                            დემო რეჟიმში, პაროლის აღდგენის ლინკი ქვემოთ არის:
                        </p>
                    </div>

                    {resetLink && (
                        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <p className="text-xs text-gray-600 mb-2">დააჭირეთ ლინკს:</p>
                            <button
                                onClick={() => navigate(resetLink)}
                                className="w-full text-left p-3 bg-white border border-blue-300 rounded text-sm text-blue-600 hover:bg-blue-50 transition-colors break-all font-mono"
                            >
                                {window.location.origin}{resetLink}
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/admin/login')}
                            className="w-full bg-news-accent text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors"
                        >
                            შესვლაზე დაბრუნება
                        </button>
                        <button
                            onClick={() => { setEmailSent(false); setResetLink(''); }}
                            className="w-full text-gray-600 hover:text-news-accent transition-colors text-sm"
                        >
                            ხელახლა გაგზავნა
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <Mail className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-news-black mb-2">პაროლის აღდგენა</h1>
                    <p className="text-gray-600">შეიყვანეთ თქვენი ელ-ფოსტა პაროლის აღსადგენად</p>
                </div>

                <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-news-accent">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                                ელ-ფოსტა
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-news-accent outline-none transition-all"
                                    placeholder="example@domain.com"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-news-accent text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    გაგზავნა...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    აღდგენის ლინკის გაგზავნა
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/admin/login')}
                            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-news-accent transition-colors mx-auto"
                        >
                            <ArrowLeft size={16} />
                            უკან შესვლაზე
                        </button>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>შენიშვნა:</strong> პაროლის აღდგენის ლინკი ვალიდურია 1 საათის განმავლობაში.
                    </p>
                </div>
            </div>
        </div>
    );
};
