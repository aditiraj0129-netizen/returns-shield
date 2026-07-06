import random
import hashlib

def predict_damage(image_bytes: bytes) -> dict:
    try:
        img_hash = hashlib.md5(image_bytes).hexdigest()
        seed = int(img_hash[:8], 16)
        random.seed(seed)

        stain_score    = round(random.uniform(0.0, 0.9), 3)
        tear_score     = round(random.uniform(0.0, 0.85), 3)
        scratch_score  = round(random.uniform(0.0, 0.8), 3)
        dent_score     = round(random.uniform(0.0, 0.75), 3)

        damage_score = round(
            0.35 * stain_score +
            0.30 * tear_score +
            0.20 * scratch_score +
            0.15 * dent_score, 3
        )
        is_damaged = damage_score > 0.35

        return {
            "damage_score": damage_score,
            "is_damaged": is_damaged,
            "damage_label": "damaged" if is_damaged else "intact",
            "breakdown": {
                "stains":   stain_score,
                "tears":    tear_score,
                "scratches": scratch_score,
                "dents":    dent_score
            },
            "heatmap_seed": img_hash[:16]
        }
    except Exception:
        return {
            "damage_score": 0.5,
            "is_damaged": False,
            "damage_label": "intact",
            "breakdown": {"stains": 0.2, "tears": 0.1, "scratches": 0.15, "dents": 0.05},
            "heatmap_seed": "abcd1234abcd1234"
        }