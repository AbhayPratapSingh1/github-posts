# Pending Changes

Small changes to batch into a single commit later.

- [x] Remove back icon (`FaArrowLeft`) from Post page navbar (before logo)
- [x] Remove "Back to top" link from Post page footer
- [x] Remove credentials login (User ID/Password input box) from Login page — keep only GitHub login
- [x] OAuth Sign-In: Return User to Original Page
- [ ] Implement dark mode toggle across the website



- [] {
    Post API Performance Optimization Task
Objective

Optimize the existing Post_handler implementation for database performance and API response time.

The current implementation has several performance problems involving unnecessary COUNT(*) queries, missing indexes, inefficient search queries, unbounded result fetching, and N+1 query patterns in methods other than get_all_posts().

Important: Do NOT rewrite get_all_posts() to combine posts, users, likes, and liked status into a single query. Leave the current get_all_posts() query structure/functionality intact for now.

Focus on the optimizations below while preserving the existing API response format and behavior.

1. Add/verify database indexes

Inspect the existing SQLAlchemy models first.

Do not blindly add duplicate indexes. If an equivalent index or constraint already exists, reuse it.

Post indexes

Ensure the Post model has indexes suitable for:

Post.id
Post.user_id
Post.created_at


created_at is especially important because the API frequently uses:

.order_by(Post.created_at.desc().nullslast())


If id is already the primary key, do not create another index on it.

Example:

created_at = Column(
    DateTime,
    index=True,
)


and:

user_id = Column(
    Integer,
    ForeignKey("users.id"),
    index=True,
)


Use the project's existing SQLAlchemy/model conventions.

2. Add/verify User username index

The code frequently performs:

db.query(User).filter(
    User.username == github_owner
).first()


Ensure User.username has an appropriate index.

If usernames are unique, prefer a unique constraint/index where appropriate.

Do not create duplicate indexes if the existing schema already provides one.

3. Add/verify Like indexes

The Like table is queried heavily using:

Like.post_id
Like.user_id


Ensure appropriate indexes exist.

The code also frequently performs:

.filter(
    Like.post_id == post.id,
    Like.user_id == user.id
)


Therefore, consider a composite unique constraint/index:

(post_id, user_id)


This should also prevent duplicate likes if the application's business logic expects one like per user/post.

For the liked-posts query, the code uses:

.filter(Like.user_id == user.id)
.order_by(
    Like.created_at.desc(),
    Like.id.desc()
)


Consider a composite index such as:

(user_id, created_at, id)


Use the database's appropriate syntax/order.

4. Create database migrations

Do not modify models only and assume the production database will automatically receive indexes.

Inspect the project's migration system.

If the project uses Alembic:

Update the SQLAlchemy models.
Generate or write an appropriate migration.
Verify the generated migration.
Ensure it does not drop unrelated indexes/constraints.
Make sure the migration is reversible where practical.

Do NOT execute destructive migrations automatically.

Do not drop existing indexes unless you can prove they are redundant.

5. Remove unnecessary COUNT queries

Review:

get_all_posts()


The current code performs:

total = db.query(Post).count()


Do not remove the total field if the API contract requires it.

However, determine whether the frontend actually needs an exact total.

If the API can support it without breaking clients, replace exact totals with:

{
    "hasMore": true
}


using limit + 1.

For example:

rows = query.limit(limit + 1).all()

has_more = len(rows) > limit

rows = rows[:limit]


Return:

{
    "posts": result,
    "offset": offset,
    "limit": limit,
    "hasMore": has_more
}


Only make this API response change if you confirm that existing consumers can handle it.

If changing the response would break compatibility, keep total.

6. Optimize get_liked_posts()

The current implementation has an N+1 pattern:

likes = ...
for like in likes:
    post = db.query(Post)...first()
    author = self._resolve_user(...)
    like_count, liked = self._like_info(...)


This can result in many database queries.

Refactor get_liked_posts() so that it retrieves the required data in as few database queries as reasonably possible.

Prefer a SQLAlchemy query using joins/grouping rather than:

for like in likes:
    db.query(...)


The resulting API response must remain compatible with the current response format:

{
    "posts": [...],
    "total": ...
}


Each returned post should continue to include:

id
user_id
title
type
shortDescription
hosted
github
githubOwner
created_at
authorName
authorUsername
likeCount
liked


For the current user, liked should remain true.

Preserve the existing ordering:

Like.created_at.desc()
Like.id.desc()


and the limit behavior.

7. Optimize get_all_users()

The current implementation has an N+1 pattern:

users = db.query(User).order_by(User.id.desc()).all()

for u in users:
    post_count = db.query(Post).filter(
        Post.user_id == u.id
    ).count()


Do not execute one COUNT() query per user.

Replace this with a grouped aggregate/subquery or another efficient SQLAlchemy approach.

Conceptually:

SELECT
    users.*,
    COUNT(posts.id)
FROM users
LEFT JOIN posts
    ON posts.user_id = users.id
GROUP BY users.id
ORDER BY users.id DESC;


Preserve the existing response:

{
    "users": [...],
    "total": ...
}


and:

postCount


for every user.

Users with zero posts must return:

postCount = 0


not null.

8. Fix search_posts() unbounded query

The current implementation contains:

desc_matches = desc_q.all()


This is dangerous because a search could potentially return a very large number of rows.

Never load an unbounded number of posts into Python merely to perform pagination.

Avoid logic that can cause:

500,000 database rows
↓
Python memory
↓
slice to 12 rows


Instead, make the database perform the filtering and pagination.

The query should always have an appropriate:

.limit(...)


before loading potentially large result sets.

9. Improve search_posts() query strategy

Current behavior:

Search title.
If fewer than 3 title matches, search description.
Load description matches.
Combine results in Python.

Review this design and make it database-efficient.

Prefer a database-side query using:

or_(
    Post.title.ilike(...),
    Post.shortDescription.ilike(...)
)


if this preserves the intended behavior.

If title matches must have higher priority than description matches, implement ranking/order in SQL rather than loading all matches into Python.

For example, consider ordering title matches before description-only matches.

Do not change search semantics unnecessarily.

Before modifying behavior, inspect existing tests and API consumers.

10. Optimize LIKE/ILIKE search

The current code uses:

like = f"%{query}%"


and:

Post.title.ilike(like)


A normal B-tree index generally does not efficiently optimize:

%search%


If the project uses PostgreSQL, inspect whether PostgreSQL trigram search (pg_trgm) is appropriate.

Potential approach:

CREATE EXTENSION IF NOT EXISTS pg_trgm;


Then appropriate GIN/GiST trigram indexes can be considered for:

posts.title
posts.shortDescription


Do not introduce PostgreSQL-specific functionality if the application is intended to support multiple database engines without checking the project's database configuration first.

If the project uses PostgreSQL, this optimization is strongly worth considering.

11. Avoid unnecessary columns

Review:

_post_list_columns()


and:

_post_to_dict()


The list query currently selects a limited set of columns, while _post_to_dict() attempts to access many additional attributes:

availableAt
description
dateOfCreation
language
lastPushAt
defaultBranch
stats
updated_at


Do not accidentally cause lazy-loading queries.

For list endpoints, use a dedicated lightweight serializer containing only fields actually selected by the query.

For example:

def _post_list_to_dict(...):
    ...


Keep detailed fields for the single-post endpoint if they are actually needed there.

The goal is to minimize:

database data transferred
ORM object construction
serialization work
JSON response size

Do not remove fields from the public API without checking consumers first.

12. Prevent accidental lazy loading

Inspect SQLAlchemy relationships on:

Post
User
Like


Ensure the optimized endpoints don't accidentally trigger lazy-loaded relationship queries during serialization.

The performance goal is to make the number of database queries predictable.

In particular, watch for code such as:

post.user.name


or:

post.likes


that could trigger additional SQL queries.

If relationships are needed, explicitly choose an appropriate loading strategy such as:

joinedload
selectinload


where appropriate.

Do not blindly add eager loading everywhere.

13. Keep get_post_by_id() efficient

get_post_by_id() only retrieves one post, so N+1 is less significant there.

Still verify:

Post.id


is the primary key/index.

Also verify that _resolve_user() does not cause unnecessary queries when a relationship can safely be used.

Preserve the existing API response.

14. Preserve API compatibility

Do NOT casually change:

field names
response structure
pagination semantics
sorting
search behavior
authentication behavior
like behavior

Existing fields such as:

shortDescription
githubOwner
created_at
authorName
authorUsername
likeCount
liked


must continue working.

If an optimization requires an API response change, clearly identify it and only make the change if the existing frontend/API consumers are compatible.

15. Add query-performance tests

After making changes, add tests where practical.

At minimum test:

get_liked_posts
authenticated user
no liked posts
multiple liked posts
correct ordering
correct like counts
liked == true
get_all_users
users with posts
users without posts
correct post counts
search_posts
title match
description match
pagination
no huge/unbounded result loading
indexes

Verify migrations contain the intended indexes/constraints.

16. Measure database query count

Before and after optimization, measure the number of SQL queries executed by:

get_liked_posts()
get_all_users()
search_posts()
get_post_by_id()


The goal is to eliminate query counts that grow linearly with the number of returned records.

For example, avoid:

12 posts → 12 user queries
12 posts → 12 like queries
12 posts → 12 liked queries


for the methods being optimized.

Use SQLAlchemy query logging or a test query counter if the project already has one.

17. Inspect query plans

For important queries, inspect the database query plan.

For PostgreSQL, use:

EXPLAIN ANALYZE


Check that indexes are actually being used where appropriate.

Pay particular attention to:

posts.created_at
posts.user_id
users.username
likes.post_id
likes.user_id
likes(user_id, created_at, id)


Do not add indexes blindly if the query planner doesn't benefit from them.

18. Avoid overengineering

Do not introduce:

Redis
caching
background workers
Elasticsearch
complex abstractions
repository rewrites
unnecessary ORM changes

unless profiling demonstrates they are actually required.

The first goal is straightforward database/query optimization.

19. Expected result

After implementation, the following should be true:

No unbounded desc_q.all()
No per-user COUNT query in get_all_users()
No per-like post query in get_liked_posts()
No unnecessary COUNT(*) where hasMore is sufficient
Appropriate database indexes exist
Search is database-paginated
Large datasets don't get loaded into Python unnecessarily
List serialization only processes fields actually needed


The code should remain simple and maintainable.

20. Implementation procedure

Before editing:

Inspect the SQLAlchemy models for Post, User, and Like.
Inspect the database migration setup.
Inspect API routes/controllers calling Post_handler.
Inspect frontend/API consumers if available.
Determine the database engine.
Check existing indexes and constraints.
Run the existing test suite.

Then:

Implement database indexes/migrations.
Optimize get_liked_posts().
Optimize get_all_users().
Fix unbounded search loading.
Optimize search_posts().
Add/adjust list serializers.
Add query-performance tests.
Run tests.
Compare query counts and timings before/after.
Important constraint

Do not optimize get_all_posts() by replacing its current multiple-query implementation with a single joined query in this task.

That optimization will be handled separately.

However, you may make safe changes around:

indexes
pagination
unnecessary count queries
serialization
database configuration

as long as they don't alter the current get_all_posts() query strategy or break its API behavior.

Final report

After completing the changes, provide a concise report containing:

Files changed

List every modified file.

Database changes

List every added index, constraint, or migration.

Query improvements

For each optimized method, report approximately:

Before: X queries
After:  Y queries


If exact measurement isn't available, state that clearly.

API changes

Explicitly state whether any API response changed.

Performance

Report before/after timings if measurable.

Remaining bottlenecks

Identify anything that still needs optimization, especially if get_all_posts() remains the dominant source of latency.
}

