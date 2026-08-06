# Dorra Backend

## Deploy to Railway

1. Go to railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Upload this folder to a new GitHub repo first:
   - Go to github.com → New repository → name it "dorra-backend"
   - Upload all these files
4. In Railway, connect that GitHub repo
5. Add these environment variables in Railway dashboard:

```
MONGO_URI=mongodb+srv://dorrastonejewelry_db_user:7IUOZQdcJNosNM4I@dorra.9en5a5j.mongodb.net/dorra?appName=dorra
GMAIL_USER=dorrastonejewelry@gmail.com
GMAIL_PASS=tdqs hhia duma mhsj
PAYMOB_API_KEY=your_key_here
PAYMOB_INTEGRATION_ID=your_id_here
PAYMOB_IFRAME_ID=your_iframe_id_here
ADMIN_SECRET=dorra2026admin
```

6. Railway will give you a URL like: https://dorra-backend.up.railway.app
7. Copy that URL and paste it as API_BASE in dorra.jsx

## API Endpoints

- POST /api/orders — place an order
- GET  /api/orders — get all orders (admin)
- PATCH /api/orders/:ref/status — update status (admin)
- POST /api/reviews — submit review
- GET  /api/reviews/published — get approved reviews
- GET  /api/reviews/pending — get pending reviews (admin)
- PATCH /api/reviews/:id/approve — approve review (admin)
- DELETE /api/reviews/:id — reject review (admin)
- POST /api/payment/initiate — start Paymob payment
- POST /api/payment/callback — Paymob webhook
