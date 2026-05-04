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

## Screenshots
### Dashboard page
Initial page:
<br></br>
<img width="1820" height="932" alt="Screenshot 2026-05-03 at 6 17 09 PM" src="https://github.com/user-attachments/assets/97d5fe74-0583-4620-bf64-446ff2f40127" />
<br></br>
On clicking the High Impact Swap card's Learn More link -> panel with actionable insights:
<br></br>
<img width="1829" height="930" alt="Screenshot 2026-05-03 at 6 17 44 PM" src="https://github.com/user-attachments/assets/ae5fc0c5-0525-4192-8d08-4e9c8576dc4c" />

### Goals page
Allows deeper drilling into stats and progress.

- Initial view:
<br></br>
<img width="1242" height="949" alt="Screenshot 2026-05-03 at 6 18 50 PM" src="https://github.com/user-attachments/assets/1427dd89-c3a7-4362-8860-d784edea9306" />
<br></br>
- Scrolling down - can see encouragement about journey, as well as charts about macros (fats only for now):
<br></br>
<img width="1232" height="950" alt="Screenshot 2026-05-03 at 6 19 11 PM" src="https://github.com/user-attachments/assets/2bb2a236-c1fe-41c8-be1b-c3bbad402cd0" />
<br></br>
Clicking the Fats bar chart opens a panel with deeper data the user can find trends with.
- Greatest sources of fat by food in the last month:
<br></br>
<img width="1228" height="940" alt="Screenshot 2026-05-03 at 7 31 07 PM" src="https://github.com/user-attachments/assets/bf3d56cb-9d9b-485e-958a-30bfc1c6c6d8" />
<br></br>
- Largest changes in fat contributions from food between last month to this month:
<br></br>
<img width="1247" height="946" alt="Screenshot 2026-05-03 at 6 27 50 PM" src="https://github.com/user-attachments/assets/22b50006-90a7-472a-8ef2-bb78a4e56b00" />


