# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Run server: `python proxy.py`
- Deploy with WSGI: `gunicorn wsgi:app`

## Development Environment
- Python backend with Flask (`proxy.py`)
- HTML frontend with vanilla JavaScript modules
- Requires Anthropic API key in `.env` file (CLAUDE_API_KEY)

## Code Style Guidelines
- Python: PEP 8 style (4-space indentation)
- JavaScript: 2-space indentation, camelCase for variables/functions
- HTML/CSS: 4-space indentation
- Error handling: Use try/catch blocks with proper logging

## Project Structure
- `/static`: JS modules, CSS, and config
- `/templates`: HTML templates
- `/pages`: Generated user content
- `proxy.py`: Flask server with Claude API integration

## Naming Conventions
- JavaScript: camelCase for variables/functions
- Python: snake_case for variables/functions
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE

## Key Components
- canvasManager.js: Drawing functionality
- dataManager.js: Local storage and data import/export
- aiService.js: Claude API integration
- app.js: Main application logic
