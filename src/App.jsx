import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Shop from './Pages/Shop';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/login" element={<div className="p-8 text-center text-xl">Login Route Placeholder</div>} />
            <Route path="/register" element={<div className="p-8 text-center text-xl">Register Route Placeholder</div>} />
            <Route path="/dashboard" element={<div className="p-8 text-center text-xl">Dashboard Route Placeholder</div>} />
        </Routes>
    );
}
