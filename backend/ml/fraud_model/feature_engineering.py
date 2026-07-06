import pandas as pd
import numpy as np

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    features = pd.DataFrame()

    features["transaction_amt"] = df["TransactionAmt"]
    features["log_amt"] = np.log1p(df["TransactionAmt"])

    features["card1"] = df["card1"]
    features["card2"] = df["card2"].fillna(-1)

    features["transaction_hour"] = (df["TransactionDT"] / 3600) % 24

    email_freq = df["P_emaildomain"].value_counts(normalize=True)
    features["email_domain_freq"] = df["P_emaildomain"].map(email_freq).fillna(0)

    features["has_device_info"] = df["DeviceType"].notnull().astype(int) if "DeviceType" in df.columns else 0

    features["dist1"] = df["dist1"].fillna(-1)

    for col in ["C1", "C2", "C5", "C13", "C14"]:
        if col in df.columns:
            features[col] = df[col].fillna(0)

    return features


if __name__ == "__main__":
    df = pd.read_csv("data/ieee-fraud-detection/train_transaction.csv")
    X = engineer_features(df)
    y = df["isFraud"]

    X.to_csv("data/features.csv", index=False)
    y.to_csv("data/labels.csv", index=False)
    print("Feature engineering done. Shape:", X.shape)