<div align="center">
  <h1 align="center">Event Registration System (BSB)</h1>
  <p align="center">
    A modern, fully-featured event registration and donation platform built for the <strong>#BelajarSambilBeramal</strong> initiative.
    <br />
    <br />
  </p>
</div>

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## ✨ Features

- **Modern & Responsive UI**: Beautiful interfaces built with React and Tailwind CSS.
- **Dynamic Form Validation**: Robust schema-based validation utilizing `react-hook-form` and `zod`.
- **Payment Gateway Integration**: Seamless processing using Doku/Jokul connection.
- **Real-time Synchronization**: Admin dashboard reflects new registrants and transactions instantly via Supabase Reatime.
- **Role-based Authentication**: Secure admin and visitor boundaries.
- **Automated Workflows**: Intelligent edge-functions to process payment webhooks and handle serverless logic.
- **Data Export**: Export verified registrant lists and donation trackers straight to `.csv`.

## 🛠️ Technology Stack

- **Frontend Core**: React 18, TypeScript, Vite, React Router DOM
- **Styling**: Tailwind CSS, Lucide React (Icons), clsx, Tailwind Merge
- **Form Handling**: React Hook Form, Zod (Schema Validation)
- **Backend / Database**: Supabase (PostgreSQL, Edge Functions, Realtime, Auth)
- **Payment Processing**: DOKU Jokul Checkout

## ⚙️ Getting Started

Follow these steps to setup the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) account and project.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AlfeusMartinus/regis-bsb.git
   cd regis-bsb
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following keys. Ask your team lead for the specific values.
   ```env
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
   ```
   *Note: If you plan to test the Supabase Edge Functions locally, duplicate this to a `.env.local` inside the `supabase/` folder containing the necessary keys (like your Payment Gateway Sandbox keys and Supabase Service Role Key).*

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## 🗄️ Database Setup

The project requires several tables (e.g., `events`, `registrations`, etc.). 
The schema mapping can be found in `supabase/schema.sql`.

To apply it manually, go to the **SQL Editor** in your Supabase dashboard and run the entire SQL script provided.

## 🚀 Deployment

### Frontend Delivery
The React application can be easily distributed via Vercel, Netlify, or Cloudflare Pages. 
Build the application utilizing Vite:
```bash
npm run build
```

### Edge Functions Deployment
For payment operations, deploy the serverless functions to Supabase via Supabase CLI. Make sure the Doker daemon is running if required by the CLI interface.

```bash
# Login to Supabase CLI if you haven't
npx supabase login

# Deploy a specific function (e.g., create-payment)
npx supabase functions deploy create-payment --no-verify-jwt
```

## 📜 License

This project is intended for internal or specified organizational use. 

---
<div align="center">
  <i>Developed with ❤️ for #BelajarSambilBeramal.</i>
</div>
