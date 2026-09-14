#!/usr/bin/env python3
"""
Run the RLS harness and collect its result.

Headless Chrome's --dump-dom fires at the load event, and --virtual-time-budget
fast-forwards the clock and kills the page while PGlite's WASM engine is still
booting. So instead of scraping the DOM, the page POSTs its result back here and
this server waits for it.

  python3 scripts/rls-test/serve_and_run.py        # exit 0 = all assertions passed
"""
import http.server, socketserver, threading, subprocess, sys, os, json, time, signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = int(os.environ.get("PORT", "8765"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TIMEOUT = int(os.environ.get("TIMEOUT", "300"))

result = {}
done = threading.Event()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        if self.path == "/__result":
            n = int(self.headers.get("Content-Length", 0))
            try:
                result.update(json.loads(self.rfile.read(n) or b"{}"))
            except Exception as e:
                result.update({"error": "bad payload: %s" % e})
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            done.set()
            return
        self.send_error(404)

    def log_message(self, *a):
        pass


def main():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    url = "http://127.0.0.1:%d/scripts/rls-test/harness.html" % PORT
    chrome = subprocess.Popen(
        [CHROME, "--headless", "--disable-gpu", "--no-sandbox",
         "--user-data-dir=/tmp/craftos-rls-profile", "--no-first-run",
         "--disable-dev-shm-usage", url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not done.wait(TIMEOUT):
            print("TIMEOUT after %ds — the harness never reported back." % TIMEOUT)
            return 2
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=10)
        except Exception:
            chrome.kill()
        srv.shutdown()

    print(result.get("log", "(no log)"))
    p, f = result.get("pass", 0), result.get("fail", 0)
    print("\n%s %d/%d" % ("PASS" if not f else "FAIL", p, p + f))
    return 0 if (f == 0 and p > 0) else 1


if __name__ == "__main__":
    sys.exit(main())
