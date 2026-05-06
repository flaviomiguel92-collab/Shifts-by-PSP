# Database Cleanup Instructions

To delete all shifts, cycles, occurrences, and gratifications from MongoDB:

## Option 1: Run with Render's MONGO_URL (Recommended)

1. Go to https://dashboard.render.com
2. Open your "shift-olama-backend" service
3. Click "Environment" tab
4. Find and copy your `MONGO_URL` value

5. Run the cleanup script:
```bash
cd backend
$env:MONGO_URL = "paste_your_mongo_url_here"
python cleanup_db.py
```

For PowerShell on Windows:
```powershell
$env:MONGO_URL = "your_mongo_url"
python cleanup_db.py
```

For Linux/Mac:
```bash
MONGO_URL="your_mongo_url" python cleanup_db.py
```

## Option 2: If script can't install dependencies
You may need to install motor first:
```bash
pip install motor
```

Then run the cleanup script as in Option 1.

---
