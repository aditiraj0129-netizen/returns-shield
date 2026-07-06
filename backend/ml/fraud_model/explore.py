import pandas as pd

# Load data
transactions = pd.read_csv("data/ieee-fraud-detection/train_transaction.csv")

print("Shape:", transactions.shape)
print("\nColumns sample:", transactions.columns.tolist()[:20])
print("\nFraud rate:", transactions["isFraud"].mean())
print("\nMissing values (top 10):")
print(transactions.isnull().sum().sort_values(ascending=False).head(10))