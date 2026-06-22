from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import os


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8200)
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    server = ThreadingHTTPServer((args.host, args.port), NoCacheHandler)
    print(f"Serving {root} at http://{args.host}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
