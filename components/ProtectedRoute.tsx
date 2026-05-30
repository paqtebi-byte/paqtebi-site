import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAdminAuthenticated } = useAuth();

    if (!isAdminAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};
