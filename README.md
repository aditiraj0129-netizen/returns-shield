# 🛡️ Returns Shield — AI-Powered Returns Fraud Detection

> Built by **Aditi Raj**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-ROC--AUC%200.91-orange?style=flat-square)](https://xgboost.readthedocs.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker)](https://docker.com)

---

## The Problem

E-commerce companies lose **$103 billion annually** to return fraud. The most common types:

- **Wardrobing** — buying, using, and returning items
- **Empty-box returns** — returning an empty or weighted box
- **Item swap fraud** — returning a cheaper/older/broken item instead of the purchased product
- **Damaged returns** — returning items the customer themselves damaged

Traditional systems catch these too late, after refunds are already issued. A human review queue with no ML signal is slow, expensive, and inconsistent.

---

## The Solution

**Returns Shield** is an event-driven returns triage system that fuses two AI signals the moment a return is initiated:

1. **XGBoost Behavioral Fraud Scoring** — trained on 590,540 real transactions from the IEEE-CIS Fraud Detection dataset (Kaggle). Scores 13 behavioral features including transaction amount, card patterns, email domain frequency, account usage signals, and geographic distance. Achieves **ROC-AUC 0.91**.

2. **Computer Vision Damage Analysis** — detects physical damage on the returned product image, scoring stains, tears, scratches, and dents as separate signals. Generates a **Grad-CAM style heatmap** showing exactly where damage is detected.

Both signals are fused in real time to triage each return into one of three buckets:

| Bucket | Condition | Action |
|--------|-----------|--------|
| ✅ **Auto Approve** | Low fraud risk + item damaged | Refund issued automatically |
| ⚠️ **Manual Review** | Moderate risk signals | Human ops team reviews |
| 🚨 **Reject / Investigate** | Fraud probability ≥ 60% | Flagged for fraud investigation |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   React Dashboard│────▶│           FastAPI Backend            │
│  (Ops Interface) │     │                                      │
└─────────────────┘     │  ┌─────────────┐  ┌───────────────┐  │
                        │  │  XGBoost    │  │  CV Damage    │  │
┌─────────────────┐     │  │  Fraud      │  │  Detection    │  │
│  Return Submit  │────▶│  │  Scorer     │  │  (EfficientNet│  │
│  (Image + Form) │     │  │  0.91 AUC   │  │  + Grad-CAM)  │  │
└─────────────────┘     │  └──────┬──────┘  └──────┬────────┘  │
                        │         │                 │           │
                        │         ▼                 ▼           │
                        │    ┌────────────────────────────┐     │
                        │    │     Risk Triage Engine      │     │
                        │    │  auto_approve / manual /    │     │
                        │    │  reject_investigate         │     │
                        │    └────────────┬───────────────┘     │
                        │                 │                      │
                        └─────────────────┼──────────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │   PostgreSQL DB  │
                                 │  (Docker)        │
                                 └─────────────────┘
```

---

## Features

- **🤖 ML Fraud Scoring** — XGBoost trained on 590k transactions, ROC-AUC 0.91, with feature importance explainability
- **📷 CV Damage Detection** — Stains, tears, scratches, and dents scored independently
- **🔬 Grad-CAM Heatmap** — Visual overlay showing damage zones on the product image
- **⚖️ Return Policy Checklist** — 6-point compliance gate before submission
- **👩‍💼 Human-in-the-Loop** — Ops agents approve/reject manual review cases from the dashboard
- **💬 AI Chatbot** — Answers customer and ops questions about returns and fraud detection
- **📊 Real-time Dashboard** — Live stats, risk distribution charts, fraud score trends
- **🗄️ Persistent Storage** — PostgreSQL with full return request history
- **🐳 Docker** — Database containerized for production parity

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| ML — Fraud | XGBoost, scikit-learn, pandas, IEEE-CIS dataset |
| ML — CV | EfficientNetB0, TensorFlow, transfer learning |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, Python 3.11 |
| Frontend | React 18, Recharts, Vite |
| Infrastructure | Docker, Docker Compose, Conda |
| Data | IEEE-CIS Fraud Detection (Kaggle, 590k transactions) |

---

## Model Performance

| Model | Metric | Score |
|-------|--------|-------|
| XGBoost Fraud Scorer | ROC-AUC | **0.91** |
| XGBoost Fraud Scorer | Recall (fraud) | 0.77 |
| XGBoost Fraud Scorer | Training samples | 590,540 |
| Top fraud features | C5 (count signal) | 0.277 importance |
| Top fraud features | C1 (count signal) | 0.193 importance |
| Top fraud features | C14 (count signal) | 0.184 importance |

---

## Project Structure

```
returns-shield/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # DB schema (Customer, Order, ReturnRequest)
│   │   ├── schemas.py           # Pydantic models
│   │   ├── seed.py              # Demo data seeder
│   │   ├── routers/
│   │   │   ├── fraud.py         # /fraud/score endpoint
│   │   │   └── returns.py       # /returns/* endpoints + chatbot
│   │   └── services/
│   │       ├── fraud_service.py # XGBoost inference
│   │       └── cv_service.py    # CV damage detection
│   ├── ml/
│   │   ├── fraud_model/
│   │   │   ├── train.py         # XGBoost training
│   │   │   ├── fraud_model.pkl  # Trained model
│   │   │   └── data/            # IEEE-CIS dataset
│   │   └── cv_model/
│   │       ├── train_damage_model.py
│   │       └── damage_model.keras
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app (all components)
│   │   ├── api.js               # Axios API helpers
│   │   └── index.css            # Global styles
│   └── package.json
└── docker-compose.yml           # PostgreSQL container
```

---

## Quick Start

### Prerequisites
- Python 3.11 (Conda recommended)
- Node.js 18+
- Docker Desktop

### 1. Clone and setup

```bash
git clone https://github.com/aditiraj0129-netizen/returns-shield.git
cd returns-shield
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Backend setup

```bash
cd backend
conda create -n returns-shield python=3.11 -y
conda activate returns-shield
pip install -r requirements.txt
brew install libomp  # macOS only, for XGBoost

# Seed demo data
python -m app.seed

# Start server
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/returns/analyze` | Submit return for AI analysis (multipart form + image) |
| `GET`  | `/returns/all` | Get all return requests |
| `GET`  | `/returns/stats` | Get aggregated statistics |
| `GET`  | `/returns/orders` | List available orders |
| `PATCH`| `/returns/{id}/decide` | Approve or reject a return |
| `POST` | `/returns/chat` | AI chatbot endpoint |
| `POST` | `/fraud/score` | Direct fraud scoring endpoint |

---

## Dataset & Model Training

The XGBoost fraud model was trained on the **IEEE-CIS Fraud Detection** dataset from Kaggle (590,540 transactions, 3.5% fraud rate). Key engineering decisions:

- Used `scale_pos_weight=27.58` to handle class imbalance (27:1 ratio)
- Engineered 13 features from raw transaction signals
- 300 boosting rounds, max depth 6, learning rate 0.05
- Evaluated on held-out test set (20% split, stratified)

To retrain:
```bash
cd backend/ml/fraud_model
kaggle competitions download -c ieee-fraud-detection
python feature_engineering.py
python train.py
```

---

## What I Learned / Interview Talking Points

- **Why XGBoost over neural networks for this task?** Tabular data with structured behavioral features responds better to gradient boosting than deep learning. XGBoost also gives feature importances — critical for fraud explainability in a real ops context.

- **Why separate damage signals (stains/tears/scratches/dents) instead of one score?** Real fraud teams need to understand *why* a return is flagged, not just that it is. Separate signals enable targeted policy rules (e.g., "auto-approve if only minor stains").

- **Why human-in-the-loop for medium-risk cases?** The cost of a false negative (approving actual fraud) is much higher than the cost of a false positive (manual review of a legitimate return). The 3-bucket system lets the ML model handle the easy cases while keeping humans accountable for edge cases.

- **class imbalance handling?** `scale_pos_weight` tells XGBoost to penalize missing fraud cases more heavily than incorrectly flagging legitimate ones — matches the asymmetric cost structure of fraud detection.

---

## Author

**Aditi Raj**
- 🎓 Final Year B.Tech CSE (AI/ML), VIT Bhopal — CGPA 8.1
- 🏆 Selected: Amazon ML Summer School 2025
- 📧 aditiraj0129@gmail.com
- 💼 [LinkedIn](https://linkedin.com/in/aditi-raj-330459295)
- 🐙 [GitHub](https://github.com/aditiraj0129-netizen)

---

*Built as part of Flipkart Grid preparation — demonstrating production-grade ML systems thinking, not just model training.*
