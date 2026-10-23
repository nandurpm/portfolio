# FILE: audit_links.py
# FILE PURPOSE: Read-only static-site audit that checks local references, duplicate IDs, page titles, and meta descriptions across HTML files.

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]

class PageParser(HTMLParser):
    """Collect local references, element IDs, and required page metadata."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str, int]] = []
        self.ids: list[tuple[str, int]] = []
        self.title = ""
        self.description = ""
        self.images = []
        self.headings = []
        self.lang = None
        self.external = []
        self._in_title = False
        self._title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        line = self.getpos()[0]
        if tag == 'html': self.lang = attrs_dict.get('lang')
        if tag in ('h1','h2','h3','h4','h5','h6'): self.headings.append(int(tag[1]))
        if tag == 'img': self.images.append((attrs_dict, line))
        if tag == 'a' and (attrs_dict.get('href') or '').startswith(('http://','https://')):
            self.external.append((attrs_dict, line))
        if "id" in attrs_dict and attrs_dict["id"]:
            self.ids.append((attrs_dict["id"] or "", line))
        for attr in ("href", "src"):
            value = attrs_dict.get(attr)
            if value:
                self.refs.append((attr, value, line))
        if tag == "title":
            self._in_title = True
        if tag == "meta" and attrs_dict.get("name", "").lower() == "description":
            self.description = attrs_dict.get("content", "") or ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._in_title:
            self.title = "".join(self._title_parts).strip()
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_parts.append(data)


def resolve_local(page: Path, ref: str) -> Path | None:
    """Resolve a same-site HTML reference to a repository path when possible."""

    parsed = urlparse(ref)
    if parsed.scheme or ref.startswith("//") or ref.startswith("#"):
        return None
    path_part = parsed.path
    if not path_part:
        return None
    if path_part.startswith("/"):
        return ROOT / path_part.lstrip("/")
    return (page.parent / path_part).resolve()


def main() -> None:
    """Audit every HTML document and print a deterministic repository summary."""

    # Audit deployable pages and templates, not Vite input, dependencies or caches.
    # Zoho verification is intentionally a one-line token, not an HTML page.
    excluded = {'.git', '.cache', 'node_modules', 'tracker-source', 'scripts', 'zohoverify'}
    html_files = sorted(page for page in ROOT.rglob("*.html")
                        if not excluded.intersection(page.relative_to(ROOT).parts))
    missing: list[tuple[str, int, str, str]] = []
    duplicate_ids: list[tuple[str, str, list[int]]] = []
    metadata: list[tuple[str, str, bool]] = []

    semantic = []
    for page in html_files:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        relative = page.relative_to(ROOT)
        public = not {'admin','track','templates'}.intersection(relative.parts)
        if public:
            if parser.lang != 'en': semantic.append(f'{relative}: expected lang=en')
            if parser.headings.count(1) != 1: semantic.append(f'{relative}: expected one H1')
            previous = 0
            for level in parser.headings:
                if level > previous + 1: semantic.append(f'{relative}: skipped heading level')
                previous = level
            for image, line in parser.images:
                if not all(key in image for key in ('alt','width','height','decoding')):
                    semantic.append(f'{relative}:{line}: missing image attributes')
            for link, line in parser.external:
                if link.get('target') != '_blank' or not {'noopener','noreferrer'}.issubset(set((link.get('rel') or '').split())):
                    semantic.append(f'{relative}:{line}: external link attributes')
        seen: dict[str, list[int]] = {}
        for value, line in parser.ids:
            seen.setdefault(value, []).append(line)
        for value, lines in seen.items():
            if len(lines) > 1:
                duplicate_ids.append((str(page.relative_to(ROOT)), value, lines))

        metadata.append((str(page.relative_to(ROOT)), parser.title, bool(parser.description)))
        for attr, ref, line in parser.refs:
            if 'templates/' in str(page.relative_to(ROOT)) and 'replace-with-url-slug' in ref:
                continue
            parsed = urlparse(ref)
            if public and attr == 'href' and parsed.fragment and not parsed.scheme and not parsed.netloc:
                anchor_page = resolve_local(page, ref) if parsed.path else page
                if anchor_page and anchor_page.is_file() and anchor_page.suffix == '.html':
                    target_parser = PageParser()
                    target_parser.feed(anchor_page.read_text(encoding='utf-8'))
                    if unquote(parsed.fragment) not in {value for value, _ in target_parser.ids}:
                        semantic.append(f'{relative}:{line}: missing anchor {ref}')
            target = resolve_local(page, ref)
            if target is not None and not target.exists():
                missing.append((str(page.relative_to(ROOT)), line, attr, ref))

    print("HTML files:", len(html_files))
    print("Missing local references:", len(missing))
    for page, line, attr, ref in missing:
        print(f"  {page}:{line} {attr}={ref}")
    print("Duplicate IDs:", len(duplicate_ids))
    for page, value, lines in duplicate_ids:
        print(f"  {page}: id={value!r} lines={lines}")
    print("Pages without title:", sum(not title for _, title, _ in metadata))
    print("Pages without meta description:", sum(not has_description for _, _, has_description in metadata))
    for page, title, has_description in metadata:
        if not title or not has_description:
            print(f"  {page}: title={title!r}, meta_description={has_description}")

    print('Public-page semantics/anchors:', len(semantic))
    for issue in semantic: print('  ' + issue)
    if missing or duplicate_ids or semantic:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
