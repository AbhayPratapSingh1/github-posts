#!/bin/bash

# =============================================================================
# benchmark.sh - API Performance Testing Script (k6)
# =============================================================================
# Runs k6 load tests against all APIs and generates performance reports
#
# Usage:
#   ./benchmark.sh                    # Run against hosted domain
#   ./benchmark.sh --local            # Run against local server
#   ./benchmark.sh --url http://...   # Run against custom URL
#   ./benchmark.sh --compare          # Compare with previous results
#   ./benchmark.sh --open             # Open heatmap in browser
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_HOST="https://post-panel-api.onrender.com"
LOCAL_HOST="http://localhost:7180"
RESULTS_DIR="loadtests/results"
K6_SCRIPT="loadtests/k6_api_test.js"
ANALYZE_SCRIPT="loadtests/analyze.py"

# Parse arguments
BASE_URL=""
COMPARE=false
OPEN_HEATMAP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --local)
      BASE_URL="$LOCAL_HOST"
      shift
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --compare)
      COMPARE=true
      shift
      ;;
    --open)
      OPEN_HEATMAP=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local           Run against local server (localhost:7180)"
      echo "  --url URL         Run against custom URL"
      echo "  --compare         Compare with previous results"
      echo "  --open            Open heatmap in browser after test"
      echo "  --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Run against hosted domain"
      echo "  $0 --local                  # Run against local server"
      echo "  $0 --url http://my-api.com  # Run against custom URL"
      echo "  $0 --compare --open         # Compare and open heatmap"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set default URL if not specified
if [ -z "$BASE_URL" ]; then
  BASE_URL="$DEFAULT_HOST"
fi

# Print header
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          🔥 API Performance Testing Suite 🔥              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v k6 &> /dev/null; then
  echo -e "${RED}❌ k6 is not installed. Install it:${NC}"
  echo "  brew install k6"
  exit 1
fi

if ! command -v python3 &> /dev/null; then
  echo -e "${RED}❌ python3 is not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ k6 installed: $(k6 version)${NC}"
echo -e "${GREEN}✓ python3 installed${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Print test configuration
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Target URL:    ${CYAN}$BASE_URL${NC}"
echo -e "  K6 Script:     ${CYAN}$K6_SCRIPT${NC}"
echo -e "  Results Dir:   ${CYAN}$RESULTS_DIR${NC}"
echo -e "  Compare Mode:  ${CYAN}$COMPARE${NC}"
echo ""

# Run k6 tests
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running k6 Load Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

k6 run \
  --env BASE_URL="$BASE_URL" \
  --out json="$RESULTS_DIR/k6_raw.json" \
  "$K6_SCRIPT"

K6_EXIT=$?

if [ $K6_EXIT -ne 0 ]; then
  echo -e "${RED}❌ k6 tests failed with exit code $K6_EXIT${NC}"
  exit $K6_EXIT
fi

echo ""
echo -e "${GREEN}✓ k6 tests completed successfully${NC}"
echo ""

# Analyze results
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Analyzing Results${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

python3 "$ANALYZE_SCRIPT"

ANALYZE_EXIT=$?

# Open heatmap if requested
if [ "$OPEN_HEATMAP" = true ]; then
  if [ -f "$RESULTS_DIR/heatmap.html" ]; then
    echo ""
    echo -e "${BLUE}Opening heatmap in browser...${NC}"
    open "$RESULTS_DIR/heatmap.html"
  fi
fi

# Print summary
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    📁 Output Files                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✓ Summary:     $RESULTS_DIR/summary.json${NC}"
echo -e "  ${GREEN}✓ History:     $RESULTS_DIR/history.json${NC}"
echo -e "  ${GREEN}✓ Comparison:  $RESULTS_DIR/comparison.json${NC}"
echo -e "  ${GREEN}✓ Heatmap:     $RESULTS_DIR/heatmap.html${NC}"
echo -e "  ${GREEN}✓ Raw Data:    $RESULTS_DIR/k6_raw.json${NC}"
echo ""

exit $ANALYZE_EXIT
