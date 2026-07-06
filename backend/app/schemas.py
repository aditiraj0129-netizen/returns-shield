from pydantic import BaseModel
from typing import Optional

class ReturnScoreRequest(BaseModel):
    transaction_amt: float
    card1: int
    card2: Optional[float] = -1
    transaction_hour: float
    email_domain_freq: Optional[float] = 0.0
    has_device_info: Optional[int] = 0
    dist1: Optional[float] = -1
    c1: Optional[float] = 0
    c2: Optional[float] = 0
    c5: Optional[float] = 0
    c13: Optional[float] = 0
    c14: Optional[float] = 0


class ReturnScoreResponse(BaseModel):
    fraud_score: float
    risk_bucket: str