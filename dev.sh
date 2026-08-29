#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
GUID="${ITERM_SESSION_ID##*:}"


osascript <<APPLESCRIPT
set rootPath to "$ROOT"
set guid to "$GUID"


tell application "iTerm"
	activate

	-- ── Locate the session running this script (same window & tab) ──
	set found to missing value
	if guid is not "" then
		repeat with w in windows
			repeat with t in tabs of w
				repeat with s in sessions of t
					if (id of s) contains guid then
						set found to s
						set winObj to w
						set tabObj to t
						exit repeat
					end if
				end repeat
				if found is not missing value then exit repeat
			end repeat
			if found is not missing value then exit repeat
		end repeat
	end if

	-- Not running inside iTerm2: fall back to a new tab in the front window
	if found is missing value then
		tell current window
			create tab with default profile
			delay 0.3
			set found to current session
			set tabObj to current tab
			set winObj to current window
		end tell
	end if

	-- ── Tab 1: 2x2 grid of panes in the script's tab ──────────────
	-- s1 (top-left): FastAPI server
	tell found to split vertically with default profile
	delay 0.3
	-- s2 (top-right): client server
	set allS to sessions of tabObj
	set s2 to item (count of allS) of allS
	tell s2 to split horizontally with default profile
	delay 0.3
	-- s3 (bottom-right): client folder
	set allS to sessions of tabObj
	set s3 to item (count of allS) of allS
	-- s4 (bottom-left): backend folder
	tell found to split horizontally with default profile
	delay 0.3
	set allS to sessions of tabObj
	set s4 to item (count of allS) of allS

	tell found to write text "cd '" & rootPath & "/backend-fastapi' && python3 -m uvicorn main:app --reload"
	tell s2 to write text "cd '" & rootPath & "/client' && npm run dev"
	tell s3 to write text "cd '" & rootPath & "/client' && pwd"
	tell s4 to write text "cd '" & rootPath & "/backend-fastapi' && pwd"

	-- ── Tab 2: opencode with model ────────────────────────────────
	tell winObj
		create tab with default profile
		delay 0.3
		tell current session to write text "cd '" & rootPath & "' && opencode"
	end tell

	-- ── Tab 3: root + docker + VS Code ────────────────────────────
	tell winObj
		create tab with default profile
		delay 0.3
		tell current session to write text "cd '" & rootPath & "'"
		tell current session to write text "docker-compose up -d && docker-compose logs -f db"
		tell current session to write text "code ."
	end tell
end tell
APPLESCRIPT