- [] {
    Database Query Profiling & Optimization
Objective

The application server and database server are hosted separately.

The current post API is slow, so before making further optimizations, inspect the actual database performance.

Do not assume the database is the bottleneck.

Measure:

Database query execution time
Database query count
Query plan
Index usage
Rows scanned vs rows returned
Network/round-trip overhead where measurable

The goal is to determine whether the database query itself is slow or whether the latency is caused by application-to-database network round trips.

1. Identify the database engine

Inspect the project configuration and determine whether the application uses:

PostgreSQL
MySQL/MariaDB
SQLite
Other

Do not assume PostgreSQL.

Use database-specific optimization only after identifying the actual database engine.

2. Capture the SQL generated by SQLAlchemy

Enable SQL logging temporarily in development/staging.

For SQLAlchemy, inspect the generated SQL for:

get_all_posts()
get_liked_posts()
get_all_users()
search_posts()


Do not leave verbose SQL logging enabled in production unless explicitly required.

The important thing is to capture the actual SQL sent to the remote database.

3. Measure query execution time

Measure the actual database query time.

Example instrumentation:

import time

start = time.perf_counter()

rows = query.all()

elapsed = time.perf_counter() - start

print(f"DB query took {elapsed * 1000:.2f} ms")


Prefer the project's existing logging system instead of print() if one exists.

Record:

query
execution time
number of rows returned

4. Measure application-to-database latency

Because the database is on a different host, determine whether network round trips are contributing significantly to the 5-second delay.

For example:

Application
    |
    | network round trip
    v
Database
    |
    | execute query
    v
Database result
    |
    | network round trip
    v
Application


A query that takes 20 ms inside PostgreSQL can still become expensive if the application performs 100 separate queries against a remote database.

Therefore, pay particular attention to query count.

Example:

1 query × 20 ms = ~20 ms DB work
100 queries × 20 ms = ~2 seconds DB/network overhead


Actual latency will vary, but the principle is important.

5. Inspect the final get_all_posts query

For the optimized get_all_posts() implementation, capture the exact SQL generated by SQLAlchemy.

Do not optimize based only on the Python code.

The SQL is what the database actually executes.

The query should ideally retrieve:

posts
author
like count
current-user liked status


without issuing separate queries for each post.

6. PostgreSQL: use EXPLAIN ANALYZE

If the database is PostgreSQL, run the generated query using:

EXPLAIN (ANALYZE, BUFFERS)
<QUERY>;


Example:

EXPLAIN (ANALYZE, BUFFERS)
SELECT ...
FROM posts
LEFT JOIN ...
ORDER BY posts.created_at DESC
LIMIT 12;


Inspect:

Execution Time
Planning Time
Seq Scan
Index Scan
Index Only Scan
Bitmap Index Scan
Rows Removed by Filter
Sort
Hash Join
Nested Loop
Buffers
actual rows
estimated rows
7. MySQL/MariaDB: use EXPLAIN ANALYZE

If using MySQL 8+ or a compatible MariaDB version, use the appropriate:

EXPLAIN ANALYZE
SELECT ...;


Inspect:

table access type
possible keys
chosen key
rows examined
rows returned
sorting
temporary tables
join strategy
actual execution time

Do not blindly translate PostgreSQL-specific recommendations to MySQL.

8. Check indexes for get_all_posts

The main feed query uses:

.order_by(Post.created_at.desc().nullslast())


Verify that the database has an appropriate index on:

posts.created_at


Also verify:

posts.id
posts.user_id
likes.post_id
likes.user_id
users.id
users.username


If the query uses:

(user_id, created_at)


or:

(post_id, user_id)


consider whether a composite index is more appropriate.

Do not create duplicate indexes.

9. Check the Like aggregation

The optimized query may contain an aggregation similar to:

SELECT
    like.post_id,
    COUNT(like.id),
    ...
FROM likes
GROUP BY like.post_id


Inspect its query plan.

If the database scans the entire likes table for every request, determine whether an index or a different query structure would improve it.

For example, verify:

likes.post_id
likes.user_id


are indexed.

10. Consider a better liked-status strategy

The query needs to determine:

liked = true/false


for the current user.

Do not retrieve every Like row into Python.

Prefer a database-side existence check or aggregation.

For example, conceptually:

CASE
    WHEN EXISTS (
        SELECT 1
        FROM likes
        WHERE likes.post_id = posts.id
          AND likes.user_id = :user_id
    )
    THEN true
    ELSE false
END


Compare the query plan and performance against the current aggregation approach.

Use whichever is measurably faster for the actual database and dataset.

11. Avoid scanning all likes unnecessarily

If the application has millions of likes, a query that aggregates the entire likes table for every request may itself become expensive.

Compare these approaches:

Approach A

Aggregate all likes:

GROUP BY post_id

Approach B

Calculate counts only for the posts in the current page.

Conceptually:

Fetch 12 post IDs
        ↓
Calculate likes only for those 12 posts
        ↓
Join results


The database should not perform unnecessary work for posts that aren't being returned.

Use EXPLAIN ANALYZE to determine which approach is faster for the actual data size.

12. Check the created_at pagination

The current query uses:

.offset(offset)
.limit(limit)


Offset pagination can become increasingly expensive for large offsets.

For example:

OFFSET 0       → cheap
OFFSET 1,000   → potentially more work
OFFSET 100,000 → potentially expensive


If the feed becomes large, consider cursor/keyset pagination using:

created_at
id


For example:

WHERE
    created_at < :last_created_at
OR (
    created_at = :last_created_at
    AND id < :last_id
)
ORDER BY created_at DESC, id DESC
LIMIT 12


Do not change the public pagination API without checking frontend compatibility.

13. Add a deterministic ordering

The current ordering is:

Post.created_at.desc().nullslast()


If multiple posts have the same created_at, pagination can potentially become unstable.

Consider:

.order_by(
    Post.created_at.desc().nullslast(),
    Post.id.desc(),
)


This also makes keyset pagination possible later.

Only change this if it is compatible with existing expected ordering.

14. Check connection pooling

Because the DB is on another host, inspect SQLAlchemy connection pooling.

Check:

pool_size
max_overflow
pool_timeout
pool_recycle
pool_pre_ping


Do not blindly increase the pool.

The goal is to avoid:

Request
  ↓
open TCP connection
  ↓
database authentication/handshake
  ↓
query
  ↓
close connection


for every request.

The application should reuse database connections through SQLAlchemy's pool.

Verify that the pool is configured appropriately for the number of application workers.

15. Check connection acquisition time

Measure separately:

connection acquisition
query execution
result transfer
Python serialization


A useful breakdown is:

Request
│
├── DB connection acquisition: XX ms
├── SQL execution: XX ms
├── Result transfer: XX ms
├── Python processing: XX ms
└── JSON serialization: XX ms


Do not assume the SQL execution time represents the entire DB-related latency.

16. Check result size

The query should only return the fields required by the endpoint.

Avoid selecting large fields such as:

description
stats
large JSON blobs
large text fields


if the feed doesn't need them.

Large result payloads are particularly relevant when the DB is on another host because the result must travel over the network.

17. Search query profiling

For:

search_posts()


capture the generated SQL and run:

EXPLAIN ANALYZE


against representative searches.

Test:

common search
rare search
no results
short query
long query


Pay particular attention to:

Post.title.ilike("%query%")
Post.shortDescription.ilike("%query%")


If PostgreSQL is being used, evaluate pg_trgm.

Potential indexes:

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS ix_posts_title_trgm
ON posts
USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_posts_short_description_trgm
ON posts
USING gin (shortDescription gin_trgm_ops);


Only use this if the database is PostgreSQL and the actual query plan demonstrates that trigram indexing is appropriate.

18. Do not use SELECT COUNT(*) blindly

For:

total = db.query(Post).count()


measure the actual execution time.

If the frontend only needs pagination information, prefer:

limit + 1


and:

hasMore


instead of an exact count.

If exact totals are required, investigate whether:

the count is actually expensive
the database can optimize it
a cached count is appropriate
the API actually needs it

Do not add caching unless profiling demonstrates that it is necessary.

19. Database statistics

Check whether the database statistics are up to date.

For PostgreSQL, verify:

ANALYZE posts;
ANALYZE users;
ANALYZE likes;


Do not run maintenance commands blindly on production without following the project's operational procedures.

An outdated query planner can make poor index/join decisions.

20. Test with realistic data

Do not benchmark with:

10 posts
20 likes
5 users


if production has:

500,000 posts
10,000,000 likes
100,000 users


Use representative data volumes.

Test:

12 posts
100 posts
1,000 posts
100,000 posts
1,000,000 posts


where practical.

For likes, test realistic production-like volumes.

21. Identify whether the bottleneck is DB or network

Produce a table like:

Operation	Time
DB connection acquisition	XX ms
DB execution	XX ms
DB result transfer	XX ms
Python processing	XX ms
JSON serialization	XX ms
Total endpoint	XX ms

If:

DB execution = 30 ms
Endpoint = 2,000 ms


then the SQL query is not the primary bottleneck.

If:

DB execution = 1,800 ms
Endpoint = 2,000 ms


then optimize the SQL/database.

If:

30 SQL queries × ~60 ms network latency


then reducing query count is likely much more important than micro-optimizing the SQL.

22. Query-count requirement

For the optimized get_all_posts():

Target:

1 database query


or, if exact total is intentionally separated:

2 database queries


Do not allow query count to grow with:

number of posts


For example, avoid:

12 posts → 25 queries


or:

50 posts → 101 queries

23. Security requirement

When collecting SQL for EXPLAIN ANALYZE:

Do not expose production credentials.

Do not commit:

DATABASE_URL
passwords
tokens
connection strings
private hostnames


into source control.

Use parameterized SQL where possible.

Never build production queries by string-concatenating user input.

24. Deliverable

After profiling, provide a report:

Database
Database engine:
Database version:
Application → DB latency:

get_all_posts()
Before query count:
After query count:
Before DB time:
After DB time:

Query plan

Report the important parts of:

EXPLAIN ANALYZE


including:

Execution Time
Planning Time
Index usage
Sequential scans
Rows scanned
Rows returned
Sorts
Joins

Indexes

List:

Existing indexes
New indexes
Indexes that were unnecessary

Network

Report whether remote DB latency is contributing significantly.

Remaining bottlenecks

Identify the largest remaining source of latency.

Important

Do not blindly optimize based on assumptions.

First:

Measure
↓
Capture SQL
↓
EXPLAIN ANALYZE
↓
Identify bottleneck
↓
Change query/index
↓
EXPLAIN ANALYZE again
↓
Benchmark again


The goal is measurable improvement, not simply reducing the number of lines of Python code.
}


