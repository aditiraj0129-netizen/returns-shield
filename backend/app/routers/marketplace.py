from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services.cv_service import predict_damage
from app.services.fraud_service import score_return
from datetime import datetime, timedelta
import json, random, hashlib, string

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


def gen_tracking():
    return "SHM" + ''.join(random.choices(string.digits, k=10))


def gen_delivery_date():
    days = random.randint(3, 7)
    d = datetime.utcnow() + timedelta(days=days)
    return d.strftime("%d %b %Y")


# ── List a used product ───────────────────────────────────────────────────────
@router.post("/list")
async def list_product(
    seller_name: str     = Form(...),
    seller_email: str    = Form(...),
    seller_phone: str    = Form(default=""),
    seller_city: str     = Form(default=""),
    title: str           = Form(...),
    description: str     = Form(default=""),
    category: str        = Form(default="other"),
    brand: str           = Form(default=""),
    original_price: float= Form(...),
    selling_price: float = Form(...),
    reason_to_sell: str  = Form(default=""),
    purchase_platform: str= Form(default=""),
    age_months: int      = Form(default=0),
    condition: str       = Form(default="good"),
    image: UploadFile    = File(...),
    db: Session = Depends(get_db)
):
    image_bytes = await image.read()

    # Run CV damage detection
    cv_result = predict_damage(image_bytes)

    # Run fraud scoring with proxy signals
    seed = int(hashlib.md5(seller_email.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    fraud_result = score_return(
        transaction_amt=selling_price,
        card1=random.randint(10000, 99999),
        card2=random.randint(100, 999),
        transaction_hour=random.randint(8, 22),
        email_domain_freq=random.uniform(0.01, 0.2),
        has_device_info=1,
        dist1=random.randint(0, 100),
        c1=random.randint(1, 5), c2=random.randint(1, 5),
        c5=1, c13=random.randint(1, 10), c14=random.randint(1, 5)
    )

    damage_score = cv_result["damage_score"]
    fraud_score  = fraud_result["fraud_score"]

    # AI verdict
    if fraud_score >= 0.65 or damage_score >= 0.85:
        verdict = "rejected"
        status  = "rejected"
    elif fraud_score >= 0.35 or damage_score >= 0.55:
        verdict = "manual_review"
        status  = "pending"
    else:
        verdict = "approved"
        status  = "live"

    listing = models.MarketplaceListing(
        seller_name=seller_name,
        seller_email=seller_email,
        seller_phone=seller_phone,
        seller_city=seller_city,
        title=title,
        description=description,
        category=category,
        brand=brand,
        original_price=original_price,
        selling_price=selling_price,
        reason_to_sell=reason_to_sell,
        purchase_platform=purchase_platform,
        age_months=age_months,
        condition=condition,
        damage_score=round(damage_score, 4),
        fraud_score=round(fraud_score, 4),
        damage_breakdown=json.dumps(cv_result.get("breakdown", {})),
        heatmap_seed=cv_result.get("heatmap_seed", ""),
        ai_verdict=verdict,
        status=status,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    return {
        "listing_id": listing.id,
        "title": listing.title,
        "status": status,
        "ai_verdict": verdict,
        "cv_result": cv_result,
        "fraud_result": fraud_result,
        "message": {
            "approved":      "✅ Listing approved! Your product is now live on the marketplace.",
            "manual_review": "⚠️ Listing under review. Our team will verify within 24 hours.",
            "rejected":      "🚨 Listing rejected due to high fraud or damage signals. Contact support."
        }[verdict],
        "platform_fee": f"{listing.platform_fee_pct}% of selling price (₹{round(selling_price * listing.platform_fee_pct / 100, 2)})"
    }


# ── Browse listings ───────────────────────────────────────────────────────────
@router.get("/listings")
def get_listings(category: str = None, db: Session = Depends(get_db)):
    q = db.query(models.MarketplaceListing).filter(
        models.MarketplaceListing.status == "live"
    )
    if category and category != "all":
        q = q.filter(models.MarketplaceListing.category == category)
    listings = q.order_by(models.MarketplaceListing.listed_at.desc()).limit(50).all()

    result = []
    for l in listings:
        bd = {}
        try:
            bd = json.loads(l.damage_breakdown or "{}")
        except Exception:
            pass
        result.append({
            "id": l.id,
            "title": l.title,
            "description": l.description,
            "category": l.category,
            "brand": l.brand,
            "condition": l.condition,
            "original_price": l.original_price,
            "selling_price": l.selling_price,
            "seller_name": l.seller_name,
            "seller_city": l.seller_city,
            "age_months": l.age_months,
            "damage_score": l.damage_score,
            "fraud_score": l.fraud_score,
            "ai_verdict": l.ai_verdict,
            "damage_breakdown": bd,
            "heatmap_seed": l.heatmap_seed,
            "reason_to_sell": l.reason_to_sell,
            "purchase_platform": l.purchase_platform,
            "listed_at": l.listed_at.isoformat() if l.listed_at else None,
            "savings": round((l.original_price or 0) - (l.selling_price or 0), 2),
            "savings_pct": round(((l.original_price - l.selling_price) / l.original_price * 100), 1) if l.original_price else 0
        })
    return result


# ── Get single listing ────────────────────────────────────────────────────────
@router.get("/listings/{listing_id}")
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    l = db.query(models.MarketplaceListing).filter(
        models.MarketplaceListing.id == listing_id
    ).first()
    if not l:
        raise HTTPException(status_code=404, detail="Listing not found")
    bd = {}
    try:
        bd = json.loads(l.damage_breakdown or "{}")
    except Exception:
        pass
    return {
        "id": l.id, "title": l.title, "description": l.description,
        "category": l.category, "brand": l.brand, "condition": l.condition,
        "original_price": l.original_price, "selling_price": l.selling_price,
        "seller_name": l.seller_name, "seller_city": l.seller_city,
        "seller_phone": l.seller_phone, "age_months": l.age_months,
        "reason_to_sell": l.reason_to_sell, "purchase_platform": l.purchase_platform,
        "damage_score": l.damage_score, "fraud_score": l.fraud_score,
        "ai_verdict": l.ai_verdict, "damage_breakdown": bd,
        "heatmap_seed": l.heatmap_seed, "status": l.status,
        "platform_fee_pct": l.platform_fee_pct,
        "listed_at": l.listed_at.isoformat() if l.listed_at else None,
    }


# ── Create Razorpay order ─────────────────────────────────────────────────────
@router.post("/buy/initiate")
async def initiate_purchase(
    listing_id: int    = Form(...),
    buyer_name: str    = Form(...),
    buyer_email: str   = Form(...),
    buyer_phone: str   = Form(...),
    delivery_address: str = Form(...),
    buyer_city: str    = Form(default=""),
    db: Session = Depends(get_db)
):
    listing = db.query(models.MarketplaceListing).filter(
        models.MarketplaceListing.id == listing_id,
        models.MarketplaceListing.status == "live"
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not available")

    amount = listing.selling_price
    # Buyer pays a 2% convenience fee
    total  = round(amount * 1.02, 2)

    # In production: create Razorpay order here
    # import razorpay
    # client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    # rz_order = client.order.create({"amount": int(total*100), "currency":"INR", "receipt": f"shieldmart_{listing_id}"})
    # For demo: simulate order ID
    rz_order_id = "order_" + ''.join(random.choices(string.ascii_letters + string.digits, k=14))

    purchase = models.MarketplacePurchase(
        listing_id=listing_id,
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        buyer_phone=buyer_phone,
        delivery_address=delivery_address,
        buyer_city=buyer_city,
        amount=total,
        razorpay_order_id=rz_order_id,
        payment_status="pending",
        tracking_id=gen_tracking(),
        estimated_delivery=gen_delivery_date()
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    return {
        "purchase_id": purchase.id,
        "razorpay_order_id": rz_order_id,
        "amount": total,
        "amount_paise": int(total * 100),
        "listing_title": listing.title,
        "seller_city": listing.seller_city,
        "buyer_city": buyer_city,
        "estimated_delivery": purchase.estimated_delivery,
        "tracking_id": purchase.tracking_id,
        # In production, pass razorpay_key_id from env
        "razorpay_key": "rzp_test_YourKeyHere"
    }


# ── Confirm payment ───────────────────────────────────────────────────────────
@router.post("/buy/confirm")
async def confirm_payment(
    purchase_id: int = Form(...),
    razorpay_payment_id: str = Form(...),
    db: Session = Depends(get_db)
):
    purchase = db.query(models.MarketplacePurchase).filter(
        models.MarketplacePurchase.id == purchase_id
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # In production: verify Razorpay signature here
    purchase.razorpay_payment_id = razorpay_payment_id
    purchase.payment_status = "paid"
    purchase.delivery_status = "processing"

    # Mark listing as sold
    listing = db.query(models.MarketplaceListing).filter(
        models.MarketplaceListing.id == purchase.listing_id
    ).first()
    if listing:
        listing.status = "sold"

    db.commit()

    return {
        "message": "Payment confirmed! Order placed successfully.",
        "tracking_id": purchase.tracking_id,
        "estimated_delivery": purchase.estimated_delivery,
        "delivery_status": purchase.delivery_status
    }


# ── Cart endpoints ────────────────────────────────────────────────────────────
@router.post("/cart/add")
async def add_to_cart(
    session_id: str  = Form(...),
    listing_id: int  = Form(...),
    db: Session = Depends(get_db)
):
    existing = db.query(models.CartItem).filter(
        models.CartItem.session_id == session_id,
        models.CartItem.listing_id == listing_id
    ).first()
    if existing:
        return {"message": "Already in cart"}
    item = models.CartItem(session_id=session_id, listing_id=listing_id)
    db.add(item)
    db.commit()
    return {"message": "Added to cart"}


@router.get("/cart/{session_id}")
def get_cart(session_id: str, db: Session = Depends(get_db)):
    items = db.query(models.CartItem).filter(
        models.CartItem.session_id == session_id
    ).all()
    result = []
    for item in items:
        listing = db.query(models.MarketplaceListing).filter(
            models.MarketplaceListing.id == item.listing_id
        ).first()
        if listing and listing.status == "live":
            result.append({
                "cart_item_id": item.id,
                "listing_id": listing.id,
                "title": listing.title,
                "selling_price": listing.selling_price,
                "condition": listing.condition,
                "seller_city": listing.seller_city,
            })
    return result


@router.delete("/cart/{session_id}/{listing_id}")
def remove_from_cart(session_id: str, listing_id: int, db: Session = Depends(get_db)):
    db.query(models.CartItem).filter(
        models.CartItem.session_id == session_id,
        models.CartItem.listing_id == listing_id
    ).delete()
    db.commit()
    return {"message": "Removed from cart"}


# ── Marketplace stats ─────────────────────────────────────────────────────────
@router.get("/stats")
def marketplace_stats(db: Session = Depends(get_db)):
    listings = db.query(models.MarketplaceListing).all()
    purchases = db.query(models.MarketplacePurchase).all()
    live = [l for l in listings if l.status == "live"]
    sold = [l for l in listings if l.status == "sold"]
    return {
        "total_listings": len(listings),
        "live_listings": len(live),
        "sold_items": len(sold),
        "pending_review": len([l for l in listings if l.status == "pending"]),
        "total_transactions": len([p for p in purchases if p.payment_status == "paid"]),
        "gmv": round(sum(p.amount for p in purchases if p.payment_status == "paid"), 2)
    }