from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services.fraud_service import score_return
from app.services.cv_service import predict_damage
from datetime import datetime

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.post("/analyze")
async def analyze_return(
    order_id: int = Form(...),
    reason: str = Form(...),
    transaction_amt: float = Form(...),
    card1: int = Form(...),
    card2: float = Form(default=-1),
    transaction_hour: float = Form(default=12.0),
    email_domain_freq: float = Form(default=0.05),
    has_device_info: int = Form(default=1),
    dist1: float = Form(default=0),
    c1: float = Form(default=1),
    c2: float = Form(default=1),
    c5: float = Form(default=1),
    c13: float = Form(default=1),
    c14: float = Form(default=1),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found. Use IDs 1-6 after seeding.")

    image_bytes = await image.read()
    cv_result = predict_damage(image_bytes)

    fraud_result = score_return(
        transaction_amt=transaction_amt,
        card1=card1, card2=card2,
        transaction_hour=transaction_hour,
        email_domain_freq=email_domain_freq,
        has_device_info=has_device_info,
        dist1=dist1,
        c1=c1, c2=c2, c5=c5, c13=c13, c14=c14
    )

    fraud_score = fraud_result["fraud_score"]
    damage_score = cv_result["damage_score"]
    is_damaged = cv_result["is_damaged"]

    if fraud_score >= 0.6:
        risk_bucket = "reject_investigate"
    elif fraud_score >= 0.2 or not is_damaged:
        risk_bucket = "manual_review"
    else:
        risk_bucket = "auto_approve"

    return_request = models.ReturnRequest(
        order_id=order_id,
        reason=reason,
        damage_score=damage_score,
        fraud_score=fraud_score,
        risk_bucket=risk_bucket,
        requested_at=datetime.utcnow()
    )
    db.add(return_request)

    customer = order.customer
    if customer:
        customer.total_returns = (customer.total_returns or 0) + 1

    db.commit()
    db.refresh(return_request)

    return {
        "return_id": return_request.id,
        "order_id": order_id,
        "cv_result": cv_result,
        "fraud_result": fraud_result,
        "risk_bucket": risk_bucket,
        "message": {
            "auto_approve": "Return approved automatically — low risk signals detected",
            "manual_review": "Flagged for manual review — moderate risk signals detected",
            "reject_investigate": "High fraud risk — flagged for investigation"
        }[risk_bucket]
    }


@router.get("/all")
def get_all_returns(db: Session = Depends(get_db)):
    returns = db.query(models.ReturnRequest).order_by(
        models.ReturnRequest.requested_at.desc()
    ).limit(100).all()

    result = []
    for r in returns:
        order = db.query(models.Order).filter(models.Order.id == r.order_id).first()
        result.append({
            "id": r.id,
            "order_id": r.order_id,
            "product_name": order.product_name if order else "Unknown",
            "reason": r.reason,
            "damage_score": r.damage_score,
            "fraud_score": r.fraud_score,
            "risk_bucket": r.risk_bucket,
            "reviewed": r.reviewed,
            "final_decision": r.final_decision,
            "requested_at": r.requested_at.isoformat() if r.requested_at else None
        })
    return result


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    all_returns = db.query(models.ReturnRequest).all()
    total = len(all_returns)
    return {
        "total": total,
        "auto_approve": sum(1 for r in all_returns if r.risk_bucket == "auto_approve"),
        "manual_review": sum(1 for r in all_returns if r.risk_bucket == "manual_review"),
        "reject_investigate": sum(1 for r in all_returns if r.risk_bucket == "reject_investigate"),
        "avg_fraud_score": round(
            sum(r.fraud_score or 0 for r in all_returns) / total, 3
        ) if total > 0 else 0
    }


@router.patch("/{return_id}/decide")
def make_decision(
    return_id: int,
    decision: str,
    notes: str = "",
    db: Session = Depends(get_db)
):
    return_req = db.query(models.ReturnRequest).filter(
        models.ReturnRequest.id == return_id
    ).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return not found")
    return_req.reviewed = True
    return_req.final_decision = decision
    return_req.reviewer_notes = notes
    db.commit()
    return {"message": f"Return {return_id} marked as {decision}"}


@router.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    return [{"id": o.id, "product_name": o.product_name, "price": o.price} for o in orders]


@router.post("/chat")
async def chatbot(message: str = Form(...)):
    msg = message.lower().strip()
    responses = {
        "how do i return":   "To initiate a return: go to '+ New Return', complete the eligibility checklist, select your Order ID, upload a clear product photo, and our AI analyzes it instantly.",
        "how long":          "Auto-approved returns get refunds in 3-5 business days. Manually reviewed ones take 5-7 business days.",
        "fraud":             "Our XGBoost model (ROC-AUC 0.91) is trained on 590,540 transactions. It scores 13 behavioral signals: transaction amount, card patterns, account history, email domain frequency, and more.",
        "damage":            "Our CV system detects stains, tears, scratches, and dents as separate scores. A Grad-CAM heatmap shows exactly where damage is detected on the product image.",
        "refund":            "Refunds are issued after return approval. Auto-approved: 3-5 business days. Manual review: 5-7 business days.",
        "status":            "Check return status on the Dashboard tab. Each return shows its risk bucket: Auto Approved, Manual Review, or Reject/Investigate.",
        "photo":             "Upload a clear, well-lit photo showing the full product. Ensure damage areas are visible. The AI generates a heatmap highlighting stains, tears, and scratches.",
        "policy":            "Items must be in original condition unless defective. Damaged-on-arrival items are always eligible. All accessories must be included.",
        "contact":           "For urgent issues, escalate through the Manual Review queue. Our ops team reviews flagged returns within 2 business hours.",
        "how does":          "Returns Shield uses two AI models: XGBoost for fraud scoring (0.91 ROC-AUC) and Computer Vision for damage detection with Grad-CAM visualization.",
        "what is":           "Returns Shield is an AI-powered returns fraud detection platform. It triages returns into Auto Approve, Manual Review, or Reject buckets using ML + computer vision.",
        "broken":            "If your item arrived broken, upload a clear photo showing the damage. Our CV model will detect and document it — damaged items are typically fast-tracked.",
        "stain":             "Stain detection is scored separately from 0-100%. Upload a clear image and our model will identify and score staining with a visual heatmap overlay.",
        "scratch":           "Scratches are a separate damage signal scored 0-100%. They're factored into the overall damage assessment alongside stains, tears, and dents.",
        "checklist":         "The eligibility checklist ensures items haven't been used, worn, or modified. All 6 points must be confirmed before you can submit a return.",
        "gradcam":           "Grad-CAM is a technique that visualizes which parts of an image the model focuses on. We use it to highlight exactly where damage (stains, tears, scratches, dents) is detected.",
    }
    for keyword, response in responses.items():
        if keyword in msg:
            return {"reply": response, "type": "answer"}
    return {
        "reply": "I can help with return policies, damage assessment, fraud detection, refund timelines, and how to submit returns. Try asking: 'How does fraud detection work?' or 'What damages are detected?'",
        "type": "fallback"
    }