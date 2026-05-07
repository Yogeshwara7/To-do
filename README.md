# To-Do List App

Manage your daily tasks with a clean, simple interface.

---

## Run Locally

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd To-do
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
- Create a free account at [supabase.com](https://supabase.com)
- Create a new project
- Go to **SQL Editor** → paste and run `setup.sql`
- Go to **Settings → API** → copy your Project URL and anon key

### 4. Add your Supabase keys
Open `public/app.js` and update:
```js
const SUPABASE_URL = 'your_project_url';
const SUPABASE_KEY = 'your_anon_key';
```

### 5. Start the app
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy on Render
1. Push this folder as a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add environment variables:
   - `SUPABASE_URL` → your Supabase project URL
   - `SUPABASE_SERVICE_KEY` → your Supabase service role key

---
