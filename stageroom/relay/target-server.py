#!/usr/bin/env python3
"""Tiny HTTP server that receives Cloudflare RTMP target URLs
from the browser and writes them to a temp file for the relay script."""
import json, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler

TARGET_FILE = os.environ.get('CLOUDFLARE_RELAY_FILE', '/tmp/cloudflare_relay_target')
PORT = int(os.environ.get('RELAY_TARGET_PORT', '9990'))

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
            url = data.get('url', '')
            with open(TARGET_FILE, 'w') as f:
                f.write(url)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            print(f'[target-server] Set relay target to: {url}', flush=True)
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_DELETE(self):
        try:
            os.remove(TARGET_FILE)
        except FileNotFoundError:
            pass
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')
        print('[target-server] Cleared relay target', flush=True)

    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    print(f'[target-server] Listening on port {PORT}, writing to {TARGET_FILE}', flush=True)
    HTTPServer(('', PORT), Handler).serve_forever()
