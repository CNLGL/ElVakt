.PHONY: init run build start lint clean delete

init:
	npm install
	@if [ ! -f .env.local ]; then cp .env.example .env.local; fi

run:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

clean:
	rm -rf .next
	rm -rf out

delete:
	rm -rf node_modules
	rm -rf .next
	rm -rf out
	rm -f .env.local
