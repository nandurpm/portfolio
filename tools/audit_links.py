# FILE: audit_links.py
# FILE PURPOSE: Read-only static-site audit that checks local references, duplicate IDs, page titles, and meta descriptions across HTML files.

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

class PageParser(HTMLParser):
    """Collect local references, element IDs, and required page metadata."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str, int]] = []
        self.ids: list[tuple[str, int]] = []
        self.title = ""
        self.description = ""
        self._in_title = False
        self._title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        line = self.getpos()[0]
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

    html_files = sorted(ROOT.rglob("*.html"))
    missing: list[tuple[str, int, str, str]] = []
    duplicate_ids: list[tuple[str, str, list[int]]] = []
    metadata: list[tuple[str, str, bool]] = []

    for page in html_files:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
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

    if missing or duplicate_ids:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
