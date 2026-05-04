# Calibrate Web Frontend

This project is a calorie tracking app prototype for someone trying to lose weight, feel more fit, or build healthier habits.

The first goal right now is to demonstrate product judgment: take what could easily become a dense, data-heavy application and keep it simple enough to be useful. The current UI is built with mock data, most things are not actually functional, pages do not load live data yet. That is intentional. It lets the product direction, information hierarchy, and interaction patterns come first before backend contracts or analytics plumbing harden too early.

The target user is not an expert mathematician or nutrition analyst. They need to understand what to do next. The most important product work is surfacing actions and actionable insights that help them keep momentum with new habits, while suggesting small tweaks they may not have realized were available.

Charts and data stay at overview level by default. When a user chooses to drill deeper, the app should still be selective about what it shows. More data is only useful when it creates a clearer insight, a better decision, or a practical adjustment the user can actually make.

## Tech Stack Notes

TanStack Router is a good fit because it gives the app fully-typed routing with room to grow into route loaders for high network performance for mobile users taking time of their busy day to jot down meal entries.

shadcn/ui is useful here for helping build battle-tested, accessible, polished UI quickly while still allowing keeping ownership over styling, behavior, and product-specific details.

## Running Locally

Install dependencies once:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

The app runs at:

```text
http://localhost:3000
```
