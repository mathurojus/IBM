# 110 Agents – Multi-Agent Dashboard

A premium-styled, dark-theme web application for orchestrating multiple AI agents through a **FastAPI** backend and a **React + Vite** frontend.

The application provides a clean dashboard for running AI workflows, managing agents, viewing execution history, configuring providers, and monitoring results—all within a modern metallic-silver interface on a pure black theme.

---

# Table of Contents

- Overview
- Features
- Tech Stack
- Project Structure
- Prerequisites
- Installation
- Environment Variables
- Running the Project
- Production Build
- Deployment
- GitHub Checklist
- Contributing
- License

---

# Overview

110 Agents is designed as a lightweight multi-agent orchestration platform.

The project separates the backend and frontend completely, allowing each service to be deployed independently while communicating through REST APIs.

### Backend

- FastAPI
- Python 3.11
- SQLite
- REST API
- Agent orchestration
- Provider management

### Frontend

- React 19
- Vite
- React Router
- Modern responsive UI
- Glassmorphism design
- Dark premium interface

---

# Features

- Multi-Agent orchestration
- FastAPI backend
- React dashboard
- Execution history
- Individual run details
- Agent configuration
- Provider configuration
- Environment-based API key management
- SQLite persistence
- Responsive design
- Dark premium UI
- Modular architecture
- Easy deployment

---

# Tech Stack

## Frontend

- React 19
- Vite
- React Router
- JavaScript
- CSS

## Backend

- Python 3.11
- FastAPI
- SQLite
- Uvicorn
- Pydantic

---

# Project Structure

```text
110-agents/
│
├── backend/
│   ├── main.py
│   ├── orchestrator.py
│   ├── agents.py
│   ├── database.py
│   ├── models.py
│   ├── requirements.txt
│   └── .gitignore
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   ├── vite.config.js
│   └── .gitignore
│
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

# Prerequisites

| Software | Version |
|----------|----------|
| Node.js | 20+ |
| npm | 10+ |
| Python | 3.11+ |
| Git | Latest |

---

# Installation

## Clone Repository

```bash
git clone https://github.com/mathurojus/IBM.git

cd IBM
```

---

## Backend Setup

```bash
cd backend

python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Create environment file

```bash
cp .env.example .env
```

Start the server

```bash
uvicorn main:app --reload
```

Backend will run at

```
http://localhost:8000
```

---

## Frontend Setup

Open another terminal.

```bash
cd frontend

npm install

npm run dev
```

Frontend will run at

```
http://localhost:5173
```

---

# Environment Variables

Create a `.env` file.

```env
# Provider Keys

OPENAI_API_KEY=

ANTHROPIC_API_KEY=

GEMINI_API_KEY=

GROQ_API_KEY=

# Default Provider

DEFAULT_PROVIDER=groq

# Models

OPENAI_MODEL=gpt-4o

ANTHROPIC_MODEL=claude-sonnet-4-20250514

GEMINI_MODEL=gemini-2.0-flash

GROQ_MODEL=llama-3.3-70b-versatile
```

At least one provider API key should be configured.

---

# Running the Project

Start backend

```bash
cd backend

uvicorn main:app --reload
```

Start frontend

```bash
cd frontend

npm run dev
```

The frontend automatically communicates with the backend through the configured API proxy.

---

# Production Build

## Frontend

```bash
cd frontend

npm run build
```

The production files are generated inside

```
frontend/dist
```

These files can be deployed to:

- Vercel
- Netlify
- GitHub Pages
- AWS S3
- CloudFront
- Any static hosting platform

---

## Backend

Install dependencies

```bash
pip install -r requirements.txt
```

Run

```bash
uvicorn main:app
```

---

## Docker

Build image

```bash
docker build -t 110-agents-backend .
```

Run container

```bash
docker run \
-p 8000:8000 \
-e DEFAULT_PROVIDER=groq \
-e GROQ_API_KEY=YOUR_KEY \
110-agents-backend
```

---

# GitHub Checklist

Before publishing:

- Remove secrets
- Keep `.env` ignored
- Verify `.gitignore`
- Include LICENSE
- Verify README
- Test frontend
- Test backend

Commit

```bash
git add .

git commit -m "Prepare project for release"

git push origin main
```

---

# Contributing

Contributions are welcome.

Please:

- Fork the repository
- Create a feature branch
- Follow existing code style
- Run frontend linting
- Run backend checks
- Submit a Pull Request

---

# License

MIT License

Feel free to use, modify, distribute, and build upon this project in accordance with the MIT License.

---

Built with FastAPI, React, and Vite.
