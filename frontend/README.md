# AGC ProPack – Frontend

This folder contains the frontend for the AGC ProPack senior project.
The frontend is a modern web application built with React and Vite, providing a professional dashboard for inventory management, billing, and reporting.

## Tech Stack

- **React 19**
- **Vite** (Build tool and dev server)
- **TypeScript**
- **React Router** (Navigation)
- **Stripe SDK** (Payment processing)
- **Vanilla CSS** (Styling)

## How to Run the Frontend

1. **Go to the frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## Frontend Info

The development server typically runs at:
[http://localhost:5173/](http://localhost:5173/)

## Key Features

- **Marketing Landing Page**: Professional introduction to the ACG ProPack platform.
- **Subscription Management**: Integrated billing flow with support for Basic and Pro plans.
- **Payment Processing**: Secure payment method management using Stripe Elements.
- **Invoice History**: Comprehensive view of past payments and invoice details.
- **Admin Dashboard**: Centralized management interface for company operations.
- **User Profile & Settings**: Personalization and account configuration options.

## Notes

- Ensure the backend is running and accessible for full functionality.
- Environment variables are managed in `.env` (not committed).
- The project uses modern React patterns (Hooks, Functional Components).
