from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI
from joblib import dump, load
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "relevance_model.joblib"


class ProductPayload(BaseModel):
    id: str
    price: float = 0
    rating: float = 0
    category: str = "Other"
    brand: str = "generic"
    clicks: float = 0
    popularity: float = 0
    popularity_score: Optional[float] = None
    discount: float = 0
    price_vs_category_avg: Optional[float] = None
    brand_popularity_index: Optional[float] = None
    target: Optional[float] = None


class UserPayload(BaseModel):
    maxPrice: Optional[float] = None
    budget: Optional[float] = None
    category: Optional[str] = None
    preferredBrands: List[str] = Field(default_factory=list)


class ScoreRequest(BaseModel):
    user: UserPayload = Field(default_factory=UserPayload)
    products: List[ProductPayload] = Field(default_factory=list)


class TrainRequest(BaseModel):
    products: List[ProductPayload] = Field(default_factory=list)


app = FastAPI(title="SoleFinder ML Service", version="2.0.0")


def ensure_model_dir() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def build_feature_frame(products: List[ProductPayload]) -> pd.DataFrame:
    rows = []
    for product in products:
        popularity = (
            float(product.popularity_score)
            if product.popularity_score is not None
            else float(product.popularity or 0)
        )
        rows.append(
            {
                "id": product.id,
                "price": int(float(product.price or 0)),
                "rating": float(product.rating or 0),
                "category": product.category or "Other",
                "brand": product.brand or "generic",
                "clicks": float(product.clicks or 0),
                "popularity": popularity,
                "discount": float(product.discount or 0),
                "price_vs_category_avg": float(product.price_vs_category_avg or 0),
                "brand_popularity_index": float(product.brand_popularity_index or 0),
                "target": product.target,
            }
        )

    frame = pd.DataFrame(rows)
    if frame.empty:
        return frame

    category_avg = frame.groupby("category")["price"].transform("mean").replace(0, 1)
    brand_popularity = frame.groupby("brand")["popularity"].transform("mean")

    frame["price_vs_category_avg"] = frame["price_vs_category_avg"].where(
        frame["price_vs_category_avg"] > 0,
        frame["price"] / category_avg,
    )
    frame["brand_popularity_index"] = frame["brand_popularity_index"].where(
        frame["brand_popularity_index"] > 0,
        brand_popularity,
    )
    return frame


def build_training_targets(frame: pd.DataFrame) -> pd.Series:
    if "target" in frame.columns and frame["target"].notna().any():
        return frame["target"].fillna(0).clip(lower=0, upper=1)

    max_price = max(float(frame["price"].max() or 0), 1.0)
    synthetic = (
        (1 - (frame["price"] / max_price)).clip(lower=0, upper=1) * 0.25
        + (frame["rating"] / 5.0).clip(lower=0, upper=1) * 0.30
        + (frame["popularity"] / 100.0).clip(lower=0, upper=1) * 0.20
        + (frame["clicks"] / 100.0).clip(lower=0, upper=1) * 0.15
        + (frame["discount"] / 100.0).clip(lower=0, upper=1) * 0.10
    )
    return synthetic.clip(lower=0, upper=1)


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                ["category", "brand"],
            ),
            (
                "numeric",
                StandardScaler(),
                [
                    "price",
                    "rating",
                    "clicks",
                    "popularity",
                    "discount",
                    "price_vs_category_avg",
                    "brand_popularity_index",
                ],
            ),
        ]
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=160,
                    random_state=42,
                    max_depth=10,
                    min_samples_leaf=1,
                ),
            ),
        ]
    )


def train_pipeline(products: List[ProductPayload]) -> dict:
    if not products:
        return {"trained": False, "count": 0, "valid": 0}

    frame = build_feature_frame(products)
    print(f"ML training records: total={len(frame.index)}")
    frame = frame[
        (frame["price"] > 0)
        & (frame["rating"] > 0)
        & (frame["brand"].astype(str).str.len() > 0)
        & (frame["category"].astype(str).str.len() > 0)
    ].copy()
    print(f"ML training valid records: {len(frame.index)}")

    if len(frame.index) < 50:
        return {"trained": False, "count": len(products), "valid": len(frame.index), "skipped": True}

    feature_columns = [
        "price",
        "rating",
        "category",
        "brand",
        "clicks",
        "popularity",
        "discount",
        "price_vs_category_avg",
        "brand_popularity_index",
    ]
    X = frame[feature_columns]
    y = build_training_targets(frame)
    pipeline = build_pipeline()
    pipeline.fit(X, y)
    ensure_model_dir()
    dump(pipeline, MODEL_PATH)
    return {"trained": True, "count": len(products), "valid": len(frame.index)}


def load_pipeline() -> Optional[Pipeline]:
    if MODEL_PATH.exists():
        return load(MODEL_PATH)

    return None


def predict_scores(products: List[ProductPayload]) -> List[dict]:
    if not products:
        return []

    pipeline = load_pipeline()
    if pipeline is None:
        train_pipeline(products)
        pipeline = load_pipeline()

    if pipeline is None:
        return []

    frame = build_feature_frame(products)
    frame = frame.fillna(
        {
            "price": 0,
            "rating": 0,
            "category": "Other",
            "brand": "generic",
            "clicks": 0,
            "popularity": 0,
            "discount": 0,
            "price_vs_category_avg": 0,
            "brand_popularity_index": 0,
        }
    )
    feature_columns = [
        "price",
        "rating",
        "category",
        "brand",
        "clicks",
        "popularity",
        "discount",
        "price_vs_category_avg",
        "brand_popularity_index",
    ]
    predictions = pipeline.predict(frame[feature_columns])
    regressor = pipeline.named_steps.get("regressor")
    transformed = pipeline.named_steps["preprocessor"].transform(frame[feature_columns])
    confidence_scores = []

    if hasattr(regressor, "estimators_"):
        tree_predictions = []
        for estimator in regressor.estimators_:
          tree_predictions.append(estimator.predict(transformed))
        tree_frame = pd.DataFrame(tree_predictions).T
        std_values = tree_frame.std(axis=1).fillna(0)
        confidence_scores = [
            float(min(max(1 - min(std_value, 0.5) / 0.5, 0.0), 1.0))
            for std_value in std_values.tolist()
        ]
    else:
        confidence_scores = [0.75 for _ in predictions]

    return [
        {
            "id": row["id"],
            "relevance_score": float(min(max(prediction, 0.0), 1.0)),
            "confidence_score": float(min(max(confidence, 0.0), 1.0)),
        }
        for row, prediction, confidence in zip(
            frame.to_dict(orient="records"), predictions, confidence_scores
        )
    ]


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists()}


@app.post("/ml/train")
def train(request: TrainRequest):
    result = train_pipeline(request.products)
    return {"success": True, **result}


@app.post("/score")
def score(request: ScoreRequest):
    return {"scores": predict_scores(request.products)}


@app.post("/ml/predict")
def predict(request: ScoreRequest):
    return {"scores": predict_scores(request.products)}
