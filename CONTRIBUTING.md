# Contributing & Deploying Updates

This project is linked to GitHub and Vercel. Any updates pushed to the `main` branch on GitHub will automatically trigger a new deployment on Vercel.

## How to push future updates

Whenever you make changes to the code locally and want them to go live, open your terminal (inside the `linkedin-engage` folder) and run the following three commands:

```bash
# 1. Stage all your changed files
git add .

# 2. Commit your changes with a descriptive message
git commit -m "your message describing what changed"

# 3. Push the changes to GitHub (which triggers Vercel automatically)
git push origin main
```
