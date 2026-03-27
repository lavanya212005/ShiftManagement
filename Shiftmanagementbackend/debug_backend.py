try:
    import main
    print("✅ Main module imported successfully.")
    from main import app
    print("✅ FastAPI app instance found.")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
