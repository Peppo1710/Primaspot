from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch

# Load CLIP model (first time will download ~1.7GB)
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# Load your Instagram post image
image = Image.open("testing.jpg")

# Define possible categories/keywords to check
candidate_labels = [
    "food", "travel", "fashion", "fitness", "beauty",
    "nature", "architecture", "selfie", "party", "beach",
    "restaurant", "luxury", "casual", "car", "technology"
]

# Process image and text
inputs = processor(
    text=candidate_labels,
    images=image,
    return_tensors="pt",
    padding=True
)

# Get predictions
outputs = model(**inputs)
logits_per_image = outputs.logits_per_image  # Image-text similarity scores
probs = logits_per_image.softmax(dim=1)  # Convert to probabilities

# Get top 5 keywords
top_k = 5
top_probs, top_indices = probs[0].topk(top_k)

print("Top Keywords:")
for i in range(top_k):
    keyword = candidate_labels[top_indices[i]]
    confidence = top_probs[i].item() * 100
    print(f"  {keyword}: {confidence:.2f}%")