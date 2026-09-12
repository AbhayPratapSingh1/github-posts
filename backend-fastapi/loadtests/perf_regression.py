"""
Performance Regression Detection Script

This script runs load tests and compares results against historical baselines
to detect performance regressions.

Usage:
    python loadtests/perf_regression.py --host http://127.0.0.1:7180 --baseline-file perf_baseline.json

Requirements:
    - Locust must be installed
    - Backend server must be running
"""

import sys
import os
import json
import time
import subprocess
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# Regression thresholds (percentage increase)
THRESHOLDS = {
    "warning": 10,    # 10% increase triggers warning
    "regression": 20, # 20% increase triggers regression
    "severe": 50,     # 50% increase triggers severe regression
}

# Default baseline file
DEFAULT_BASELINE_FILE = "perf_baseline.json"


class PerformanceRegressionDetector:
    def __init__(self, host: str, baseline_file: str = DEFAULT_BASELINE_FILE):
        self.host = host
        self.baseline_file = Path(baseline_file)
        self.results = {}
        self.baseline = self.load_baseline()
    
    def load_baseline(self) -> Dict[str, Any]:
        """Load historical baseline from file."""
        if self.baseline_file.exists():
            with open(self.baseline_file, "r") as f:
                return json.load(f)
        return {}
    
    def save_baseline(self, results: Dict[str, Any]):
        """Save results as new baseline."""
        with open(self.baseline_file, "w") as f:
            json.dump(results, f, indent=2)
    
    def run_locust_test(self, duration: int = 30, users: int = 10) -> Dict[str, Any]:
        """Run Locust test and capture results."""
        print(f"\n=== Running Load Test ===")
        print(f"Host: {self.host}")
        print(f"Duration: {duration}s")
        print(f"Users: {users}")
        
        # Create a temporary Locust file for headless testing
        locust_config = f"""
import json
from locust import HttpUser, task, between

class TestUser(HttpUser):
    wait_time = between(1, 2)
    
    @task(10)
    def list_posts(self):
        self.client.get("/api/posts?offset=0&limit=12", name="/api/posts")
    
    @task(5)
    def get_post(self):
        self.client.get("/api/posts/test-post", name="/api/posts/[id]")
    
    @task(1)
    def health(self):
        self.client.get("/", name="/")
"""
        
        # Write temporary Locust file
        temp_locust_file = "temp_locustfile.py"
        with open(temp_locust_file, "w") as f:
            f.write(locust_config)
        
        try:
            # Run Locust in headless mode
            cmd = [
                "locust",
                "-f", temp_locust_file,
                "--host", self.host,
                "--headless",
                "-u", str(users),
                "-r", "1",
                "--run-time", f"{duration}s",
                "--csv=perf_results",
                "--html=perf_report.html",
            ]
            
            print(f"\nRunning: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=duration + 30)
            
            # Parse CSV results
            results = self.parse_locust_csv("perf_results_stats.csv")
            
            return results
            
        finally:
            # Clean up temporary files
            if os.path.exists(temp_locust_file):
                os.remove(temp_locust_file)
    
    def parse_locust_csv(self, csv_file: str) -> Dict[str, Any]:
        """Parse Locust CSV results file."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "endpoints": {},
            "summary": {}
        }
        
        if not os.path.exists(csv_file):
            print(f"Warning: CSV file {csv_file} not found")
            return results
        
        import csv
        
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("Name", "")
                if name and name != "Aggregated":
                    results["endpoints"][name] = {
                        "request_count": int(row.get("Request Count", 0)),
                        "failure_count": int(row.get("Failure Count", 0)),
                        "median_ms": float(row.get("Median Response Time", 0)),
                        "avg_ms": float(row.get("Average Response Time", 0)),
                        "p95_ms": float(row.get("95%ile", 0)),
                        "p99_ms": float(row.get("99%ile", 0)),
                        "rps": float(row.get("Requests/s", 0)),
                    }
                elif name == "Aggregated":
                    results["summary"] = {
                        "request_count": int(row.get("Request Count", 0)),
                        "failure_count": int(row.get("Failure Count", 0)),
                        "median_ms": float(row.get("Median Response Time", 0)),
                        "avg_ms": float(row.get("Average Response Time", 0)),
                        "p95_ms": float(row.get("95%ile", 0)),
                        "p99_ms": float(row.get("99%ile", 0)),
                        "rps": float(row.get("Requests/s", 0)),
                    }
        
        return results
    
    def compare_with_baseline(self, current: Dict[str, Any]) -> Dict[str, Any]:
        """Compare current results with baseline and detect regressions."""
        comparison = {
            "timestamp": datetime.now().isoformat(),
            "has_baseline": bool(self.baseline),
            "regressions": [],
            "warnings": [],
            "improvements": [],
            "new_endpoints": [],
        }
        
        if not self.baseline:
            print("\nNo baseline found. Current results will be saved as baseline.")
            return comparison
        
        baseline_endpoints = self.baseline.get("endpoints", {})
        current_endpoints = current.get("endpoints", {})
        
        for endpoint, current_data in current_endpoints.items():
            if endpoint not in baseline_endpoints:
                comparison["new_endpoints"].append(endpoint)
                continue
            
            baseline_data = baseline_endpoints[endpoint]
            baseline_p95 = baseline_data.get("p95_ms", 0)
            current_p95 = current_data.get("p95_ms", 0)
            
            if baseline_p95 == 0:
                continue
            
            percent_change = ((current_p95 - baseline_p95) / baseline_p95) * 100
            
            if percent_change > THRESHOLDS["severe"]:
                comparison["regressions"].append({
                    "endpoint": endpoint,
                    "baseline_p95": baseline_p95,
                    "current_p95": current_p95,
                    "percent_change": percent_change,
                    "severity": "severe",
                })
            elif percent_change > THRESHOLDS["regression"]:
                comparison["regressions"].append({
                    "endpoint": endpoint,
                    "baseline_p95": baseline_p95,
                    "current_p95": current_p95,
                    "percent_change": percent_change,
                    "severity": "regression",
                })
            elif percent_change > THRESHOLDS["warning"]:
                comparison["warnings"].append({
                    "endpoint": endpoint,
                    "baseline_p95": baseline_p95,
                    "current_p95": current_p95,
                    "percent_change": percent_change,
                })
            elif percent_change < -10:  # 10% improvement
                comparison["improvements"].append({
                    "endpoint": endpoint,
                    "baseline_p95": baseline_p95,
                    "current_p95": current_p95,
                    "percent_change": percent_change,
                })
        
        return comparison
    
    def print_report(self, current: Dict[str, Any], comparison: Dict[str, Any]):
        """Print performance report."""
        print("\n" + "=" * 60)
        print("Performance Regression Report")
        print("=" * 60)
        
        print(f"\nTimestamp: {comparison['timestamp']}")
        print(f"Has Baseline: {comparison['has_baseline']}")
        
        # Summary
        summary = current.get("summary", {})
        if summary:
            print(f"\nSummary:")
            print(f"  Total Requests: {summary.get('request_count', 0)}")
            print(f"  Total Failures: {summary.get('failure_count', 0)}")
            print(f"  Median Latency: {summary.get('median_ms', 0):.2f}ms")
            print(f"  Avg Latency: {summary.get('avg_ms', 0):.2f}ms")
            print(f"  P95 Latency: {summary.get('p95_ms', 0):.2f}ms")
            print(f"  P99 Latency: {summary.get('p99_ms', 0):.2f}ms")
            print(f"  Requests/sec: {summary.get('rps', 0):.2f}")
        
        # Regressions
        if comparison["regressions"]:
            print(f"\n❌ REGRESSIONS DETECTED: {len(comparison['regressions'])}")
            for reg in comparison["regressions"]:
                print(f"\n  {reg['endpoint']}:")
                print(f"    Severity: {reg['severity'].upper()}")
                print(f"    Baseline P95: {reg['baseline_p95']:.2f}ms")
                print(f"    Current P95: {reg['current_p95']:.2f}ms")
                print(f"    Change: +{reg['percent_change']:.1f}%")
        
        # Warnings
        if comparison["warnings"]:
            print(f"\n⚠️  WARNINGS: {len(comparison['warnings'])}")
            for warn in comparison["warnings"]:
                print(f"\n  {warn['endpoint']}:")
                print(f"    Baseline P95: {warn['baseline_p95']:.2f}ms")
                print(f"    Current P95: {warn['current_p95']:.2f}ms")
                print(f"    Change: +{warn['percent_change']:.1f}%")
        
        # Improvements
        if comparison["improvements"]:
            print(f"\n✅ IMPROVEMENTS: {len(comparison['improvements'])}")
            for imp in comparison["improvements"]:
                print(f"\n  {imp['endpoint']}:")
                print(f"    Baseline P95: {imp['baseline_p95']:.2f}ms")
                print(f"    Current P95: {imp['current_p95']:.2f}ms")
                print(f"    Change: {imp['percent_change']:.1f}%")
        
        # New endpoints
        if comparison["new_endpoints"]:
            print(f"\n🆕 NEW ENDPOINTS: {len(comparison['new_endpoints'])}")
            for endpoint in comparison["new_endpoints"]:
                print(f"  - {endpoint}")
        
        # Overall status
        print("\n" + "=" * 60)
        if comparison["regressions"]:
            severe = any(r["severity"] == "severe" for r in comparison["regressions"])
            if severe:
                print("❌ SEVERE REGRESSION DETECTED - Action required!")
            else:
                print("❌ REGRESSION DETECTED - Investigation recommended")
        elif comparison["warnings"]:
            print("⚠️  WARNINGS - Monitor closely")
        else:
            print("✅ NO REGRESSIONS DETECTED")
        print("=" * 60)
    
    def run(self, duration: int = 30, users: int = 10, save_as_baseline: bool = False):
        """Run full performance regression detection."""
        # Run load test
        current_results = self.run_locust_test(duration, users)
        
        # Compare with baseline
        comparison = self.compare_with_baseline(current_results)
        
        # Print report
        self.print_report(current_results, comparison)
        
        # Save as baseline if requested or if no baseline exists
        if save_as_baseline or not self.baseline:
            self.save_baseline(current_results)
            print(f"\nResults saved to {self.baseline_file}")
        
        return {
            "results": current_results,
            "comparison": comparison,
            "has_regression": bool(comparison["regressions"]),
            "has_warning": bool(comparison["warnings"]),
        }


def main():
    parser = argparse.ArgumentParser(description="Performance Regression Detection")
    parser.add_argument("--host", default="http://127.0.0.1:7180", help="Backend URL")
    parser.add_argument("--duration", type=int, default=30, help="Test duration in seconds")
    parser.add_argument("--users", type=int, default=10, help="Number of virtual users")
    parser.add_argument("--baseline-file", default=DEFAULT_BASELINE_FILE, help="Baseline file path")
    parser.add_argument("--save-baseline", action="store_true", help="Save results as new baseline")
    
    args = parser.parse_args()
    
    detector = PerformanceRegressionDetector(args.host, args.baseline_file)
    result = detector.run(args.duration, args.users, args.save_baseline)
    
    # Exit with error code if regression detected
    if result["has_regression"]:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
