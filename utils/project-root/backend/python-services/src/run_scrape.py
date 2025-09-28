# src/run_scrape.py
"""
CLI tool to run a scrape job synchronously (useful for cron/manual runs).
Example:
    python -m src.run_scrape --username sample_user --posts 3 --analyze --sample
"""
import argparse
from src.jobs import worker

def str2bool(v):
    if isinstance(v, bool):
        return v
    return v.lower() in ("yes", "true", "t", "1", "y")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run a synchronous scrape job")
    parser.add_argument("--username", required=True, help="Instagram username")
    parser.add_argument("--posts", type=int, default=10, help="Number of posts to fetch")
    parser.add_argument("--analyze", type=str2bool, default=True, help="Run image analysis")
    parser.add_argument("--sample", action="store_true", help="Use sample JSON data")
    args = parser.parse_args()

    job_id = worker.run_job_sync(args.username, posts=args.posts, analyze=args.analyze, sample=args.sample)
    print(f"Synchronous job finished (job_id={job_id}).")
