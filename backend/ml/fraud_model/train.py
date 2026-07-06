import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib

# Load engineered features
X = pd.read_csv("data/features.csv")
y = pd.read_csv("data/labels.csv").values.ravel()

# Train/test split — stratify because of class imbalance
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Handle class imbalance properly
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
print(f"scale_pos_weight: {scale_pos_weight:.2f}")

model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    scale_pos_weight=scale_pos_weight,
    eval_metric="auc",
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=20
)

# Evaluate
y_pred_proba = model.predict_proba(X_test)[:, 1]
y_pred = model.predict(X_test)

print("\nROC-AUC:", roc_auc_score(y_test, y_pred_proba))
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Feature importance — this is your explainability story
importance = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=False)
print("\nTop features driving fraud predictions:")
print(importance.head(10))

# Save model
joblib.dump(model, "fraud_model.pkl")
print("\nModel saved as fraud_model.pkl")