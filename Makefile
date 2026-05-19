.PHONY: all build build-chrome build-firefox test lint lint-fix typecheck format format-check ci clean install release release-dry

all: typecheck lint build test

install:
	pnpm install

build: build-chrome build-firefox

build-chrome:
	pnpm build

build-firefox:
	pnpm build:firefox

test:
	pnpm test

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

typecheck:
	pnpm typecheck

format:
	pnpm format

format-check:
	pnpm format:check

ci: typecheck lint build test

release: typecheck lint build test
	npx semantic-release

release-dry:
	npx semantic-release --dry-run

clean:
	rm -rf .output dist node_modules/.vite
