from fastapi import APIRouter
from app.schemas import ReturnScoreRequest, ReturnScoreResponse
from app.services.fraud_service import score_return

router = APIRouter(prefix="/fraud", tags=["Fraud Scoring"])

@router.post("/score", response_model=ReturnScoreResponse)
def score(request: ReturnScoreRequest):
    result = score_return(
        transaction_amt=request.transaction_amt,
        card1=request.card1,
        card2=request.card2,
        transaction_hour=request.transaction_hour,
        email_domain_freq=request.email_domain_freq,
        has_device_info=request.has_device_info,
        dist1=request.dist1,
        c1=request.c1,
        c2=request.c2,
        c5=request.c5,
        c13=request.c13,
        c14=request.c14,
    )
    return result