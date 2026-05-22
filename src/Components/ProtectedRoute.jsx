import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRole }) {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    let user = null;
    
    try {
        if (userString) user = JSON.parse(userString);
    } catch (e) {
        console.error("Error leyendo datos del usuario");
    }

    // Si no hay token, enviar al Login
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    // Si el rol es distinto al permitido, mandarlo a la tienda (o inicio)
    if (allowedRole && user.role !== allowedRole) {
        return <Navigate to="/shop" replace />;
    }

    // Si todo está bien, renderiza el componente protegido
    return children;
}