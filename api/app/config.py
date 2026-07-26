import os

from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_API_KEY_BACKUP = os.getenv("SARVAM_API_KEY_BACKUP", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "turn-audio")
BEECEPTOR_URL = os.getenv("BEECEPTOR_URL", "")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
