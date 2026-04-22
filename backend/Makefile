PYTHON := python3
VENV := .venv
PIP := $(VENV)/bin/pip
UVICORN := $(VENV)/bin/uvicorn

.PHONY: init run update freeze clean delete

init:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@if [ ! -f .env ]; then cp .env.example .env; fi

run:
	$(UVICORN) app.main:app --reload --host 0.0.0.0 --port 8000

update:
	$(PIP) install --upgrade -r requirements.txt

freeze:
	$(PIP) freeze > requirements.txt

clean:
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

delete:
	rm -rf $(VENV)
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -f .env
