import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <AlertCircle className="mx-auto text-news-accent mb-4" size={80} />
                    <h1 className="text-6xl font-bold text-news-black mb-4">404</h1>
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">გვერდი ვერ მოიძებნა</h2>
                    <p className="text-gray-500">
                        სამწუხაროდ, თქვენ მიერ მოთხოვნილი გვერდი არ არსებობს.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 bg-news-accent text-white px-6 py-3 rounded-sm font-bold hover:bg-red-700 transition-colors shadow-md"
                >
                    <Home size={20} />
                    მთავარ გვერდზე დაბრუნება
                </button>
            </div>
        </div>
    );
};
