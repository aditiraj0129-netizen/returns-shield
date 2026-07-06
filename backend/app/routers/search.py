from fastapi import APIRouter, Query
import random, hashlib

router = APIRouter(prefix="/search", tags=["Price Comparison"])

RETAILERS = [
    {"name": "Amazon",   "logo": "🛒", "color": "#FF9900", "base_margin": 1.00, "review_base": 4.3, "delivery": "2-3 days"},
    {"name": "Flipkart", "logo": "📦", "color": "#2874F0", "base_margin": 0.95, "review_base": 4.1, "delivery": "3-5 days"},
    {"name": "Meesho",   "logo": "🛍️", "color": "#F43397", "base_margin": 0.82, "review_base": 3.8, "delivery": "5-7 days"},
    {"name": "Myntra",   "logo": "👗", "color": "#FF3F6C", "base_margin": 1.05, "review_base": 4.4, "delivery": "4-6 days"},
    {"name": "Croma",    "logo": "💻", "color": "#75B943", "base_margin": 1.10, "review_base": 4.2, "delivery": "2-4 days"},
    {"name": "Snapdeal", "logo": "🏷️", "color": "#E40046", "base_margin": 0.88, "review_base": 3.6, "delivery": "5-8 days"},
]

CATEGORY_BASE_PRICES = {
    "phone":       45000,
    "laptop":      65000,
    "headphones":  5000,
    "watch":       8000,
    "tablet":      35000,
    "camera":      55000,
    "tv":          40000,
    "jeans":       2500,
    "tshirt":      800,
    "shoes":       4500,
    "dress":       2000,
    "jacket":      5000,
    "bag":         3500,
    "sunglasses":  2000,
    "default":     2000,
}


def estimate_base_price(query: str) -> float:
    q = query.lower()
    for keyword, price in CATEGORY_BASE_PRICES.items():
        if keyword in q:
            return float(price)
    seed = int(hashlib.md5(query.encode()).hexdigest()[:6], 16)
    random.seed(seed)
    return float(random.randint(1000, 80000))


@router.get("/prices")
def compare_prices(q: str = Query(..., description="Product name to search")):
    base = estimate_base_price(q)

    # Generate deterministic but realistic price variations
    seed = int(hashlib.md5(q.lower().encode()).hexdigest()[:8], 16)
    random.seed(seed)

    results = []
    for retailer in RETAILERS:
        # Price variation ±15%
        variation = random.uniform(0.87, 1.15)
        price     = round(base * retailer["base_margin"] * variation, -1)  # round to 10s
        original  = round(price * random.uniform(1.1, 1.4), -1)
        discount  = round((original - price) / original * 100)
        reviews   = random.randint(120, 45000)
        rating    = round(retailer["review_base"] + random.uniform(-0.3, 0.3), 1)
        in_stock  = random.random() > 0.1  # 90% in stock

        results.append({
            "retailer":  retailer["name"],
            "logo":      retailer["logo"],
            "color":     retailer["color"],
            "price":     price,
            "original":  original,
            "discount":  discount,
            "rating":    min(5.0, max(1.0, rating)),
            "reviews":   reviews,
            "delivery":  retailer["delivery"],
            "in_stock":  in_stock,
            "url":       f"https://www.{retailer['name'].lower()}.com/search?q={q.replace(' ', '+')}",
            "free_delivery": price > 500,
            "emi":       f"₹{round(price/12):,}/mo" if price > 3000 else None,
        })

    # Sort by price
    results.sort(key=lambda x: x["price"])

    cheapest  = results[0]
    best_rated = max(results, key=lambda x: x["rating"])

    return {
        "query": q,
        "results": results,
        "summary": {
            "cheapest":    cheapest["retailer"],
            "cheapest_price": cheapest["price"],
            "best_rated":  best_rated["retailer"],
            "best_rating": best_rated["rating"],
            "price_range": f"₹{results[0]['price']:,.0f} – ₹{results[-1]['price']:,.0f}",
            "max_savings": round(results[-1]["price"] - results[0]["price"], 2),
        }
    }


@router.get("/categories")
def get_popular_searches():
    return {
        "popular": [
            "iPhone 15", "Samsung Galaxy S24", "OnePlus 12", "MacBook Air M2",
            "Sony WH-1000XM5", "Nike Air Max", "Levi's 511 Jeans",
            "iPad Air", "Samsung 55 inch TV", "Boat Airdopes 141"
        ],
        "categories": ["Electronics", "Clothing", "Footwear", "Accessories", "Home"]
    }