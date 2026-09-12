#!/usr/bin/env python3
"""
Performance Analysis Script

Generates heatmaps and compares current results with historical data.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

RESULTS_DIR = Path(__file__).parent / "results"
HISTORY_FILE = RESULTS_DIR / "history.json"
CURRENT_FILE = RESULTS_DIR / "summary.json"
HEATMAP_FILE = RESULTS_DIR / "heatmap.html"
COMPARISON_FILE = RESULTS_DIR / "comparison.json"


def load_json(filepath: Path) -> Optional[Dict]:
    """Load JSON file if it exists."""
    if filepath.exists():
        with open(filepath, "r") as f:
            return json.load(f)
    return None


def save_json(filepath: Path, data: Dict):
    """Save data to JSON file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def update_history(current: Dict) -> List[Dict]:
    """Append current results to history and return updated history."""
    history = load_json(HISTORY_FILE) or []
    
    # Add timestamp if not present
    if "timestamp" not in current:
        current["timestamp"] = datetime.now().isoformat()
    
    history.append(current)
    
    # Keep only last 30 results
    if len(history) > 30:
        history = history[-30:]
    
    save_json(HISTORY_FILE, history)
    return history


def compare_results(current: Dict, previous: Optional[Dict]) -> Dict:
    """Compare current results with previous results."""
    if not previous:
        return {
            "has_baseline": False,
            "message": "No previous results to compare",
        }
    
    comparison = {
        "has_baseline": True,
        "previous_timestamp": previous.get("timestamp"),
        "current_timestamp": current.get("timestamp"),
        "metrics": {},
        "regressions": [],
        "improvements": [],
    }
    
    # Compare key metrics
    metrics_to_compare = [
        ("avg_duration", "Avg Duration (ms)", 10),  # 10% threshold
        ("p95_duration", "P95 Duration (ms)", 20),  # 20% threshold
        ("max_duration", "Max Duration (ms)", 30),  # 30% threshold
        ("rps", "Requests/sec", -10),  # Negative because higher is better
        ("error_rate", "Error Rate", 50),
    ]
    
    for key, label, threshold in metrics_to_compare:
        current_val = current.get(key, 0)
        previous_val = previous.get(key, 0)
        
        if previous_val == 0:
            continue
        
        percent_change = ((current_val - previous_val) / previous_val) * 100
        
        comparison["metrics"][key] = {
            "label": label,
            "current": current_val,
            "previous": previous_val,
            "percent_change": percent_change,
            "threshold": threshold,
        }
        
        # Determine if regression or improvement
        if key == "error_rate":
            # For error rate, any increase is bad
            if percent_change > threshold:
                comparison["regressions"].append({
                    "metric": label,
                    "change": percent_change,
                    "severity": "severe" if percent_change > 100 else "warning",
                })
        elif key == "rps":
            # For RPS, decrease is bad
            if percent_change < threshold:
                comparison["regressions"].append({
                    "metric": label,
                    "change": percent_change,
                    "severity": "severe" if percent_change < -30 else "warning",
                })
        else:
            # For duration metrics, increase is bad
            if percent_change > threshold:
                comparison["regressions"].append({
                    "metric": label,
                    "change": percent_change,
                    "severity": "severe" if percent_change > 50 else "warning",
                })
            elif percent_change < -threshold:
                comparison["improvements"].append({
                    "metric": label,
                    "change": percent_change,
                })
    
    return comparison


