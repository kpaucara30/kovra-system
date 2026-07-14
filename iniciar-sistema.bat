@echo off
cd /d "%~dp0"
start "" "http://localhost:8001/index.html"
"C:\Users\kpauc\AppData\Local\OpenAI\Codex\bin\node.exe" server\server.js
