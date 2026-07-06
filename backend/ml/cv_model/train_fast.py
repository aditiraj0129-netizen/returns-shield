import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, models
import numpy as np
import os
import json
import shutil
import random
from sklearn.metrics import classification_report, confusion_matrix

# ── Use only 500 images per class for fast training ───────────────────────────
FAST_DIR = "data_fast"
random.seed(42)

for split in ["train", "val"]:
    for cls in ["damaged", "intact"]:
        src = f"data/{split}/{cls}"
        dst = f"{FAST_DIR}/{split}/{cls}"
        os.makedirs(dst, exist_ok=True)
        imgs = [f for f in os.listdir(src) if f.endswith((".jpg",".png",".jpeg"))]
        random.shuffle(imgs)
        limit = 400 if split == "train" else 100
        for img in imgs[:limit]:
            shutil.copy(f"{src}/{img}", f"{dst}/{img}")

print("Fast dataset ready.")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

def make_ds(split, shuffle):
    return tf.keras.utils.image_dataset_from_directory(
        f"{FAST_DIR}/{split}",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="binary",
        shuffle=shuffle,
        seed=42
    )

train_ds_raw = make_ds("train", True)
val_ds_raw   = make_ds("val", False)
class_names  = train_ds_raw.class_names
print("Classes:", class_names)

norm = layers.Rescaling(1./255)
aug  = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
])

train_ds = train_ds_raw.map(lambda x,y: (norm(aug(x)), y)).prefetch(tf.data.AUTOTUNE)
val_ds   = val_ds_raw.map(lambda x,y: (norm(x), y)).prefetch(tf.data.AUTOTUNE)

base_model = EfficientNetB0(input_shape=(224,224,3), include_top=False, weights="imagenet")
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dense(64, activation="relu"),
    layers.Dropout(0.3),
    layers.Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="binary_crossentropy",
    metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
)

checkpoint_cb = tf.keras.callbacks.ModelCheckpoint(
    "best_model.keras", monitor="val_auc", mode="max",
    save_best_only=True, verbose=1
)
early_stop_cb = tf.keras.callbacks.EarlyStopping(
    monitor="val_auc", mode="max", patience=3, verbose=1
)

print("\n--- Phase 1: head only (should finish in ~5 min) ---")
model.fit(train_ds, validation_data=val_ds, epochs=8,
          callbacks=[checkpoint_cb, early_stop_cb])

model = tf.keras.models.load_model("best_model.keras")

print("\n--- Phase 2: fine-tune ---")
base_model = model.layers[0]
base_model.trainable = True
for layer in base_model.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-5),
    loss="binary_crossentropy",
    metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
)

checkpoint_ft = tf.keras.callbacks.ModelCheckpoint(
    "best_model.keras", monitor="val_auc", mode="max",
    save_best_only=True, verbose=1
)
early_stop_ft = tf.keras.callbacks.EarlyStopping(
    monitor="val_auc", mode="max", patience=3, verbose=1
)

model.fit(train_ds, validation_data=val_ds, epochs=5,
          callbacks=[checkpoint_ft, early_stop_ft])

model = tf.keras.models.load_model("best_model.keras")

# ── Evaluate on full val set ──────────────────────────────────────────────────
print("\n--- Evaluation on full val set ---")
full_val = make_ds("val", False)
full_val = full_val.map(lambda x,y: (norm(x), y)).prefetch(tf.data.AUTOTUNE)

y_true, y_proba = [], []
for images, labels in full_val:
    preds = model.predict(images, verbose=0)
    y_proba.extend(preds.flatten())
    y_true.extend(labels.numpy().astype(int).flatten())

y_proba = np.array(y_proba)
y_true  = np.array(y_true)
y_pred  = (y_proba > 0.5).astype(int)

print(f"Score range: {y_proba.min():.3f} - {y_proba.max():.3f}")
print(f"Mean score : {y_proba.mean():.3f}")
print(confusion_matrix(y_true, y_pred))
print(classification_report(y_true, y_pred, target_names=class_names, zero_division=0))

# ── Save ──────────────────────────────────────────────────────────────────────
model.save("damage_model.keras")

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
with open("damage_model.tflite", "wb") as f:
    f.write(converter.convert())

with open("class_names.json", "w") as f:
    json.dump(class_names, f)

print("All saved. Done.")