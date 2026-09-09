import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal
from app.models import Post, User, Comment

db = SessionLocal()

users_data = [
    {"github_id": 100001, "username": "alice", "email": "alice@example.com", "avatar_url": "https://avatars.githubusercontent.com/u/100001?v=4"},
    {"github_id": 100002, "username": "bob", "email": "bob@example.com", "avatar_url": "https://avatars.githubusercontent.com/u/100002?v=4"},
    {"github_id": 100003, "username": "charlie", "email": "charlie@example.com", "avatar_url": "https://avatars.githubusercontent.com/u/100003?v=4"},
]

users = []
for u in users_data:
    existing = db.query(User).filter(User.github_id == u["github_id"]).first()
    if not existing:
        user = User(**u)
        db.add(user)
        db.flush()
        users.append(user)
    else:
        users.append(existing)

db.commit()

post_templates = [
    {"title": "Flappy Bird Clone", "type": "playable", "shortDescription": "A fun flappy bird clone built with HTML5 Canvas", "github": "https://github.com/alice/flappy-bird", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 45, "forks": 12, "watchers": 8, "openIssues": 2}},
    {"title": "Snake Game", "type": "playable", "shortDescription": "Classic snake game with modern UI", "github": "https://github.com/alice/snake-game", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 32, "forks": 8, "watchers": 5, "openIssues": 1}},
    {"title": "Tetris Online", "type": "playable", "shortDescription": "Multiplayer Tetris game built with React", "github": "https://github.com/bob/tetris-online", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 78, "forks": 23, "watchers": 15, "openIssues": 4}},
    {"title": "Pong Classic", "type": "playable", "shortDescription": "Retro pong game with AI opponent", "github": "https://github.com/charlie/pong-classic", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 21, "forks": 5, "watchers": 3, "openIssues": 0}},
    {"title": "Maze Generator", "type": "hosted", "shortDescription": "Random maze generator with solving algorithm", "github": "https://github.com/alice/maze-gen", "language": "Python", "defaultBranch": "main", "stats": {"stars": 56, "forks": 14, "watchers": 9, "openIssues": 3}},
    {"title": "Weather Dashboard", "type": "hosted", "shortDescription": "Real-time weather dashboard with 5-day forecast", "github": "https://github.com/bob/weather-dash", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 89, "forks": 31, "watchers": 22, "openIssues": 6}},
    {"title": "Todo App Pro", "type": "hosted", "shortDescription": "Feature-rich todo app with drag and drop", "github": "https://github.com/charlie/todo-pro", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 44, "forks": 11, "watchers": 7, "openIssues": 2}},
    {"title": "Calculator UI", "type": "playable", "shortDescription": "Beautiful calculator with dark mode", "github": "https://github.com/alice/calc-ui", "language": "CSS", "defaultBranch": "main", "stats": {"stars": 19, "forks": 4, "watchers": 3, "openIssues": 0}},
    {"title": "Chat Application", "type": "hosted", "shortDescription": "Real-time chat with WebSocket support", "github": "https://github.com/bob/chat-app", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 102, "forks": 45, "watchers": 30, "openIssues": 8}},
    {"title": "Portfolio Generator", "type": "hosted", "shortDescription": "Generate portfolio sites from JSON config", "github": "https://github.com/charlie/portfolio-gen", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 67, "forks": 19, "watchers": 12, "openIssues": 3}},
    {"title": "Breakout Game", "type": "playable", "shortDescription": "Brick breaker game with power-ups", "github": "https://github.com/alice/breakout", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 38, "forks": 9, "watchers": 6, "openIssues": 1}},
    {"title": "Markdown Editor", "type": "hosted", "shortDescription": "Live preview markdown editor", "github": "https://github.com/bob/md-editor", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 91, "forks": 27, "watchers": 18, "openIssues": 5}},
    {"title": "Pacman Clone", "type": "playable", "shortDescription": "Pacman game with level editor", "github": "https://github.com/charlie/pacman-clone", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 53, "forks": 16, "watchers": 10, "openIssues": 2}},
    {"title": "Kanban Board", "type": "hosted", "shortDescription": "Trello-like kanban board with drag-drop", "github": "https://github.com/alice/kanban", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 76, "forks": 22, "watchers": 14, "openIssues": 4}},
    {"title": "Quiz App", "type": "playable", "shortDescription": "Interactive quiz with score tracking", "github": "https://github.com/bob/quiz-app", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 29, "forks": 7, "watchers": 4, "openIssues": 1}},
    {"title": "Expense Tracker", "type": "hosted", "shortDescription": "Track expenses with charts and reports", "github": "https://github.com/charlie/expense-tracker", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 84, "forks": 26, "watchers": 17, "openIssues": 5}},
    {"title": "Sudoku Solver", "type": "playable", "shortDescription": "Sudoku puzzle solver with step-by-step", "github": "https://github.com/alice/sudoku", "language": "Python", "defaultBranch": "main", "stats": {"stars": 41, "forks": 10, "watchers": 7, "openIssues": 1}},
    {"title": "Music Player", "type": "playable", "shortDescription": "Web-based music player with playlist", "github": "https://github.com/bob/music-player", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 63, "forks": 18, "watchers": 11, "openIssues": 3}},
    {"title": "Drawing Canvas", "type": "playable", "shortDescription": "Digital drawing tool with brushes", "github": "https://github.com/charlie/draw-canvas", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 47, "forks": 13, "watchers": 8, "openIssues": 2}},
    {"title": "URL Shortener", "type": "hosted", "shortDescription": "Shorten URLs with analytics", "github": "https://github.com/alice/url-short", "language": "Python", "defaultBranch": "main", "stats": {"stars": 95, "forks": 34, "watchers": 25, "openIssues": 7}},
    {"title": "Memory Game", "type": "playable", "shortDescription": "Card matching memory game", "github": "https://github.com/bob/memory-game", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 26, "forks": 6, "watchers": 4, "openIssues": 0}},
    {"title": "Blog Engine", "type": "hosted", "shortDescription": "Minimal blog engine with markdown", "github": "https://github.com/charlie/blog-engine", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 71, "forks": 21, "watchers": 13, "openIssues": 4}},
    {"title": "Chess Game", "type": "playable", "shortDescription": "Online chess with AI opponent", "github": "https://github.com/alice/chess-game", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 108, "forks": 42, "watchers": 32, "openIssues": 9}},
    {"title": "Invoice Generator", "type": "hosted", "shortDescription": "Generate professional invoices", "github": "https://github.com/bob/invoice-gen", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 59, "forks": 17, "watchers": 10, "openIssues": 3}},
    {"title": "Word Scramble", "type": "playable", "shortDescription": "Unscramble words against the clock", "github": "https://github.com/charlie/word-scramble", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 18, "forks": 3, "watchers": 2, "openIssues": 0}},
    {"title": "Recipe Finder", "type": "hosted", "shortDescription": "Find recipes by ingredients", "github": "https://github.com/alice/recipe-finder", "language": "Python", "defaultBranch": "main", "stats": {"stars": 87, "forks": 29, "watchers": 20, "openIssues": 6}},
    {"title": "Space Invaders", "type": "playable", "shortDescription": "Classic space shooter game", "github": "https://github.com/bob/space-invaders", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 52, "forks": 15, "watchers": 9, "openIssues": 2}},
    {"title": "Color Palette", "type": "hosted", "shortDescription": "Generate color palettes for design", "github": "https://github.com/charlie/color-palette", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 36, "forks": 8, "watchers": 5, "openIssues": 1}},
    {"title": "Rubiks Cube", "type": "playable", "shortDescription": "3D Rubiks cube solver", "github": "https://github.com/alice/rubiks-cube", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 73, "forks": 24, "watchers": 16, "openIssues": 4}},
    {"title": "Note Taking App", "type": "hosted", "shortDescription": "Rich text note taking with folders", "github": "https://github.com/bob/notes-app", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 94, "forks": 33, "watchers": 24, "openIssues": 7}},
    {"title": "Tic Tac Toe", "type": "playable", "shortDescription": "Multiplayer tic tac toe online", "github": "https://github.com/charlie/tic-tac-toe", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 15, "forks": 2, "watchers": 2, "openIssues": 0}},
    {"title": "Stock Tracker", "type": "hosted", "shortDescription": "Track stock prices in real-time", "github": "https://github.com/alice/stock-tracker", "language": "Python", "defaultBranch": "main", "stats": {"stars": 82, "forks": 28, "watchers": 19, "openIssues": 5}},
    {"title": "Whack-a-Mole", "type": "playable", "shortDescription": "Classic whack-a-mole arcade game", "github": "https://github.com/bob/whack-mole", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 31, "forks": 7, "watchers": 5, "openIssues": 1}},
    {"title": "Habit Tracker", "type": "hosted", "shortDescription": "Track daily habits and streaks", "github": "https://github.com/charlie/habit-tracker", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 68, "forks": 20, "watchers": 12, "openIssues": 3}},
    {"title": "Rock Paper Scissors", "type": "playable", "shortDescription": "RPS game with scoring system", "github": "https://github.com/alice/rps-game", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 12, "forks": 1, "watchers": 1, "openIssues": 0}},
    {"title": "File Manager", "type": "hosted", "shortDescription": "Web-based file manager with drag-drop", "github": "https://github.com/bob/file-manager", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 55, "forks": 16, "watchers": 10, "openIssues": 2}},
    {"title": "Simon Says", "type": "playable", "shortDescription": "Memory pattern game", "github": "https://github.com/charlie/simon-says", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 23, "forks": 5, "watchers": 3, "openIssues": 0}},
    {"title": "Bookmark Manager", "type": "hosted", "shortDescription": "Organize bookmarks with tags", "github": "https://github.com/alice/bookmarks", "language": "Python", "defaultBranch": "main", "stats": {"stars": 48, "forks": 12, "watchers": 8, "openIssues": 2}},
    {"title": "2048 Game", "type": "playable", "shortDescription": "Slide tiles to reach 2048", "github": "https://github.com/bob/game-2048", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 64, "forks": 19, "watchers": 11, "openIssues": 3}},
    {"title": "Password Generator", "type": "hosted", "shortDescription": "Generate secure passwords", "github": "https://github.com/charlie/pass-gen", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 37, "forks": 9, "watchers": 6, "openIssues": 1}},
    {"title": "Bomberman", "type": "playable", "shortDescription": "Multiplayer bomberman game", "github": "https://github.com/alice/bomberman", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 58, "forks": 17, "watchers": 10, "openIssues": 3}},
    {"title": "Markdown Preview", "type": "hosted", "shortDescription": "Real-time markdown preview tool", "github": "https://github.com/bob/md-preview", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 42, "forks": 10, "watchers": 7, "openIssues": 1}},
    {"title": "Hangman", "type": "playable", "shortDescription": "Word guessing hangman game", "github": "https://github.com/charlie/hangman", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 27, "forks": 6, "watchers": 4, "openIssues": 0}},
    {"title": "Timer App", "type": "hosted", "shortDescription": "Pomodoro timer with session tracking", "github": "https://github.com/alice/timer-app", "language": "Python", "defaultBranch": "main", "stats": {"stars": 79, "forks": 25, "watchers": 15, "openIssues": 4}},
    {"title": "Dodge Game", "type": "playable", "shortDescription": "Dodge falling objects game", "github": "https://github.com/bob/dodge-game", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 16, "forks": 3, "watchers": 2, "openIssues": 0}},
    {"title": "Resume Builder", "type": "hosted", "shortDescription": "Build professional resumes online", "github": "https://github.com/charlie/resume-builder", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 88, "forks": 30, "watchers": 21, "openIssues": 6}},
    {"title": "Ping Pong", "type": "playable", "shortDescription": "Two player ping pong game", "github": "https://github.com/alice/ping-pong", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 34, "forks": 8, "watchers": 5, "openIssues": 1}},
    {"title": "Code Snippets", "type": "hosted", "shortDescription": "Save and share code snippets", "github": "https://github.com/bob/code-snippets", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 72, "forks": 22, "watchers": 14, "openIssues": 3}},
    {"title": "Arrow Keys Runner", "type": "playable", "shortDescription": "Run and jump with arrow keys", "github": "https://github.com/charlie/arrow-runner", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 20, "forks": 4, "watchers": 3, "openIssues": 0}},
    {"title": "Link Tree", "type": "hosted", "shortDescription": "Create your link tree page", "github": "https://github.com/alice/link-tree", "language": "Python", "defaultBranch": "main", "stats": {"stars": 61, "forks": 16, "watchers": 11, "openIssues": 2}},
    {"title": "Bubble Shooter", "type": "playable", "shortDescription": "Match bubbles to clear the board", "github": "https://github.com/bob/bubble-shooter", "language": "JavaScript", "defaultBranch": "main", "stats": {"stars": 43, "forks": 11, "watchers": 7, "openIssues": 2}},
    {"title": "QR Code Generator", "type": "hosted", "shortDescription": "Generate QR codes for any URL", "github": "https://github.com/charlie/qr-gen", "language": "TypeScript", "defaultBranch": "main", "stats": {"stars": 50, "forks": 13, "watchers": 9, "openIssues": 1}},
]