def generate_heatmap(history: List[Dict]) -> str:
    """Generate an HTML heatmap visualization."""
    if not history:
        return "<html><body><h1>No data available</h1></body></html>"
    
    # Prepare data for heatmap
    timestamps = [h.get("timestamp", "N/A")[:16] for h in history]
    avg_durations = [h.get("avg_duration", 0) for h in history]
    p95_durations = [h.get("p95_duration", 0) for h in history]
    max_durations = [h.get("max_duration", 0) for h in history]
    rps_values = [h.get("rps", 0) for h in history]
    
    # Calculate color intensity based on values
    def get_color(value, max_value, invert=False):
        if max_value == 0:
            return "rgb(200, 200, 200)"
        intensity = min(value / max_value, 1.0)
        if invert:
            intensity = 1 - intensity
        # Green (good) to Red (bad)
        r = int(255 * intensity)
        g = int(255 * (1 - intensity))
        return f"rgb({r}, {g}, 100)"
    
    max_avg = max(avg_durations) if avg_durations else 1
    max_p95 = max(p95_durations) if p95_durations else 1
    max_max = max(max_durations) if max_durations else 1
    max_rps = max(rps_values) if rps_values else 1
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>API Performance Heatmap</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }}
        h1 {{ color: #00d4ff; text-align: center; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .heatmap {{ margin: 20px 0; }}
        .row {{ display: flex; margin: 5px 0; align-items: center; }}
        .label {{ width: 150px; font-weight: bold; font-size: 14px; }}
        .cells {{ display: flex; gap: 3px; flex: 1; }}
        .cell {{ 
            width: 40px; 
            height: 30px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 10px;
            border-radius: 3px;
            cursor: pointer;
            transition: transform 0.2s;
        }}
        .cell:hover {{ transform: scale(1.2); z-index: 10; }}
        .legend {{ display: flex; gap: 20px; margin: 20px 0; justify-content: center; }}
        .legend-item {{ display: flex; align-items: center; gap: 5px; font-size: 12px; }}
        .legend-color {{ width: 20px; height: 20px; border-radius: 3px; }}
        .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }}
        .stat-card {{ 
            background: #16213e; 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
            border: 1px solid #0f3460;
        }}
        .stat-value {{ font-size: 24px; font-weight: bold; color: #00d4ff; }}
        .stat-label {{ font-size: 12px; color: #888; margin-top: 5px; }}
        .tooltip {{ 
            position: absolute; 
            background: #16213e; 
            padding: 10px; 
            border-radius: 5px;
            border: 1px solid #00d4ff;
            font-size: 12px;
            pointer-events: none;
            z-index: 100;
            display: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 API Performance Heatmap</h1>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{len(history)}</div>
                <div class="stat-label">Total Runs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(rps_values) / len(rps_values):.1f}</div>
                <div class="stat-label">Avg RPS</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(avg_durations) / len(avg_durations):.0f}ms</div>
                <div class="stat-label">Avg Latency</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{sum(p95_durations) / len(p95_durations):.0f}ms</div>
                <div class="stat-label">Avg P95</div>
            </div>
        </div>
        
        <div class="heatmap">
            <div class="row">
                <div class="label">Avg Duration</div>
                <div class="cells">
"""
    
    for i, (ts, val) in enumerate(zip(timestamps, avg_durations)):
        color = get_color(val, max_avg)
        html += f'                    <div class="cell" style="background: {color}" title="{ts}: {val:.1f}ms">{val:.0f}</div>\n'
    
    html += """                </div>
            </div>
            <div class="row">
                <div class="label">P95 Duration</div>
                <div class="cells">
"""
    
    for i, (ts, val) in enumerate(zip(timestamps, p95_durations)):
        color = get_color(val, max_p95)
        html += f'                    <div class="cell" style="background: {color}" title="{ts}: {val:.1f}ms">{val:.0f}</div>\n'
    
    html += """                </div>
            </div>
            <div class="row">
                <div class="label">Max Duration</div>
                <div class="cells">
"""
    
    for i, (ts, val) in enumerate(zip(timestamps, max_durations)):
        color = get_color(val, max_max)
        html += f'                    <div class="cell" style="background: {color}" title="{ts}: {val:.1f}ms">{val:.0f}</div>\n'
    
    html += """                </div>
            </div>
            <div class="row">
                <div class="label">Requests/sec</div>
                <div class="cells">
"""
    
    for i, (ts, val) in enumerate(zip(timestamps, rps_values)):
        color = get_color(val, max_rps, invert=True)
        html += f'                    <div class="cell" style="background: {color}" title="{ts}: {val:.1f} RPS">{val:.1f}</div>\n'
    
    html += """                </div>
            </div>
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background: rgb(100, 255, 100)"></div>
                <span>Good (Low latency / High RPS)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: rgb(255, 255, 100)"></div>
                <span>Warning</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: rgb(255, 100, 100)"></div>
                <span>Critical (High latency / Low RPS)</span>
            </div>
        </div>
        
        <p style="text-align: center; color: #666; font-size: 12px;">
            Generated: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """
        </p>
    </div>
</body>
</html>"""
    
    return html


def print_comparison(comparison: Dict):
    """Print comparison results to console."""
    print("\n" + "=" * 60)
    print("📊 Performance Comparison")
    print("=" * 60)
    
    if not comparison.get("has_baseline"):
        print(f"\n{comparison.get('message', 'No baseline available')}")
        print("This run will be saved as the baseline for future comparisons.")
        return
    
    print(f"\nPrevious run: {comparison.get('previous_timestamp', 'N/A')[:16]}")
    print(f"Current run:  {comparison.get('current_timestamp', 'N/A')[:16]}")
    
    if comparison.get("regressions"):
        print(f"\n❌ REGRESSIONS DETECTED: {len(comparison['regressions'])}")
        for reg in comparison["regressions"]:
            severity = "🔴" if reg["severity"] == "severe" else "🟡"
            print(f"  {severity} {reg['metric']}: {reg['change']:+.1f}%")
    
    if comparison.get("improvements"):
        print(f"\n✅ IMPROVEMENTS: {len(comparison['improvements'])}")
        for imp in comparison["improvements"]:
            print(f"  🟢 {imp['metric']}: {imp['change']:+.1f}%")
    
    if not comparison.get("regressions") and not comparison.get("improvements"):
        print("\n✅ No significant changes detected")
    
    print("\n" + "=" * 60)


def main():
    """Main analysis function."""
    print("\n🔍 Analyzing performance results...")
    
    # Load current results
    current = load_json(CURRENT_FILE)
    if not current:
        print("❌ No current results found. Run k6 tests first.")
        sys.exit(1)
    
    # Load previous results from history
    history = load_json(HISTORY_FILE) or []
    previous = history[-1] if history else None
    
    # Compare with previous
    comparison = compare_results(current, previous)
    print_comparison(comparison)
    
    # Update history
    history = update_history(current)
    
    # Generate heatmap
    print("\n🔥 Generating heatmap...")
    heatmap_html = generate_heatmap(history)
    with open(HEATMAP_FILE, "w") as f:
        f.write(heatmap_html)
    print(f"Heatmap saved to: {HEATMAP_FILE}")
    
    # Save comparison
    save_json(COMPARISON_FILE, comparison)
    print(f"Comparison saved to: {COMPARISON_FILE}")
    
    # Exit with error if regressions detected
    if comparison.get("regressions"):
        severe = any(r["severity"] == "severe" for r in comparison["regressions"])
        if severe:
            sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
