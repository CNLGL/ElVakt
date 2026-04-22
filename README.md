# ElVakt
ElVakt is a web application for checking Swedish electricity prices by postcode.
Users can enter a Swedish postcode and see the current electricity region, today's hourly prices, tomorrow's prices when available, and simple price statistics.
Registered users can also save locations and test device-based energy usage charts. The project is being prepared for future premium features such as smart device integration, alerts, and energy cost tracking.
## Project Structure
```txt
ElVakt/
├── backend/
├── frontend/
├── k8s/
├── docker-compose.yaml
└── README.md
```
## Requirements
Install these before running the project:
- Python 3.12+
- Node.js 22+
- npm
- make
## Backend Setup
Go to the backend folder:
```bash
cd backend
```
Initialize the backend:
```bash
make init
```
Run the backend:
```bash
make run
```
Backend runs on:
```txt
http://localhost:8000
```
## Frontend Setup
Open a second terminal and go to the frontend folder:
```bash
cd frontend
```
Initialize the frontend:
```bash
make init
```
Run the frontend:
```bash
make run
```
Frontend runs on:
```txt
http://localhost:3000
```
## Environment Files
Environment files are not committed to Git.
During `make init`, these files are created automatically from the example files:
```txt
backend/.env
frontend/.env.local
```
If needed, you can edit them manually after setup.
## Useful Commands
Backend:
```bash
make init
make run
make clean
make delete
```
Frontend:
```bash
make init
make run
make build
make clean
make delete
```
## Notes
The backend currently uses SQLite for local development.
For production, the project is planned to use PostgreSQL, Docker, Kubernetes, and CI/CD.