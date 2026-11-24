import { AuthProvider } from './contexts/AuthProvider'
import { CartProvider } from './contexts/CartProvider'
import { ClubCartProvider } from './contexts/ClubCartProvider'
import { CustomerProvider } from './contexts/CustomerProvider'
import { FavoritesProvider } from './contexts/FavoritesProvider'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <FavoritesProvider>
          <CartProvider>
            <ClubCartProvider>
              <AppRoutes />
            </ClubCartProvider>
          </CartProvider>
        </FavoritesProvider>
      </CustomerProvider>
    </AuthProvider>
  )
}
