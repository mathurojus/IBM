# 110 agents

A premium multi-agent dashboard built with FastAPI (backend) and Vite?+?React (frontend). The UI follows a dark, metallic theme and offers pages for running agents, viewing history, and adjusting settings.

## Project Structure

- **backend/** – FastAPI server, Python dependencies in equirements.txt.
- **frontend/** – Vite React SPA, Node dependencies in package.json.
- **.gitignore** – Ignores node_modules, Python cache, env files, build artifacts.
- **docker-compose.yml** – Spin up backend and frontend containers.

## Development

1. Clone the repository.
2. Create a .env file (copy from .env.example) with your API keys.
3. Install backend deps:
   `ash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   `
4. Install frontend deps:
   `ash
   cd ../frontend
   npm install
   npm run dev
   `
5. Run the backend:
   `ash
   cd ../backend
   uvicorn main:app --reload
   `

Open http://localhost:5173 for the UI.

## Production (Docker)

`ash
docker compose up --build
`

The backend will be available at http://localhost:8000 and the frontend at http://localhost:5173 (or the port configured in the Dockerfile).

## License

MIT
