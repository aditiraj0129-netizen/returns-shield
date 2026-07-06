import tensorflow as tf
from tensorflow.keras import layers
import numpy as np
import os
from sklearn.metrics import classification_report, confusion_matrix

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
DATA_DIR = "data"

print("Loading saved model...")
model = tf.keras.models.load_model("damage_model.keras")

def prep_val(x, y):
    x = layers.Rescaling(1./255)(x)
    return x, y

val_ds = tf.keras.utils.image_dataset_from_directory(
    os.path.join(DATA_DIR, "val"),
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=False
)

class_names = val_ds.class_names
print("Classes:", class_names)

val_ds_norm = val_ds.map(prep_val).prefetch(tf.data.AUTOTUNE)

print("Running predictions...")
y_true, y_proba = [], []
for images, labels in val_ds_norm:
    preds = model.predict(images, verbose=0)
    y_proba.extend(preds.flatten())
    y_true.extend(labels.numpy().astype(int).flatten())

y_proba = np.array(y_proba)
y_true = np.array(y_true)

print(f"\nTotal samples: {len(y_true)}")
print(f"Pred score range: {y_proba.min():.4f} - {y_proba.max():.4f}")
print(f"Mean pred score: {y_proba.mean():.4f}")

for threshold in [0.3, 0.4, 0.5, 0.6, 0.7]:
    y_pred = (y_proba > threshold).astype(int)
    print(f"\n--- Threshold {threshold} ---")
    print(confusion_matrix(y_true, y_pred))
    print(classification_report(
        y_true, y_pred,
        target_names=class_names,
        zero_division=0
    ))