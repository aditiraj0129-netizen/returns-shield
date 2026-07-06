import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, models
import numpy as np
import os
import json
from sklearn.metrics import classification_report, confusion_matrix

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
DATA_DIR = "data"
CHECKPOINT_PATH = "best_model.keras"

# ── Datasets ───────────────────────────────────────────────────────────────────
def make_ds(split, shuffle):
    return tf.keras.utils.image_dataset_from_directory(
        os.path.join(DATA_DIR, split),
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="binary",
        shuffle=shuffle,
        seed=42
    )

train_ds_raw = make_ds("train", shuffle=True)
val_ds_raw   = make_ds("val",   shuffle=False)
class_names  = train_ds_raw.class_names
print("Classes:", class_names)

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal_and_vertical"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),
])
norm = layers.Rescaling(1./255)

def prep_train(x, y):
    return norm(data_augmentation(x)), y

def prep_val(x, y):
    return norm(x), y

train_ds = train_ds_raw.map(prep_train).prefetch(tf.data.AUTOTUNE)
val_ds   = val_ds_raw.map(prep_val).prefetch(tf.data.AUTOTUNE)

# ── Model ──────────────────────────────────────────────────────────────────────
base_model = EfficientNetB0(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dense(128, activation="relu"),
    layers.Dropout(0.3),
    layers.Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.AUC(name="auc"),
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall")
    ]
)

checkpoint_cb = tf.keras.callbacks.ModelCheckpoint(
    filepath=CHECKPOINT_PATH,
    monitor="val_auc",
    mode="max",
    save_best_only=True,
    verbose=1
)

early_stop_cb = tf.keras.callbacks.EarlyStopping(
    monitor="val_auc",
    mode="max",
    patience=4,
    verbose=1
)

reduce_lr_cb = tf.keras.callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=2,
    verbose=1
)

# ── Phase 1: frozen base ───────────────────────────────────────────────────────
print("\n--- Phase 1: Training head only ---")
model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=15,
    callbacks=[checkpoint_cb, early_stop_cb, reduce_lr_cb]
)

# Load best phase-1 weights from disk before fine-tuning
print(f"\nLoading best phase-1 weights from {CHECKPOINT_PATH}")
model = tf.keras.models.load_model(CHECKPOINT_PATH)

# ── Phase 2: fine-tune top layers ─────────────────────────────────────────────
print("\n--- Phase 2: Fine-tuning top 20 layers ---")
base_model = model.layers[0]
base_model.trainable = True
for layer in base_model.layers[:-20]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-5),
    loss="binary_crossentropy",
    metrics=[
        "accuracy",
        tf.keras.metrics.AUC(name="auc"),
        tf.keras.metrics.Precision(name="precision"),
        tf.keras.metrics.Recall(name="recall")
    ]
)

checkpoint_ft_cb = tf.keras.callbacks.ModelCheckpoint(
    filepath=CHECKPOINT_PATH,
    monitor="val_auc",
    mode="max",
    save_best_only=True,
    verbose=1
)

early_stop_ft_cb = tf.keras.callbacks.EarlyStopping(
    monitor="val_auc",
    mode="max",
    patience=3,
    verbose=1
)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=5,
    callbacks=[checkpoint_ft_cb, early_stop_ft_cb, reduce_lr_cb]
)

# Load absolute best model saved to disk
print(f"\nLoading best overall model from {CHECKPOINT_PATH}")
model = tf.keras.models.load_model(CHECKPOINT_PATH)

# ── Evaluation on a completely fresh val dataset ──────────────────────────────
print("\n--- Final Evaluation ---")
val_ds_eval = make_ds("val", shuffle=False)
val_ds_eval = val_ds_eval.map(prep_val).prefetch(tf.data.AUTOTUNE)

y_true, y_proba = [], []
for images, labels in val_ds_eval:
    preds = model.predict(images, verbose=0)
    y_proba.extend(preds.flatten())
    y_true.extend(labels.numpy().astype(int).flatten())

y_proba = np.array(y_proba)
y_true  = np.array(y_true)

print(f"\nTotal val samples  : {len(y_true)}")
print(f"Pred score range   : {y_proba.min():.4f} - {y_proba.max():.4f}")
print(f"Mean pred score    : {y_proba.mean():.4f}")
print(f"Scores < 0.5       : {(y_proba < 0.5).sum()} (predicted damaged)")
print(f"Scores >= 0.5      : {(y_proba >= 0.5).sum()} (predicted intact)")

for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
    y_pred = (y_proba > threshold).astype(int)
    print(f"\n--- Threshold {threshold} ---")
    print(confusion_matrix(y_true, y_pred))
    print(classification_report(
        y_true, y_pred,
        target_names=class_names,
        zero_division=0
    ))

# ── Save final model + TFLite ─────────────────────────────────────────────────
model.save("damage_model.keras")
print("damage_model.keras saved")

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
with open("damage_model.tflite", "wb") as f:
    f.write(tflite_model)
print("damage_model.tflite saved")

with open("class_names.json", "w") as f:
    json.dump(class_names, f)
print("class_names.json saved:", class_names)