import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AssetList from "./pages/AssetList";
import AssetDetail from "./pages/AssetDetail";
import MyBids from "./pages/MyBids";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAssetForm from "./pages/AdminAssetForm";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AssetList /></ProtectedRoute>} />
        <Route path="/aset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
        <Route path="/bid-saya" element={<ProtectedRoute><MyBids /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/aset/baru" element={<ProtectedRoute adminOnly><AdminAssetForm /></ProtectedRoute>} />
        <Route path="/admin/aset/:id/ubah" element={<ProtectedRoute adminOnly><AdminAssetForm /></ProtectedRoute>} />
      </Routes>
    </>
  );
}
