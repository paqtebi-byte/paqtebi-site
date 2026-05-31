import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginAdminSecure } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Lock, Eye, EyeOff, User, UserPlus, ArrowLeft, Shield } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({ username: '', password: '', secretCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as any;
    if (state?.registered) {
      addToast('რეგისტრაცია წარმატებით დასრულდა! გთხოვთ შეხვიდეთ სისტემაში', 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.passwordReset) {
      addToast('პაროლი წარმატებით შეიცვალა! გთხოვთ შეხვიდეთ ახალი პაროლით', 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.username || !formData.password || !formData.secretCode) {
      setError('გთხოვთ შეავსოთ ყველა ველი');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await loginAdminSecure(formData.username, formData.password, formData.secretCode);
      if (response.success) {
        addToast(response.message, 'success');
        navigate('/admin');
      } else {
        setError(response.message);
      }
    } catch {
      setError('შესვლის დროს მოხდა შეცდომა');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 40%, #0a0a0a 100%)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Background pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220,38,38,0.15) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(220,38,38,0.08) 0%, transparent 40%)`,
        }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        <div className="relative z-10 text-center">
          <BrandLogo className="h-24 w-32 mx-auto mb-8 drop-shadow-2xl" />
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight uppercase">Paqtebi</h1>
          <p className="text-gray-400 text-lg mb-10">Admin Control Panel</p>

          <div className="space-y-4 text-left">
            {[
              { icon: '📰', title: 'სტატიების მართვა', desc: 'შექმენი, რედაქტირება, გამოაქვეყნე' },
              { icon: '👥', title: 'მომხმარებლები', desc: 'მართე სარედაქციო გუნდი' },
              { icon: '📊', title: 'ანალიტიკა', desc: 'ნახე საიტის სტატისტიკა' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-2xl">{item.icon}</div>
                <div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-gray-500 text-xs">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">მთავარ გვერდზე</span>
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <BrandLogo className="h-16 w-24 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Paqtebi</h1>
            <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-news-accent rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">ავტორიზაცია</h2>
                <p className="text-gray-500 text-xs">შეიყვანეთ თქვენი მონაცემები</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  მომხმარებლის სახელი
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused === 'username' ? 'text-news-accent' : 'text-gray-600'}`}
                  />
                  <input
                    id="username"
                    type="text"
                    autoFocus
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    onFocus={() => setFocused('username')}
                    onBlur={() => setFocused(null)}
                    className="w-full pl-10 pr-4 py-3 text-sm text-white rounded-xl transition-all outline-none"
                    style={{
                      background: focused === 'username' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.06)',
                      border: focused === 'username' ? '1.5px solid rgba(220,38,38,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                    }}
                    placeholder="შეიყვანეთ სახელი"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  პაროლი
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused === 'password' ? 'text-news-accent' : 'text-gray-600'}`}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full pl-10 pr-11 py-3 text-sm text-white rounded-xl transition-all outline-none"
                    style={{
                      background: focused === 'password' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.06)',
                      border: focused === 'password' ? '1.5px solid rgba(220,38,38,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                    }}
                    placeholder="შეიყვანეთ პაროლი"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Secret Code */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  საიდუმლო კოდი
                </label>
                <div className="relative">
                  <Shield
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused === 'secretCode' ? 'text-news-accent' : 'text-gray-600'}`}
                  />
                  <input
                    id="secretCode"
                    type="password"
                    value={formData.secretCode}
                    onChange={(e) => setFormData({ ...formData, secretCode: e.target.value })}
                    onFocus={() => setFocused('secretCode')}
                    onBlur={() => setFocused(null)}
                    className="w-full pl-10 pr-4 py-3 text-sm text-white rounded-xl transition-all outline-none"
                    style={{
                      background: focused === 'secretCode' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.06)',
                      border: focused === 'secretCode' ? '1.5px solid rgba(220,38,38,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                    }}
                    placeholder="შეიყვანეთ საიდუმლო კოდი"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm text-red-400 animate-fade-in" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Forgot */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/admin/forgot-password')}
                  className="text-xs text-gray-500 hover:text-news-accent transition-colors"
                >
                  დაგავიწყდა პაროლი?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-white transition-all text-sm"
                style={{ background: isSubmitting ? '#7f1d1d' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)' }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    შესვლა...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    სისტემაში შესვლა
                  </>
                )}
              </button>
            </form>

          </div>

          <p className="text-center text-xs text-gray-700 mt-6">
            © {new Date().getFullYear()} Paqtebi Admin Panel. უსაფრთხო კავშირი.
          </p>
        </div>
      </div>
    </div>
  );
};
