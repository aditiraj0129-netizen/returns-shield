import os
import shutil
import random

random.seed(42)

# This dataset has Positive=cracked, Negative=intact
# We rename to damaged/intact for our domain
CLASS_MAP = {
    "Positive": "damaged",
    "Negative": "intact"
}

SOURCE_DIR = "data/raw"
DEST_DIR = "data"
VAL_SPLIT = 0.2

for split in ["train", "val"]:
    for cls in ["damaged", "intact"]:
        os.makedirs(os.path.join(DEST_DIR, split, cls), exist_ok=True)

for source_name, dest_name in CLASS_MAP.items():
    src_folder = os.path.join(SOURCE_DIR, source_name)
    
    if not os.path.exists(src_folder):
        print(f"Warning: {src_folder} not found, trying lowercase...")
        src_folder = os.path.join(SOURCE_DIR, source_name.lower())

    images = [
        f for f in os.listdir(src_folder)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]
    random.shuffle(images)

    val_count = int(len(images) * VAL_SPLIT)
    val_images = images[:val_count]
    train_images = images[val_count:]

    for img in train_images:
        shutil.copy(
            os.path.join(src_folder, img),
            os.path.join(DEST_DIR, "train", dest_name, img)
        )
    for img in val_images:
        shutil.copy(
            os.path.join(src_folder, img),
            os.path.join(DEST_DIR, "val", dest_name, img)
        )

    print(f"{dest_name}: {len(train_images)} train, {len(val_images)} val")

print("Split done.")