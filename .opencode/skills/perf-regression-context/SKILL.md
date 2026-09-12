# Skill: perf-regression-context

## Purpose

This skill detects API performance regressions after code changes. When backend, API, or database code is changed, it runs performance tests and compares results against historical baselines.

## Triggers

Use this skill when:
- Backend code is modified
- Database queries are changed
- API endpoints are updated
- Performance concerns are raised
- Before/after code deployments

## Core Workflow

```
Code changes
    ↓
Identify changed files
    ↓
Identify affected APIs
    ↓
Run performance tests
    ↓
Compare against baseline
    ↓
Detect regressions
    ↓
If regression:
    ↓
Investigate causes
    ↓
Report findings
```

## Files

| File | Purpose |
|------|---------|
| `backend-fastapi/loadtests/perf_regression.py` | Main regression detection script |
| `backend-fastapi/loadtests/locustfile.py` | Locust load test definitions |
| `backend-fastapi/loadtests/quick_load.py` | Quick CLI load test |
| `backend-fastapi/loadtests/perf_baseline.json` | Historical performance baseline |

## Usage

### Run Performance Regression Check

```bash
cd backend-fastapi
python loadtests/perf_regression.py --host http://127.0.0.1:7180
```

### Save Results as New Baseline

```bash
cd backend-fastapi
python loadtests/perf_regression.py --host http://127.0.0.1:7180 --save-baseline
```

### Run Quick Load Test

```bash
cd backend-fastapi
python loadtests/quick_load.py --host http://127.0.0.1:7180 --users 10 --duration 30
```

### Run Locust with Web UI

```bash
cd backend-fastapi
locust -f loadtests/locustfile.py --host http://127.0.0.1:7180
```

## Regression Thresholds

| Threshold | Percentage | Action |
|-----------|------------|--------|
| Warning | >10% | Monitor closely |
| Regression | >20% | Investigation recommended |
| Severe | >50% | Immediate action required |

## Metrics Tracked

- **P95 Latency**: 95th percentile response time
- **P99 Latency**: 99th percentile response time
- **Median Latency**: 50th percentile response time
- **Requests/sec**: Throughput
- **Error Rate**: Failed requests percentage

## API Endpoints Tested

| Endpoint | Method | Auth | Weight |
|----------|--------|------|--------|
| `/api/posts` | GET | No | High |
| `/api/posts/{id}` | GET | No | Medium |
| `/api/posts` | POST | Yes | Low |
| `/api/auth/me` | GET | Yes | Low |
| `/api/github/info` | GET | No | Low |
| `/` | GET | No | Health |

## Interpreting Results

### No Regressions
```
✅ NO REGRESSIONS DETECTED
```
All endpoints within acceptable performance bounds.

### Warnings
```
⚠️  WARNINGS - Monitor closely
```
Some endpoints show performance degradation but not critical.

### Regressions
```
❌ REGRESSION DETECTED - Investigation recommended
```
Significant performance degradation detected. Investigate:
- Database query changes
- N+1 query patterns
- Missing indexes
- Connection pooling issues

### Severe Regressions
```
❌ SEVERE REGRESSION DETECTED - Action required!
```
Critical performance degradation. Immediate investigation required.

## Investigation Steps

When regression is detected:

1. **Check Database Queries**
   ```bash
   cd backend-fastapi
   python scripts/profile_queries.py
   ```

2. **Review Recent Changes**
   - Check git diff for database-related changes
   - Review query modifications
   - Check index changes

3. **Analyze Query Plans**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   <query>;
   ```

4. **Check Connection Pool**
   - Review SQLAlchemy pool settings
   - Monitor connection acquisition time

5. **Measure Query Count**
   - Check for N+1 patterns
   - Verify eager loading

## Best Practices

1. **Establish Baseline First**
   ```bash
   python loadtests/perf_regression.py --save-baseline
   ```

2. **Run Before/After Changes**
   - Run before making changes
   - Run after making changes
   - Compare results

3. **Use Representative Data**
   - Test with realistic data volumes
   - Don't test with empty database

4. **Multiple Runs**
   - Run multiple times for accuracy
   - Account for variance

5. **Document Findings**
   - Save regression reports
   - Document optimizations

## Integration with CI/CD

Add to CI pipeline:

```yaml
- name: Performance Regression Check
  run: |
    cd backend-fastapi
    python loadtests/perf_regression.py --host ${{ env.BACKEND_URL }}
  if: github.event_name == 'pull_request'
```

## Troubleshooting

### Locust Not Installed
```bash
pip install locust
```

### Connection Refused
- Ensure backend server is running
- Check host URL is correct

### High Variance
- Increase test duration
- Increase number of users
- Run multiple iterations

### CSV Not Generated
- Check Locust version
- Verify write permissions
