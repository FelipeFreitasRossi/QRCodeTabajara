import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '../components/admin/AdminLayout'
import { RequireAuth } from '../components/admin/RequireAuth'
import { CartPage } from '../pages/CartPage'
import { ClubPage } from '../pages/ClubPage'
import { MenuPage } from '../pages/MenuPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrderStatusPage } from '../pages/OrderStatusPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { TableQrPage } from '../pages/TableQrPage'
import { ClubAdminPage } from '../pages/admin/ClubAdminPage'
import { CallsPage } from '../pages/admin/CallsPage'
import { CategoriesPage } from '../pages/admin/CategoriesPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { LoginPage } from '../pages/admin/LoginPage'
import { OrdersPage } from '../pages/admin/OrdersPage'
import { ProductFormPage } from '../pages/admin/ProductFormPage'
import { ProductsPage } from '../pages/admin/ProductsPage'
import { TablesPage } from '../pages/admin/TablesPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Site do cliente. O QR Code de cada mesa aponta para /m/<código> (gerado no painel). */}
      <Route path="/" element={<Navigate to="/cardapio" replace />} />
      <Route path="/cardapio" element={<MenuPage />} />
      <Route path="/carrinho" element={<CartPage />} />
      <Route path="/pedido/:code" element={<OrderStatusPage />} />
      <Route path="/m/:token" element={<TableQrPage />} />
      {/* O QR "Chamar atendente" abre outro site (pasta frontend-chamar); os chamados chegam em /admin/chamados. */}
      <Route path="/clube" element={<ClubPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />

      {/* Painel administrativo (protegido por login) */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="chamados" element={<CallsPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="produtos/novo" element={<ProductFormPage />} />
        <Route path="produtos/:id" element={<ProductFormPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="mesas" element={<TablesPage />} />
        <Route path="clube" element={<ClubAdminPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