count = 0
for i, post_data in enumerate(post_templates):
    post_id = f"seed-{i+1}"
    if db.query(Post).filter(Post.id == post_id).first() is None:
        user = users[i % len(users)]
        post = Post(
            id=post_id,
            user_id=user.id,
            title=post_data["title"],
            type=post_data["type"],
            shortDescription=post_data["shortDescription"],
            description=f"# {post_data['title']}\n\n{post_data['shortDescription']}\n\nThis is a demo project created for testing infinite scroll functionality.",
            github=post_data["github"],
            language=post_data["language"],
            defaultBranch=post_data["defaultBranch"],
            stats=post_data["stats"],
            githubOwner=user.username,
            dateOfCreation=random.randint(1700000000, 1720000000),
        )
        db.add(post)
        count += 1

db.commit()
print(f"✅ Seeded successfully! Total new posts added: {count}")
print(f"   Users: {[u.username for u in users]}")

# Seed comments for some posts
from datetime import datetime, timezone
now = datetime.now(timezone.utc).isoformat()
comment_templates = [
    {"post_id": "seed-1", "user_id": 1, "content": "Great post! Really enjoyed reading this."},
    {"post_id": "seed-2", "user_id": 2, "content": "Very informative, thanks for sharing!"},
    {"post_id": "seed-3", "user_id": 3, "content": "I've been looking for something like this."},
    {"post_id": "seed-4", "user_id": 1, "content": "Can't wait to try this out!"},
    {"post_id": "seed-5", "user_id": 2, "content": "Bookmarking this for later."},
]

for c in comment_templates:
    existing = db.query(Comment).filter(Comment.post_id == c["post_id"], Comment.user_id == c["user_id"]).first()
    if not existing:
        comment = Comment(
            post_id=c["post_id"],
            user_id=c["user_id"],
            content=c["content"],
            created_at=now,
            updated_at=now,
        )
        db.add(comment)
    db.commit()

print(f"   Comments seeded: 5")

db.close()
