from app.database import SessionLocal, engine
from app import models
from datetime import datetime, timedelta
import random

def seed():
    db = SessionLocal()
    try:
        # Hard delete everything and reset sequences
        db.execute(models.ReturnRequest.__table__.delete())
        db.execute(models.Order.__table__.delete())
        db.execute(models.Customer.__table__.delete())
        
        # Reset auto-increment sequences
        db.execute(models.ReturnRequest.__table__.delete())
        db.commit()
        
        from sqlalchemy import text
        db.execute(text("ALTER SEQUENCE customers_id_seq RESTART WITH 1"))
        db.execute(text("ALTER SEQUENCE orders_id_seq RESTART WITH 1"))
        db.execute(text("ALTER SEQUENCE return_requests_id_seq RESTART WITH 1"))
        db.commit()

        random.seed(42)

        customers = []
        names = [
            ("Priya Sharma", "priya@gmail.com", "Mumbai"),
            ("Rahul Mehta", "rahul@yahoo.com", "Delhi"),
            ("Sneha Patel", "sneha@outlook.com", "Bangalore"),
            ("Arjun Singh", "arjun@gmail.com", "Chennai"),
            ("Kavya Reddy", "kavya@hotmail.com", "Hyderabad"),
            ("Vikram Nair", "vikram@gmail.com", "Pune"),
        ]
        for name, email, city in names:
            c = models.Customer(
                name=name, email=email,
                total_orders=random.randint(5, 50),
                total_returns=random.randint(0, 10),
                city=city
            )
            db.add(c)
        db.commit()
        db.refresh(db.query(models.Customer).first())

        all_customers = db.query(models.Customer).all()

        products = [
            ("iPhone 15", "Electronics", 79999),
            ("Nike Air Max", "Footwear", 8999),
            ("Samsung TV 55\"", "Electronics", 49999),
            ("Levi's Jeans", "Clothing", 2999),
            ("Sony Headphones", "Electronics", 14999),
            ("Kurta Set", "Clothing", 1499),
        ]
        orders = []
        for i, (name, cat, price) in enumerate(products):
            o = models.Order(
                customer_id=all_customers[i % len(all_customers)].id,
                product_name=name, category=cat, price=price,
                order_date=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )
            db.add(o)
        db.commit()

        all_orders = db.query(models.Order).all()
        print("Order IDs created:", [o.id for o in all_orders])

        buckets = [
            "auto_approve", "auto_approve",
            "manual_review", "manual_review",
            "reject_investigate", "reject_investigate"
        ]
        reasons = [
            "Product damaged on arrival",
            "Wrong item delivered",
            "Not as described",
            "Changed my mind",
            "Defective product",
            "Item swap suspected"
        ]
        for i, order in enumerate(all_orders):
            r = models.ReturnRequest(
                order_id=order.id,
                reason=reasons[i],
                damage_score=round(random.uniform(0.1, 0.9), 4),
                fraud_score=round(random.uniform(0.05, 0.85), 4),
                risk_bucket=buckets[i],
                reviewed=i % 3 == 0,
                final_decision="approved" if i % 3 == 0 else None,
                requested_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            db.add(r)
        db.commit()

        all_returns = db.query(models.ReturnRequest).all()
        print("Return IDs created:", [r.id for r in all_returns])
        print("✅ Seeded successfully! Order IDs are 1-6")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()