import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Shop from './Pages/Shop';
import Login from './Pages/Login';
import Register from './Pages/Register.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import ProtectedRoute from './Components/ProtectedRoute.jsx';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
                <ProtectedRoute allowedRole="admin">
                    <Dashboard />
                </ProtectedRoute>
            } />
        </Routes>
    );
}
