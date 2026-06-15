import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext as useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAdminAuthenticated, isAdminAuthLoading } = useAuth();

    if (isAdminAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
                <div className="w-10 h-10 border-4 border-news-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdminAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};
