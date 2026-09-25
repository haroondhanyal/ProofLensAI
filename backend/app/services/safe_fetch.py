"""Small, pinned-IP HTTPS fetcher for explicit user-requested page checks."""
import http.client
import ipaddress
import socket
import ssl
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

MAX_BYTES = 1_500_000
MAX_REDIRECTS = 3


class _PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.links, self.forms = [], [], []
        self.title, self._title, self._hidden, self._link_index = "", False, 0, None
        self._form_index = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "noscript", "svg"}: self._hidden += 1
        if tag == "title": self._title = True
        if tag == "a" and attrs.get("href") and len(self.links) < 400:
            self.links.append({"href": attrs["href"][:2048], "text": ""})
            self._link_index = len(self.links) - 1
        if tag == "form" and len(self.forms) < 30:
            self.forms.append({"method": attrs.get("method", "get").lower(), "fields": []})
            self._form_index = len(self.forms) - 1
        if tag in {"input", "textarea", "select"} and self._form_index is not None:
            self.forms[self._form_index]["fields"].append((attrs.get("type", tag) + " " + attrs.get("name", "") + " " + attrs.get("autocomplete", "")).lower()[:160])

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self._hidden: self._hidden -= 1
        if tag == "title": self._title = False
        if tag == "a": self._link_index = None
        if tag == "form": self._form_index = None

    def handle_data(self, data):
        if not self._hidden and data.strip():
            self.parts.append(data.strip()[:1000])
        if self._title: self.title = (self.title + " " + data.strip())[:300]
        if self._link_index is not None and data.strip():
            link = self.links[self._link_index]
            link["text"] = (link["text"] + " " + data.strip())[:300]


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host, ip, timeout):
        super().__init__(host, 443, timeout=timeout, context=ssl.create_default_context())
        self.ip = ip

    def connect(self):
        raw = socket.create_connection((self.ip, 443), self.timeout)
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


def _validated_target(url):
    parsed = urlsplit(url)
    if parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("unsupported_url")
    host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal", ".localhost")) or "." not in host:
        raise ValueError("private_host")
    try:
        literal = ipaddress.ip_address(host)
        addresses = [str(literal)]
    except ValueError:
        addresses = sorted({item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)})
    if not addresses or any(not ipaddress.ip_address(item).is_global for item in addresses):
        raise ValueError("private_address")
    clean = urlunsplit(("https", host, parsed.path or "/", parsed.query, ""))
    return host, addresses[0], clean, (parsed.path or "/") + (("?" + parsed.query) if parsed.query else "")


def fetch_public_page(url: str) -> dict:
    """Fetch one public HTTPS HTML page, validating and pinning every redirect hop."""
    current = url
    try:
        try:
            ipaddress.ip_address(urlsplit(url).hostname or "")
            return {"status": "blocked_or_unavailable", "reason": "unsafe_or_unreachable_url"}
        except ValueError:
            pass
        redirect_count = 0
        for _ in range(MAX_REDIRECTS + 1):
            host, ip, clean, target = _validated_target(current)
            connection = _PinnedHTTPSConnection(host, ip, timeout=4)
            try:
                connection.request("GET", target, headers={"Host": host, "User-Agent": "ProofLensSafeCheck/1.0", "Accept": "text/html,application/xhtml+xml;q=0.9", "Accept-Encoding": "identity", "Connection": "close"})
                response = connection.getresponse()
                if response.status in (301, 302, 303, 307, 308):
                    location = response.getheader("Location")
                    response.read(4096)
                    if not location: return {"status": "unavailable", "reason": "invalid_redirect"}
                    current = urljoin(clean, location)
                    redirect_count += 1
                    continue
                if response.status < 200 or response.status >= 300: return {"status": "unavailable", "reason": "http_error"}
                content_type = (response.getheader("Content-Type") or "").lower()
                if "html" not in content_type: return {"status": "unsupported_content", "reason": "not_html", "final_url": clean}
                if int(response.getheader("Content-Length") or 0) > MAX_BYTES: return {"status": "unavailable", "reason": "page_too_large"}
                body = response.read(MAX_BYTES + 1)
                if len(body) > MAX_BYTES: return {"status": "unavailable", "reason": "page_too_large"}
                parser = _PageParser()
                parser.feed(body.decode("utf-8", errors="replace"))
                return {"status": "fetched", "final_url": clean, "hostname": host, "http_status": response.status,
                        "redirect_count": redirect_count, "tls_valid": True, "title": parser.title,
                        "text": " ".join(parser.parts)[:120000], "links": parser.links, "forms": parser.forms}
            finally:
                connection.close()
        return {"status": "unavailable", "reason": "too_many_redirects"}
    except (ValueError, OSError, socket.timeout, http.client.HTTPException, UnicodeError):
        return {"status": "blocked_or_unavailable", "reason": "unsafe_or_unreachable_url"}
