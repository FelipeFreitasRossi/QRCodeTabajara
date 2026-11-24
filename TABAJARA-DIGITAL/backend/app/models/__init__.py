from app.models.admin_user import AdminUser
from app.models.category import Category
from app.models.customer import Customer
from app.models.loyalty import LoyaltyAccount, LoyaltySettings, LoyaltyTransaction, TransactionType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.reward import BirthdayGift, Reward
from app.models.table import DiningTable

# Todos os documentos registrados no Beanie. Ao criar um novo modelo, adicione aqui.
DOCUMENT_MODELS = [
    Category,
    Product,
    DiningTable,
    AdminUser,
    Order,
    Customer,
    LoyaltySettings,
    LoyaltyAccount,
    LoyaltyTransaction,
    Reward,
    BirthdayGift,
]

__all__ = [
    "AdminUser",
    "BirthdayGift",
    "Reward",
    "Category",
    "Customer",
    "DiningTable",
    "DOCUMENT_MODELS",
    "LoyaltyAccount",
    "LoyaltySettings",
    "LoyaltyTransaction",
    "Order",
    "OrderItem",
    "OrderStatus",
    "Product",
    "TransactionType",
]
