import React, { useState } from 'react';
import { X, User, Lock, Mail, Chrome } from 'lucide-react';
import { loginPublicUser, loginWithOAuthProvider, registerPublicUser } from '../services/authService';
import { User as UserType } from '../types';
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (!formData.username || !formData.password) {
        setError('შეავსეთ სავალდებულო ველები');
        addToast('შეავსეთ სავალდებულო ველები', 'error');
        return;
      }
      const result = registerPublicUser(formData);
      if (result.success && result.user) {
        addToast('რეგისტრაცია წარმატებით დასრულდა', 'success');
        onLoginSuccess(result.user);
        onClose();
      } else {
        setError(result.message);
        addToast(result.message, 'error');
      }
    } else {
      const result = loginPublicUser(formData.username, formData.password);
      if (result.success && result.user) {
        addToast(`გამარჯობა, ${result.user.username}!`, 'success');
        onLoginSuccess(result.user);
        onClose();
      } else {
        setError(result.message);
        addToast(result.message, 'error');
      }
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setError('');
    setSocialLoading(provider);
    const result = await loginWithOAuthProvider(provider);
    if (result.success) {
      addToast(result.message, 'success');
    } else {
      setError(result.message);
      addToast(result.message, 'error');
      setSocialLoading(null);
    }
    return;
    /*
    // Simulation
    addToast(`${provider}-ით შესვლა წარმატებით დასრულდა (სიმულაცია)`, 'success');
    const mockUser = { username: `User_${provider}`, email: `user@${provider.toLowerCase()}.com` };
    onLoginSuccess(mockUser);
    onClose();
    */
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-news-accent rounded-sm"
          aria-label="დახურვა"
        >
          <X size={24} />
        </button>

        <div className="p-8">
          <h2 id="auth-modal-title" className="text-2xl font-bold text-news-black mb-6 text-center">
            {isRegistering ? 'რეგისტრაცია' : 'სისტემაში შესვლა'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-sm text-center border border-red-100" role="alert">
              {error}
            </div>
          )}

          {/* Social Login */}
          <div className="mb-6">
            <button 
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Chrome size={18} className="text-red-500" />
              <span className="text-sm font-medium text-gray-700">{socialLoading === 'google' ? 'იტვირთება...' : 'Google'}</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ან ელ-ფოსტით</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
              <input
                type="text"
                placeholder="მომხმარებლის სახელი"
                aria-label="მომხმარებლის სახელი"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-news-accent outline-none transition-shadow"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            {isRegistering && (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
                <input
                  type="email"
                  placeholder="ელ-ფოსტა (არასავალდებულო)"
                  aria-label="ელ-ფოსტა"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-news-accent outline-none transition-shadow"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
              <input
                type="password"
                placeholder="პაროლი"
                aria-label="პაროლი"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-news-accent outline-none transition-shadow"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-news-accent text-white font-bold py-3 rounded-sm hover:bg-red-700 transition-colors shadow-sm mt-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-news-accent"
            >
              {isRegistering ? 'დარეგისტრირება' : 'შესვლა'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isRegistering ? 'უკვე გაქვთ ანგარიში? ' : 'არ გაქვთ ანგარიში? '}
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-news-accent font-bold hover:underline focus:outline-none"
            >
              {isRegistering ? 'გაიარეთ ავტორიზაცია' : 'დარეგისტრირდით'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