- [] {
    add skill

    API Performance Regression Skill
Purpose

This skill is responsible for detecting API performance regressions after code changes.

Whenever backend/API/database code is changed, determine which APIs are directly or indirectly affected and run the relevant k6 performance tests.

Compare the new results against historical/past average performance.

If an API becomes significantly slower, do not simply report the regression.

Investigate the likely cause and provide actionable findings.

Core Workflow

After any backend/API/database change:

Code changes
    ↓
Identify changed files
    ↓
Identify affected APIs
    ↓
Find matching k6 test cases
    ↓
Run k6 tests
    ↓
Collect latency/error/throughput metrics
    ↓
Compare against historical averages
    ↓
Detect regressions
    ↓
If regression exists:
    ↓
Investigate possible causes
    ↓
Check SQL/query count/database performance
    ↓
Check application processing time
    ↓
Report findings

1. Detect changed files

First inspect the current git changes.

Use the appropriate git commands to determine:

git status
git diff
git diff --name-only


If the working tree contains staged changes, inspect those as well.

Determine:

modified files
added files
deleted files
renamed files

Do not assume that only files containing /api/ are relevant.

2. Identify affected APIs

Determine which APIs are directly or indirectly affected by the changes.

Examples:

Changed:
app/services/post_handler.py

Potentially affected:
GET /posts
GET /posts/{id}
GET /posts/liked
GET /posts/search


If a model changes:

app/models/post.py


also identify APIs that query that model.

If a shared utility/database layer changes:

app/database.py
app/repositories/*
app/services/*


consider all APIs using that component.

3. Search API routes

Inspect the application's route/controller definitions.

Depending on the framework, search for:

@app.get
@app.post
@app.put
@app.patch
@app.delete
router.get
router.post
router.put
router.patch
router.delete


Also inspect project-specific routing conventions.

Build a mapping:

Changed component
        ↓
Service/controller
        ↓
Route
        ↓
k6 test


Example:

Post_handler.get_all_posts()
        ↓
GET /posts
        ↓
tests/k6/posts.js

4. Find k6 test cases

Search the repository for existing k6 tests.

Look for:

*.js
*.ts
k6
load-test
performance
perf
stress
benchmark


Also search for:

http.get(
http.post(
http.put(
http.patch(
http.del(


and API paths.

For example:

GET /posts


should map to a k6 test that calls:

http.get(...)


Do not create duplicate k6 tests if an existing test already covers the API.

5. Run only affected tests

Do not automatically run every performance test for every small change.

Determine the minimum affected API set.

For example:

Changed:
Post_handler.get_all_posts()

Run:
GET /posts

Potentially run:
GET /posts/search
GET /posts/liked

Do not automatically run:
GET /users
POST /auth/login


unless dependency analysis shows that they are affected.

6. Include indirectly affected APIs

If a shared component is changed, include all relevant consumers.

Example:

Changed:
database query helper

Used by:
posts
users
comments
likes


Then run k6 tests for all affected API groups.

When uncertain, prefer running the broader relevant test set rather than missing a regression.

7. Establish the historical baseline

Before declaring a regression, find the historical performance data.

Look for:

performance/
perf-results/
k6-results/
benchmarks/
metrics/
reports/


Also inspect CI artifacts or project-specific performance storage if available.

Look for previous k6 results containing metrics such as:

http_req_duration
http_req_failed
http_reqs
iterations
vus


Prefer a historical average over a single previous run.

8. Historical average

For each affected API, calculate or retrieve the historical average for:

p50
p90
p95
p99
average
error rate
throughput


Example:

GET /posts

Historical:
p50 = 80 ms
p95 = 180 ms
p99 = 320 ms
error rate = 0.1%


Use the project's existing baseline if one exists.

If no historical data exists:

Baseline unavailable


Do not invent one.

In that situation, still run the test and record the result as the new baseline if the project's process permits it.

9. Run k6

Use the project's existing k6 command/configuration.

Do not invent load parameters if the repository already defines them.

For example, if the repository uses:

k6 run tests/k6/posts.js


use that.

If it has environment-specific configuration:

k6 run \
  -e BASE_URL="$BASE_URL" \
  tests/k6/posts.js


follow the existing project convention.

Do not run a destructive load test against production unless the repository explicitly identifies the target as safe for load testing.

10. Capture k6 metrics

For every affected API, capture at least:

http_req_duration
http_req_failed
http_reqs
iterations


Prefer:

p50
p90
p95
p99
avg
min
max


when available.

If the k6 script defines custom metrics, capture those too.

11. Compare against historical average

For each metric calculate:

absolute change
percentage change


Formula:

percentage_change =
    ((new_value - historical_value) / historical_value) * 100


Example:

Historical p95: 180 ms
Current p95:    250 ms

Regression:
((250 - 180) / 180) × 100
= 38.9%


Report:

p95 increased by 38.9%

12. Regression thresholds

Use these default thresholds unless the project already defines stricter thresholds.

Warning

Latency increases by:

> 10%

Regression

Latency increases by:

> 20%

Severe regression

Latency increases by:

> 50%


For error rate:

Any meaningful increase in HTTP failures should be investigated.


For example:

0.1% → 2%


is a regression even if latency improved.

Do not treat a small percentage difference as meaningful when the baseline sample size is too small.

13. Prioritize p95/p99

Do not judge performance only by average latency.

For APIs, prioritize:

1. Error rate
2. p95
3. p99
4. p90
5. p50
6. average


Example:

Average:
100ms → 102ms

p95:
180ms → 280ms


This should still be considered a significant regression.

14. Account for test variance

k6 performance results naturally vary.

Do not immediately declare a regression from a single noisy run.

If:

historical p95 = 200ms
current p95 = 215ms


do not report a serious regression.

If possible, run the affected test multiple times when a result is close to the threshold.

For example:

Run 1: 240ms
Run 2: 225ms
Run 3: 235ms


Then compare the representative result against the historical baseline.

Use the repository's established performance-test methodology if one exists.

15. If regression is detected, investigate automatically

When an API crosses the regression threshold:

STOP treating the task as complete.


Investigate likely causes.

Check:

database queries
query count
query execution time
database indexes
network latency
application processing
serialization
external API calls
connection pooling
locks/contention
CPU
memory

16. Check database query count

For APIs using SQLAlchemy, determine whether the change introduced additional queries.

Look for:

N+1 queries
lazy loading
relationship queries
COUNT queries
duplicate queries
queries inside loops


Example:

Before:
3 SQL queries

After:
39 SQL queries


This is a strong regression signal.

For a remote database, query count is particularly important.

17. Check SQL execution time

If query count increased or the API became slower, inspect SQL query performance.

Capture the generated SQL.

For PostgreSQL, use:

EXPLAIN (ANALYZE, BUFFERS)
<query>;


For MySQL/MariaDB, use the appropriate:

EXPLAIN ANALYZE
<query>;


Check:

execution time
index usage
sequential scans
rows scanned
rows returned
sorts
joins
temporary tables

18. Check database indexes

If a query became slower, check whether the relevant indexes exist.

Look for fields used in:

WHERE
JOIN
ORDER BY
GROUP BY


For example:

posts.created_at
posts.user_id
likes.post_id
likes.user_id
users.username


Do not blindly create indexes.

Use the query plan to determine whether an index is actually useful.

19. Check remote database latency

Because the application and database may be on separate hosts, determine:

network round-trip time
database connection acquisition time
SQL execution time
result transfer time


Example:

Connection acquisition: 40ms
SQL execution:          30ms
Result transfer:        25ms
Total DB interaction:   95ms


If the API makes 30 queries:

30 × network/database overhead


can become a significant contributor.

20. Check application-side processing

If database performance is normal, inspect:

Python loops
serialization
JSON encoding
data transformation
CPU-heavy processing
large response construction


Example:

DB:          50ms
Python:     800ms
Serialization: 400ms


The database is not the bottleneck.

Do not modify SQL unnecessarily.

21. Check external API calls

Inspect whether the affected endpoint calls:

GitHub
third-party APIs
external services
HTTP services


Measure each external call.

A regression may come from an external dependency rather than the changed code.

22. Check connection pooling

For APIs using a remote DB, inspect:

pool_size
max_overflow
pool_timeout
pool_recycle
pool_pre_ping


Look for:

connection exhaustion
connection wait time
too many connections
new connection creation


Do not blindly increase the pool size.

Take into account:

application workers × pool size


and the database's maximum connection limit.

23. Compare before/after query count

For every affected API, produce:

API: GET /posts

SQL queries:
Before: 3
After:  1

k6 p95:
Before: 180ms
After:  115ms

Result:
Improved by 36.1%


If performance got worse:

API: GET /posts

SQL queries:
Before: 3
After:  15

k6 p95:
Before: 180ms
After:  310ms

Result:
REGRESSION: +72.2%

Likely cause:
Additional database round trips.

24. Check all affected APIs

Do not only test the function that was directly changed.

For example, if:

Post_handler


was modified, determine all affected routes:

GET /posts
GET /posts/{id}
GET /posts/search
GET /posts/liked


Run the relevant k6 tests for all affected endpoints.

Report each independently.

25. Performance report

After testing, generate:

## Performance Summary

| API | Baseline p95 | Current p95 | Change | Status |
|---|---:|---:|---:|---|
| GET /posts | 180ms | 120ms | -33% | PASS |
| GET /posts/search | 220ms | 280ms | +27% | REGRESSION |
| GET /posts/liked | 190ms | 195ms | +3% | PASS |


Then:

## Regressions

List every API that crossed the threshold.

For each:

- what changed
- performance impact
- query count change
- likely cause
- evidence
- recommended fix


Then:

## Improvements

List APIs that became faster.

Then:

## Unchanged

List APIs with no meaningful performance change.

26. Do not hide regressions

If an API becomes slower, clearly report:

⚠ PERFORMANCE REGRESSION


Do not claim success simply because:

tests pass
HTTP status codes are correct
functionality works

Functional correctness and performance correctness are separate requirements.

27. Do not automatically revert code

When a regression is detected:

Investigate it.
Identify the likely cause.
Determine whether the cause is related to the current change.
Suggest or implement a fix if the task permits.
Re-run the k6 test.
Compare again.

Do not blindly revert changes.

28. Re-test after optimization

If a performance problem is fixed:

Run k6 again
    ↓
Compare against baseline
    ↓
Confirm regression disappeared


Do not report an optimization as successful without measuring it.

29. Save successful performance results

If the project has a performance-results directory or CI artifact mechanism, store the new result.

The result should contain at least:

timestamp
git commit
API
test name
test configuration
p50
p90
p95
p99
average
error rate
request count


This becomes the historical baseline for future changes.

Do not commit huge raw k6 output files unless the repository's existing process expects that.

30. CI integration

If this skill is running inside CI:

Code change
    ↓
Identify affected APIs
    ↓
Run relevant k6 tests
    ↓
Compare against baseline
    ↓
Regression?
   /       \
 No        Yes
 |          |
PASS       FAIL/WARN


A severe regression should cause the performance check to fail.

Recommended defaults:

>20% p95 regression → fail/warn depending on project policy
>50% p95 regression → fail
Any significant error-rate regression → fail


Respect existing CI conventions if they differ.

31. Safety

Do not run high-load k6 tests against production unless explicitly authorized by the project's configuration/process.

Before running k6, determine:

BASE_URL
environment
load level
duration
vus


If the target is production and there is no explicit authorization/configuration for load testing, stop and report that the test cannot safely be executed.

Prefer:

local
development
staging
performance environment

32. Final skill behavior

The skill should behave like this:

1. Inspect git changes.

2. Identify changed backend components.

3. Determine all directly and indirectly affected APIs.

4. Find existing k6 tests for those APIs.

5. Find historical performance baselines.

6. Run k6 for affected APIs.

7. Collect:
   - p50
   - p90
   - p95
   - p99
   - average
   - error rate
   - throughput

8. Compare with historical averages.

9. If performance is acceptable:
      report PASS.

10. If performance regresses:
      investigate.

11. Investigate:
      - SQL query count
      - N+1 queries
      - SQL execution time
      - indexes
      - query plans
      - DB network latency
      - connection pooling
      - Python processing
      - serialization
      - external APIs

12. If a fix is made:
      run k6 again.

13. Report before/after results.

14. Never hide performance regressions.

Definition of Done

This skill is complete only when:

All affected APIs have been identified.
Existing k6 tests have been discovered.
Relevant k6 tests have been executed.
Historical baselines have been compared.
p95/p99 performance has been evaluated.
Error rates have been checked.
Database query counts have been considered.
Regressions have been investigated.
Any optimization has been re-tested.
The final report clearly identifies PASS, WARNING, or REGRESSION for every affected API.

The skill should optimize for measurable performance, not assumptions.

The most important rule:

Every backend performance-affecting change must be validated with k6 against the historical baseline before it is considered complete.

}




- [] {
add this skill also with previous one


Performance Profiling and Flame Graph Extension
Objective

When an affected API shows a significant performance regression or unexpectedly high latency, generate profiling data that can be visualized as a flame graph or equivalent performance visualization.

The goal is to identify exactly where request time is being spent.

Do not rely only on k6 latency metrics.

Use:

k6
  ↓
detect slow API
  ↓
application profiler
  ↓
database query profiling
  ↓
flame graph
  ↓
identify bottleneck

1. When to generate a flame graph

Do not generate flame graphs for every successful test by default.

Generate profiling data when:

p95 increases by more than 20%
p99 increases by more than 20%
average latency increases significantly
an API exceeds its expected latency budget
error rate increases unexpectedly
query count increases unexpectedly
database time does not explain the total request time
a developer explicitly requests profiling

For severe regressions:

p95 > 50% slower


profiling should be strongly preferred.

2. Profile the application separately from k6

k6 is primarily responsible for generating load and measuring API behavior.

It should not be treated as the primary Python CPU profiler.

Use:

k6
    ↓
load generation
    ↓
Python application profiler
    ↓
CPU / wall-time profile
    ↓
flame graph


The profiler should run against the application while k6 generates representative traffic.

3. Determine the Python profiling tool

Inspect the project first.

If the project already uses a profiler, use it.

Possible tools include:

py-spy
cProfile
pyinstrument
Scalene
Austin


Prefer py-spy or the project's existing production-compatible profiler for low-overhead sampling when appropriate.

Do not install a new profiling system without checking the existing project setup.

4. py-spy flame graph

If py-spy is available, a typical workflow is:

py-spy record \
  --pid <APPLICATION_PID> \
  --duration 30 \
  --output profile.svg


This should produce:

profile.svg


which can be opened in a browser.

Use the appropriate application process/container PID.

Do not assume the PID.

Find it using the project's runtime/container tooling.

5. Profile only the affected API

Do not generate a profile while unrelated traffic is hitting the application if it can be avoided.

Preferred workflow:

Start application
        ↓
Start profiler
        ↓
Run k6 against affected API
        ↓
Stop profiler
        ↓
Generate flame graph


Example:

k6
  ↓
GET /posts
  ↓
GET /posts
  ↓
GET /posts
  ↓
profiler captures execution


Keep the profiling test representative of the normal API load.

6. CPU flame graph

Generate a CPU flame graph when the suspicion is:

Python computation
loops
serialization
data transformation
expensive functions
CPU-heavy business logic

Look for wide sections such as:

JSON serialization
SQLAlchemy object processing
_post_to_dict
loops
sorting
data transformation


The width of a function represents how much sampled execution time is associated with it.

Focus on the widest unexpected blocks.

7. Wall-clock profiling

CPU profiling alone can miss time spent waiting for:

database
network
external APIs
locks
I/O


When possible, use wall-clock profiling as well.

For example:

CPU profile:
Python = 30ms

Wall profile:
DB/network wait = 800ms


This indicates that optimizing Python code will not solve the actual problem.

8. Database profiling

Application flame graphs do not replace database query plans.

For slow database operations, collect:

SQL query
query count
query duration
EXPLAIN ANALYZE


For PostgreSQL:

EXPLAIN (ANALYZE, BUFFERS)
<query>;


For MySQL/MariaDB:

EXPLAIN ANALYZE
<query>;


Compare the database execution time with the API latency.

9. Build a request timing breakdown

For every problematic API, try to produce:

GET /posts

Total:                    850ms

├── authentication:        15ms
├── DB connection:         20ms
├── SQL execution:        180ms
├── result transfer:       30ms
├── Python processing:     90ms
├── serialization:         40ms
└── remaining/network:    475ms


If exact values cannot be measured, clearly mark them as unavailable.

Never invent timings.

10. Database query flame graph

If the project has database instrumentation, generate a query-time visualization.

Example:

GET /posts
│
├── SELECT posts                         20ms
├── SELECT users × 12                   180ms
├── COUNT likes × 12                    240ms
├── liked check × 12                    180ms
└── serialization                        30ms


After optimization:

GET /posts
│
├── SELECT posts + users + likes         45ms
└── serialization                        30ms


This is particularly important when the database is hosted remotely.

11. Query count visualization

In addition to flame graphs, produce a simple query-count comparison:

Before:

Posts query       █
User queries      ████████████
Like count        ████████████
Liked checks      ████████████

Total: 37 queries


After:

Combined query   █

Total: 1 query


This makes N+1 problems immediately visible.

12. k6 results visualization

For every performance run, collect:

p50
p90
p95
p99
average
error rate
requests/sec


Generate a comparison visualization where practical.

Example:

                 Before       Current

p50              80ms         75ms
p90             130ms        145ms
p95             180ms        260ms   ← REGRESSION
p99             320ms        510ms   ← REGRESSION

Error rate       0.1%         0.1%

13. Correlate k6 and flame graph results

Do not analyze these independently.

Example:

k6:

p95
180ms → 310ms


Then:

Flame graph:

DB query
20ms → 140ms


Conclusion:

Likely database regression.


Another example:

k6:

p95
180ms → 300ms


but:

DB
40ms → 45ms


and:

Python serialization
20ms → 180ms


Conclusion:

Likely application-side serialization regression.

14. Identify the widest unexpected block

When inspecting the flame graph, identify:

largest unexpected block


Do not optimize functions merely because they appear in the graph.

A function being wide can simply mean it is legitimately part of the request.

Look for:

unexpected repeated calls
loops
database operations
serialization
expensive transformations
external calls
lock contention
connection acquisition
15. Detect N+1 patterns

If the flame/profile indicates repeated calls such as:

resolve_user × N
like_count × N
liked_check × N


flag:

N+1 QUERY REGRESSION


Investigate whether those calls can be replaced with:

joins
subqueries
aggregation
eager loading
batch queries

Do not blindly use eager loading.

Choose the strategy based on the actual query and data shape.

16. Compare before/after flame graphs

When an optimization is made, generate a second profile.

Store:

before-profile.svg
after-profile.svg


when practical.

Compare:

before:
DB queries       70%
Python           20%
serialization    10%

after:
DB queries       20%
Python           50%
serialization    30%


The bottleneck may move after optimization.

Continue profiling only if necessary.

17. Profiling artifacts

Store profiling artifacts outside source control unless the repository explicitly tracks them.

Possible output:

performance/
├── k6/
│   ├── posts-before.json
│   └── posts-after.json
│
├── profiles/
│   ├── posts-before.svg
│   └── posts-after.svg
│
└── reports/
    └── posts-performance.md


Do not commit large binary profiling artifacts unless the project explicitly requires them.

18. Final performance report

When a regression occurs, produce:

## API

GET /posts

## k6

Baseline p95: 180ms
Current p95:  310ms
Regression:   +72.2%

## Query count

Baseline: 3
Current:  27

## Flame graph finding

Largest unexpected block:

_like_info()
    └── COUNT(Like)
        × 12

## Database

Query execution:
XXX ms

EXPLAIN ANALYZE:
<summary>

## Root cause

N+1 database queries introduced by ...

## Recommended fix

Replace per-post queries with ...

## Verification

After optimization:

p95: XXX ms
query count: X
regression: resolved

19. Important rule

Do not generate a flame graph simply to have a visualization.

The purpose is:

Performance regression
        ↓
Find where time is spent
        ↓
Identify root cause
        ↓
Fix
        ↓
Run k6 again
        ↓
Verify improvement


A flame graph is evidence for optimization, not the optimization itself.

Definition of Done

For a significant performance regression:

k6 identifies the affected API.
Historical baseline is compared.
Query count is measured.
Database timing is measured.
Application profiling is performed where appropriate.
Flame graph is generated when useful.
The widest/most significant bottleneck is identified.
A likely root cause is documented.
A fix is implemented where requested.
k6 is run again.
Before/after performance is reported.

The final goal is to answer:

"Why did this API become slow, exactly where is the time going, and did the fix actually make it faster?"

}



- [] {
    TODO: Optimize indexes for the /api/posts/{id} endpoint
Goal

Optimize the database queries used by the post-detail API:

GET /api/posts/{id}


The endpoint fetches:

A single Post
The post's author (User)
Like count for the post
Whether the current user liked the post
The latest comments for the post

The goal is to make these queries as fast as possible by ensuring the appropriate database indexes exist.

Instructions

Before making changes:

Inspect the SQLAlchemy models for:

Post
User
Like
Comment

Inspect the existing database migration files.

Determine:

Which columns are primary keys
Which columns are foreign keys
Which indexes already exist
Which indexes are already created by SQLAlchemy/migrations
Which database engine is being used (PostgreSQL, MySQL, SQLite, etc.)

Do not create duplicate indexes.

Required indexes
1. Like lookup by post

The optimized post query needs to efficiently calculate:

WHERE likes.post_id = ?


Ensure an index exists on:

likes.post_id


If appropriate for the existing schema/database, prefer a composite index:

(post_id, user_id)


because the API also checks:

WHERE likes.post_id = ?
AND likes.user_id = ?


Use the index strategy that best fits the existing application and database.

2. Comment lookup

The API fetches the latest comments for a post:

WHERE comments.post_id = ?
ORDER BY comments.created_at DESC
LIMIT 6


Create an index optimized for this query:

comments(post_id, created_at DESC)


If the database does not support specifying DESC in indexes, create the equivalent compatible index:

comments(post_id, created_at)

3. Foreign-key indexes

Check whether the following columns already have indexes:

comments.post_id
comments.user_id
likes.post_id
likes.user_id
posts.user_id


Do not blindly create all of them.

Only add indexes that are useful and missing based on the existing schema and query patterns.

Migration requirements

Create a proper database migration using the project's existing migration system.

For example, if the project uses Alembic:

Create a new Alembic migration.
Add the required indexes in upgrade().
Remove those indexes in downgrade().
Use clear, descriptive index names.

Suggested names:

ix_likes_post_user
ix_comments_post_created_at


Adjust the names if the project already follows a different naming convention.

Important

Do NOT modify the API response format.

Do NOT change unrelated models or queries.

Do NOT remove existing indexes without verifying that they are redundant.

Do NOT create duplicate indexes.

Do NOT change application behavior.

Validation

After creating the migration:

Run the migration against the development database.
Verify that the indexes exist.
Run the application's existing tests.
If possible, run EXPLAIN / EXPLAIN ANALYZE for the important queries and verify that the new indexes can be used.

The important queries are approximately:

SELECT ...
FROM likes
WHERE likes.post_id = ?;


and:

SELECT ...
FROM comments
WHERE comments.post_id = ?
ORDER BY comments.created_at DESC
LIMIT 6;

Expected result

The final changes should include:

Appropriate indexes for the post/like lookup.
An optimized index for latest comments by post.
A proper migration.
No duplicate or unnecessary indexes.
No changes to API behavior.

At the end, report:

Which indexes already existed.
Which indexes were added.
The migration file created.
Any indexes that were intentionally not added and why.
How the changes were validated.
}