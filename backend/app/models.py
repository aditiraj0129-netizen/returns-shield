from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    account_created_at = Column(DateTime, server_default=func.now())
    total_orders = Column(Integer, default=0)
    total_returns = Column(Integer, default=0)
    city = Column(String)
    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    product_name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float, nullable=False)
    order_date = Column(DateTime, server_default=func.now())
    listing_image_url = Column(String)
    customer = relationship("Customer", back_populates="orders")
    returns = relationship("ReturnRequest", back_populates="order")


class ReturnRequest(Base):
    __tablename__ = "return_requests"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    reason = Column(String)
    return_image_url = Column(String)
    requested_at = Column(DateTime, server_default=func.now())
    damage_score = Column(Float, nullable=True)
    swap_similarity_score = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    risk_bucket = Column(String, nullable=True)
    reviewed = Column(Boolean, default=False)
    final_decision = Column(String, nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    order = relationship("Order", back_populates="returns")


# ── Marketplace Models ────────────────────────────────────────────────────────

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"
    id = Column(Integer, primary_key=True, index=True)

    # Seller info
    seller_name = Column(String, nullable=False)
    seller_email = Column(String, nullable=False)
    seller_phone = Column(String)
    seller_city = Column(String)

    # Product info
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)           # clothes / electronics / books / furniture / other
    brand = Column(String)
    original_price = Column(Float)      # price they paid
    selling_price = Column(Float)       # price they want
    reason_to_sell = Column(Text)
    purchase_platform = Column(String)  # Amazon / Flipkart / offline etc
    age_months = Column(Integer)        # how old is the product
    condition = Column(String)          # like_new / good / fair / poor

    # AI verification
    image_url = Column(String)
    damage_score = Column(Float, nullable=True)
    fraud_score = Column(Float, nullable=True)
    damage_breakdown = Column(Text, nullable=True)   # JSON string
    heatmap_seed = Column(String, nullable=True)
    ai_verdict = Column(String, nullable=True)       # approved / manual_review / rejected

    # Listing status
    status = Column(String, default="pending")       # pending / live / sold / rejected
    listed_at = Column(DateTime, server_default=func.now())
    platform_fee_pct = Column(Float, default=5.0)    # 5% platform fee from seller

    # Relations
    purchases = relationship("MarketplacePurchase", back_populates="listing")


class MarketplacePurchase(Base):
    __tablename__ = "marketplace_purchases"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.id"))

    # Buyer info
    buyer_name = Column(String, nullable=False)
    buyer_email = Column(String, nullable=False)
    buyer_phone = Column(String)
    delivery_address = Column(Text, nullable=False)
    buyer_city = Column(String)

    # Payment
    amount = Column(Float, nullable=False)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    payment_status = Column(String, default="pending")   # pending / paid / failed / refunded

    # Delivery
    delivery_status = Column(String, default="processing")
    # processing / picked_up / in_transit / out_for_delivery / delivered
    tracking_id = Column(String, nullable=True)
    estimated_delivery = Column(String, nullable=True)

    purchased_at = Column(DateTime, server_default=func.now())
    listing = relationship("MarketplaceListing", back_populates="purchases")


class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.id"))
    added_at = Column(DateTime, server_default=func.now())