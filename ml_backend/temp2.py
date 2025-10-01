from huggingface_hub import InferenceClient

# Initialize client with your token
client = InferenceClient(token="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")

def analyze_instagram_image(image_path):
    """
    Analyze image using Hugging Face inference
    """
    # Define your categories
    candidate_labels = [
        "food", "travel", "fashion", "fitness", "beauty",
        "nature", "selfie", "party", "beach", "restaurant",
        "luxury lifestyle", "casual", "workout", "makeup",
        "architecture", "car", "technology", "pet"
    ]
    
    try:
        # Pass the file path directly (not PIL Image)
        result = client.zero_shot_image_classification(
            image_path,  # Pass the path as string, not PIL Image
            candidate_labels
        )
        
        # Get top 5 results
        top_results = sorted(result, key=lambda x: x['score'], reverse=True)[:5]
        return [(item['label'], item['score']) for item in top_results]
        
    except Exception as e:
        print(f"Error: {e}")
        return []

# Usage - just pass the path as string
keywords = analyze_instagram_image("testing.jpg")
for keyword, confidence in keywords:
    print(f"{keyword}: {confidence*100:.2f}%")