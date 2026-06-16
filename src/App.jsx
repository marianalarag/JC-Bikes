import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Shop from "./Pages/Shop";
import Login from "./Pages/Login";
import Register from "./Pages/Register.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ProtectedRoute from "./Components/ProtectedRoute.jsx";
import ProductDetail from "./Pages/ProductDetail";
import AdminProducts from "./Pages/AdminProducts";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="admin">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminProducts />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
