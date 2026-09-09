#!/usr/bin/env python3
"""
Quick load test script for Post Panel API.

Usage:
    python3 backend-fastapi/loadtests/quick_load.py [--host http://127.0.0.1:7180] [--users 10] [--duration 30]
"""

import argparse
import time
import statistics
import threading
import httpx


def parse_args():
    p = argparse.ArgumentParser(description="Quick load test for Post Panel API")
    p.add_argument("--host", default="http://127.0.0.1:7180", help="Backend URL")
    p.add_argument("--users", type=int, default=10, help="Concurrent virtual users")
    p.add_argument("--duration", type=int, default=30, help="Test duration in seconds")
    return p.parse_args()


class Stats:
    def __init__(self):
        self.lock = threading.Lock()
        self.latencies = []
        self.status_codes = {}
        self.errors = 0
        self.total = 0

    def record(self, status, latency, error=False):
        with self.lock:
            self.latencies.append(latency)
            self.status_codes[status] = self.status_codes.get(status, 0) + 1
            self.total += 1
            if error:
                self.errors += 1

    def report(self):
        with self.lock:
            if not self.latencies:
                return "No requests completed"
            sorted_lat = sorted(self.latencies)
            p50 = sorted_lat[len(sorted_lat) // 2]
            p95 = sorted_lat[int(len(sorted_lat) * 0.95)]
            p99 = sorted_lat[int(len(sorted_lat) * 0.99)]
            avg = statistics.mean(sorted_lat)
            rps = self.total / max(time.time() - _start, 1)

            lines = [
                "",
                "=" * 60,
                "LOAD TEST RESULTS",
                "=" * 60,
                f"Total requests:    {self.total}",
                f"Errors:            {self.errors} ({self.errors/max(self.total,1)*100:.1f}%)",
                f"Requests/sec:      {rps:.1f}",
                "",
                "Latency (ms):",
                f"  Average:         {avg:.1f}",
                f"  Median (p50):    {p50:.1f}",
                f"  p95:             {p95:.1f}",
                f"  p99:             {p99:.1f}",
                f"  Min:             {sorted_lat[0]:.1f}",
                f"  Max:             {sorted_lat[-1]:.1f}",
                "",
                "Status codes:",
            ]
            for code, count in sorted(self.status_codes.items()):
                lines.append(f"  {code}: {count}")
            lines.append("=" * 60)
            return "\n".join(lines)


stats = Stats()
_start = time.time()


def worker(host, stop_event):
    """Single virtual user — loops through endpoints until stopped."""
    with httpx.Client(base_url=host, timeout=10) as client:
        while not stop_event.is_set():
            endpoints = [
                ("GET", "/api/posts?offset=0&limit=12"),
                ("GET", "/api/posts?offset=12&limit=12"),
                ("GET", "/api/posts/nonexistent"),
                ("GET", "/"),
                ("GET", "/api/auth/me"),
            ]
            for method, path in endpoints:
                if stop_event.is_set():
                    break
                t0 = time.time()
                try:
                    if method == "GET":
                        resp = client.get(path)
                    latency = (time.time() - t0) * 1000
                    stats.record(resp.status_code, latency)
                except Exception:
                    latency = (time.time() - t0) * 1000
                    stats.record(0, latency, error=True)


def main():
    args = parse_args()
    global _start
    _start = time.time()

    print(f"Starting load test: {args.users} users, {args.duration}s duration")
    print(f"Target: {args.host}")
    print("-" * 40)

    stop_event = threading.Event()
    threads = []

    for _ in range(args.users):
        t = threading.Thread(target=worker, args=(args.host, stop_event), daemon=True)
        t.start()
        threads.append(t)

    try:
        time.sleep(args.duration)
    except KeyboardInterrupt:
        print("\nInterrupted")

    stop_event.set()
    for t in threads:
        t.join(timeout=5)

    print(stats.report())


if __name__ == "__main__":
    main()
