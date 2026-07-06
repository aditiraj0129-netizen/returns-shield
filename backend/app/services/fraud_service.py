import joblib
import pandas as pd
import numpy as np
import os

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "ml", "fraud_model", "fraud_model.pkl"
)

_model = None

def get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def score_return(transaction_amt: float, card1: int, card2: float,
                  transaction_hour: float, email_domain_freq: float,
                  has_device_info: int, dist1: float,
                  c1: float, c2: float, c5: float, c13: float, c14: float) -> dict:
    """
    Takes raw return/order signals and returns a fraud probability + risk bucket.
    """
    model = get_model()

    features = pd.DataFrame([{
        "transaction_amt": transaction_amt,
        "log_amt": np.log1p(transaction_amt),
        "card1": card1,
        "card2": card2,
        "transaction_hour": transaction_hour,
        "email_domain_freq": email_domain_freq,
        "has_device_info": has_device_info,
        "dist1": dist1,
        "C1": c1,
        "C2": c2,
        "C5": c5,
        "C13": c13,
        "C14": c14,
    }])

    fraud_prob = model.predict_proba(features)[0][1]

    if fraud_prob < 0.2:
        bucket = "auto_approve"
    elif fraud_prob < 0.6:
        bucket = "manual_review"
    else:
        bucket = "reject_investigate"

    return {
        "fraud_score": round(float(fraud_prob), 4),
        "risk_bucket": bucket
    }