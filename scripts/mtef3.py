"""Equation Editor 3 / MTEF v3 → LaTeX.

The record tag is a single byte: high nibble = options, low nibble = type.
Spec follows the public MathType MTEF notes and the jure/mathtype v3 layouts.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field

END, LINE, CHAR, TMPL, PILE, MATRIX, EMBELL, RULER = range(8)
FONT, SIZE, FULL, SUB, SUB2, SYM, SUBSYM = range(8, 15)

OPT_NULL = 0x1
OPT_RULER = 0x2
OPT_EMBELL = 0x2
OPT_LSPACE = 0x4
OPT_NUDGE = 0x8

FN_TEXT = 1
FN_FUNCTION = 2
FN_VARIABLE = 3
FN_LCGREEK = 4
FN_UCGREEK = 5
FN_SYMBOL = 6
FN_VECTOR = 7
FN_NUMBER = 8


class ParseError(Exception):
    pass


@dataclass
class Node:
    kind: str
    data: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Reader:
    def __init__(self, data: bytes):
        self.data = data
        self.i = 0

    def remaining(self) -> int:
        return len(self.data) - self.i

    def u8(self) -> int:
        if self.i >= len(self.data):
            raise ParseError("eof u8")
        v = self.data[self.i]
        self.i += 1
        return v

    def i8(self) -> int:
        v = self.u8()
        return v - 256 if v >= 128 else v

    def u16(self) -> int:
        if self.i + 2 > len(self.data):
            raise ParseError("eof u16")
        v = self.data[self.i] | (self.data[self.i + 1] << 8)
        self.i += 2
        return v

    def zstr(self) -> str:
        start = self.i
        while self.i < len(self.data) and self.data[self.i] != 0:
            self.i += 1
        raw = self.data[start : self.i]
        if self.i < len(self.data):
            self.i += 1
        return raw.decode("latin1", errors="replace")


def _nudge(r: Reader) -> None:
    dx = r.i8()
    dy = r.i8()
    if dx == -128 and dy == -128:
        r.u16()
        r.u16()


def _ruler(r: Reader) -> None:
    n = r.u8()
    for _ in range(n):
        r.u8()
        r.u16()


def _record(r: Reader, trace: bool = False) -> Node | None:
    """Read one named record. None means END (and the end byte is consumed)."""
    tag = r.u8()
    options = (tag >> 4) & 0xF
    rtype = tag & 0xF
    if rtype == END:
        return None
    if options & OPT_NUDGE:
        _nudge(r)

    if rtype == LINE:
        if options & OPT_LSPACE:
            r.u16()
        if options & OPT_RULER:
            _ruler(r)
        children = [] if (options & OPT_NULL) else _list(r)
        return Node("line", {}, children)

    if rtype == CHAR:
        typeface = r.i8() + 128
        mtcode = r.u16()
        embell = _list(r) if (options & OPT_EMBELL) else []
        return Node("char", {"typeface": typeface, "mtcode": mtcode}, embell)

    if rtype == TMPL:
        selector = r.i8()
        variation = r.i8()
        r.u8()  # template-specific options
        slots = _list(r)
        return Node(
            "tmpl",
            {"selector": selector, "variation": variation},
            slots,
        )

    if rtype == PILE:
        r.i8()
        r.i8()
        if options & OPT_RULER:
            _ruler(r)
        return Node("pile", {}, _list(r))

    if rtype == MATRIX:
        r.i8()
        r.i8()
        r.i8()
        rows = r.i8()
        cols = r.i8()
        # partition nibbles, packed low-to-high, padded to a byte
        def skip_parts(nparts: int) -> None:
            bits = (nparts + 1) * 2
            nbytes = (bits + 7) // 8
            for _ in range(nbytes):
                r.u8()

        skip_parts(rows)
        skip_parts(cols)
        return Node("matrix", {"rows": rows, "cols": cols}, _list(r))

    if rtype == EMBELL:
        embell = r.i8()
        r.i8()
        return Node("embell", {"embell": embell})

    if rtype == RULER:
        # named ruler: n_stops already not consumed; options nibble was the header
        # The ruler payload starts at n_stops. If nudge was consumed we're aligned.
        # Re-read is wrong — n_stops is next byte. But we already consumed only
        # the tag (and optional nudge). Good.
        # Wait: we consumed tag. n_stops follows.
        # However if we already called nothing else, call _ruler which reads n_stops.
        _ruler(r)
        return Node("ruler")

    if rtype == FONT:
        r.i8()
        r.i8()
        r.zstr()
        return Node("font")

    if rtype == SIZE:
        sel = r.i8()
        if sel == 101 or sel == -27:  # 101 as unsigned stored in int8 overflows? 101 fits
            r.u16()
        elif sel == 100:
            r.u8()
            r.u16()
        else:
            r.u8()
        return Node("size")

    if rtype in (FULL, SUB, SUB2, SYM, SUBSYM):
        return Node("skip", {"rtype": rtype})

    raise ParseError(f"unknown record type {rtype} options {options:#x} at {r.i}")


def _list(r: Reader) -> list[Node]:
    nodes = []
    while True:
        if r.remaining() <= 0:
            break
        node = _record(r)
        if node is None:
            break
        nodes.append(node)
    return nodes


def parse_mtef3(body: bytes) -> list[Node]:
    if not body or body[0] != 3:
        raise ParseError("not mtef v3")
    r = Reader(body)
    # 5-byte header
    for _ in range(5):
        r.u8()
    return _list(r)


# --- LaTeX ---

_MT = {
    0x002D: "-",
    0x2212: "-",
    0x00D7: r"\times ",
    0x00F7: r"\div ",
    0x00B1: r"\pm ",
    0x2213: r"\mp ",
    0x2264: r"\le ",
    0x2265: r"\ge ",
    0x2266: r"\le ",
    0x2267: r"\ge ",
    0x2260: r"\ne ",
    0x2261: r"\equiv ",
    0x2248: r"\approx ",
    0x223C: r"\sim ",
    0x223D: r"\sim ",
    0x221E: r"\infty ",
    0x00B0: r"^{\circ}",
    0x2220: r"\angle ",
    0x25B3: r"\triangle ",
    0x2206: r"\Delta ",
    0x22A5: r"\perp ",
    0x2225: r"\parallel ",
    0x2226: r"\nparallel ",
    0x2234: r"\therefore ",
    0x2235: r"\because ",
    0x00B7: r"\cdot ",
    0x22C5: r"\cdot ",
    0x2032: "'",
    0x2033: "''",
    0x2026: r"\ldots ",
    0x22EF: r"\cdots ",
    0x00A0: r"\ ",
    0x2002: r"\ ",
    0x2003: r"\ ",
    0x2009: r"\,",
    0x2061: "",
    0x2062: "",
    0x2063: "",
    0x2064: "",
    0x2218: r"\circ ",
    0x00AC: r"\neg ",
    0x2227: r"\land ",
    0x2228: r"\lor ",
    0x2229: r"\cap ",
    0x222A: r"\cup ",
    0x2208: r"\in ",
    0x2209: r"\notin ",
    0x2282: r"\subset ",
    0x2286: r"\subseteq ",
    0x2200: r"\forall ",
    0x2203: r"\exists ",
    0x2192: r"\rightarrow ",
    0x2190: r"\leftarrow ",
    0x21D2: r"\Rightarrow ",
    0x21D4: r"\Leftrightarrow ",
    0x00B2: "^{2}",
    0x00B3: "^{3}",
    0x00B9: "^{1}",
    0x00BC: r"\frac{1}{4}",
    0x00BD: r"\frac{1}{2}",
    0x00BE: r"\frac{3}{4}",
    0x221A: r"\surd ",
    0x222B: r"\int ",
    0x2211: r"\sum ",
    0x220F: r"\prod ",
    0x03B1: r"\alpha ",
    0x03B2: r"\beta ",
    0x03B3: r"\gamma ",
    0x03B4: r"\delta ",
    0x03B5: r"\epsilon ",
    0x03B6: r"\zeta ",
    0x03B7: r"\eta ",
    0x03B8: r"\theta ",
    0x03B9: r"\iota ",
    0x03BA: r"\kappa ",
    0x03BB: r"\lambda ",
    0x03BC: r"\mu ",
    0x03BD: r"\nu ",
    0x03BE: r"\xi ",
    0x03C0: r"\pi ",
    0x03C1: r"\rho ",
    0x03C3: r"\sigma ",
    0x03C4: r"\tau ",
    0x03C6: r"\phi ",
    0x03C6: r"\phi ",
    0x03C7: r"\chi ",
    0x03C8: r"\psi ",
    0x03C9: r"\omega ",
    0x0393: r"\Gamma ",
    0x0394: r"\Delta ",
    0x0398: r"\Theta ",
    0x039B: r"\Lambda ",
    0x039E: r"\Xi ",
    0x03A0: r"\Pi ",
    0x03A3: r"\Sigma ",
    0x03A6: r"\Phi ",
    0x03A8: r"\Psi ",
    0x03A9: r"\Omega ",
    0x226A: r"\ll ",
    0x226B: r"\gg ",
    0x00D7: r"\times ",
    0xF0B0: r"^{\circ}",
    0xF02D: "-",
    0xF0B1: r"\pm ",
    0xF0B4: r"\times ",
    0xF0B8: r"\div ",
    0xF0A3: r"\le ",
    0xF0B3: r"\ge ",
    0xF0B9: r"\ne ",
    0xF070: r"\pi ",
    0xF071: r"\theta ",
    0xF061: r"\alpha ",
    0xF062: r"\beta ",
    0xF067: r"\gamma ",
    0xF044: r"\Delta ",
    0xF0D0: r"\angle ",
    0xF05E: r"\perp ",
    0xF0BD: r"\parallel ",
    0xF0D7: r"\cdot ",
    0xF0A5: r"\infty ",
    0xF0D6: r"\circ ",
    0x20: " ",
}

_EMBELL = {
    2: lambda b: rf"\dot{{{b}}}",
    3: lambda b: rf"\ddot{{{b}}}",
    5: lambda b: f"{b}'",
    6: lambda b: f"{b}''",
    8: lambda b: rf"\tilde{{{b}}}",
    9: lambda b: rf"\hat{{{b}}}",
    10: lambda b: rf"\not{{{b}}}",
    17: lambda b: rf"\bar{{{b}}}",
    18: lambda b: f"{b}'''",
    29: lambda b: rf"\underline{{{b}}}",
    30: lambda b: rf"\underset{{\sim}}{{{b}}}",
}

_FENCES = {
    0: (r"\langle ", r"\rangle "),
    1: ("(", ")"),
    2: (r"\{", r"\}"),
    3: ("[", "]"),
    4: ("|", "|"),
    5: (r"\|", r"\|"),
    6: (r"\lfloor ", r"\rfloor "),
    7: (r"\lceil ", r"\rceil "),
}


def _slot(node: Node) -> str:
    if node.kind == "line":
        return _line(node.children)
    if node.kind == "pile":
        parts = [_slot(c) if c.kind != "line" else _line(c.children) for c in node.children]
        parts = [p for p in parts if p.strip()]
        if len(parts) <= 1:
            return parts[0] if parts else ""
        return r"\begin{gathered} " + r" \\ ".join(parts) + r" \end{gathered}"
    return _emit(node)


def _line(nodes: list[Node]) -> str:
    parts: list[str] = []
    text_buf: list[str] = []
    func_buf: list[str] = []

    def flush_text() -> None:
        if text_buf:
            word = "".join(text_buf)
            text_buf.clear()
            if word.strip():
                parts.append(r"\text{" + word.replace("\\", "") + "}")

    def flush_func() -> None:
        if func_buf:
            name = "".join(func_buf)
            func_buf.clear()
            op = {
                "sin": r"\sin ",
                "cos": r"\cos ",
                "tan": r"\tan ",
                "cot": r"\cot ",
                "sec": r"\sec ",
                "csc": r"\csc ",
                "log": r"\log ",
                "ln": r"\ln ",
                "lg": r"\lg ",
                "lim": r"\lim ",
                "max": r"\max ",
                "min": r"\min ",
            }.get(name, r"\operatorname{" + name + "} ")
            parts.append(op)

    for node in nodes:
        if node.kind == "char" and node.data.get("typeface") == FN_TEXT and not node.children:
            flush_func()
            ch = _char_text(node.data["mtcode"])
            text_buf.append(ch)
            continue
        if node.kind == "char" and node.data.get("typeface") == FN_FUNCTION and not node.children:
            ch = _char_text(node.data["mtcode"])
            if ch.isalpha():
                flush_text()
                func_buf.append(ch)
                continue
        flush_text()
        flush_func()
        if node.kind == "skip":
            continue
        if node.kind == "tmpl" and node.data.get("selector") in (15, 44):
            parts.append(_script(node, has_base=any(p.strip() for p in parts)))
            continue
        parts.append(_emit(node))
    flush_text()
    flush_func()
    return "".join(parts)


def _char_text(code: int) -> str:
    if code in _MT and _MT[code] not in (" ", r"\ ", r"\,"):
        # keep textual letters as letters
        if 32 <= code < 127:
            return chr(code)
        return ""
    if 32 <= code < 127:
        return chr(code)
    try:
        return chr(code)
    except ValueError:
        return ""


def _char_math(node: Node) -> str:
    code = node.data["mtcode"]
    face = node.data.get("typeface", 0)
    # Equation Editor space/marker glyphs (and unmapped private-use).
    if face in (23, 24) or 0xE000 <= code <= 0xF8FF and code not in _MT:
        return ""
    if face == FN_VECTOR:
        base = _char_math(Node("char", {"mtcode": code, "typeface": FN_VARIABLE}))
        latex = rf"\vec{{{base.strip()}}}"
    elif code in _MT:
        latex = _MT[code]
    elif code in (0x7B, 0x7D):
        latex = r"\{" if code == 0x7B else r"\}"
    elif 32 <= code < 127:
        latex = chr(code)
    else:
        try:
            latex = chr(code)
        except ValueError:
            latex = ""
    for emb in node.children:
        if emb.kind == "embell":
            fn = _EMBELL.get(emb.data.get("embell"))
            if fn:
                latex = fn(latex.strip() or latex)
    return latex


def _line_nodes(nodes: list[Node]) -> list[Node]:
    return [n for n in nodes if n.kind == "line"]


def _nonempty_slot(node: Node) -> str:
    text = _slot(node).strip()
    return text


def _script(node: Node, has_base: bool) -> str:
    """Selector 15/44 stores [subscript line, superscript line], either may be empty.

    A script with no preceding atom is a size wrapper (common in denominators),
    so its characters stay on the baseline.
    """
    lines = _line_nodes(node.children)
    sub = _nonempty_slot(lines[0]) if len(lines) > 0 else ""
    sup = _nonempty_slot(lines[1]) if len(lines) > 1 else ""
    if not has_base:
        return sub or sup
    out = ""
    if sub:
        out += "_{" + sub + "}"
    if sup:
        out += "^{" + sup + "}"
    return out


def _fence(selector: int, variation: int, slots: list[Node]) -> str:
    left, right = _FENCES.get(selector, ("(", ")"))
    # variation 0 both, 1 left only, 2 right only (gem table)
    if variation == 1:
        right = "."
    elif variation == 2:
        left = "."
    inner = _slot(slots[0]) if slots else ""
    return rf"\left{left} {inner} \right{right}"


def _tmpl(node: Node) -> str:
    sel = node.data["selector"]
    var = node.data["variation"]
    slots = node.children

    def s(i: int) -> str:
        if i >= len(slots):
            return ""
        return _slot(slots[i])

    if sel in _FENCES or sel in (8, 9, 10, 11, 12):
        lines = _line_nodes(slots)
        chars = [c for c in slots if c.kind == "char"]
        inner = _slot(lines[0]) if lines else ""
        if len(chars) >= 2:
            left = _char_math(chars[0]).strip() or "."
            right = _char_math(chars[-1]).strip() or "."
            return rf"\left{left} {inner} \right{right}"
        return _fence(1 if sel >= 8 else sel, 0 if sel >= 8 else var, lines or slots)
    if sel == 13:  # root: radicand, then optional degree
        lines = _line_nodes(slots)
        rad = _nonempty_slot(lines[0]) if lines else ""
        degree = _nonempty_slot(lines[1]) if len(lines) > 1 else ""
        if degree:
            return rf"\sqrt[{degree}]{{ {rad} }}"
        return rf"\sqrt{{ {rad} }}"
    if sel in (14, 41):  # fraction / slash fraction
        if sel == 41:
            return rf"{s(0)}/{s(1)}"
        return rf"\frac{{ {s(0)} }}{{ {s(1)} }}"
    if sel in (15, 44):  # scripts. variation 0 sup, 1 sub, 2 subsup
        # Slots are the scripts. Base is the preceding atom — caller attaches.
        if var == 0:
            return "^{" + s(0) + "}"
        if var == 1:
            return "_{" + s(0) + "}"
        if var == 2:
            return "_{" + s(0) + "}^{" + s(1) + "}"
        # some files store base as slot 0
        if len(slots) >= 2 and var in (0, 1):
            return s(0) + ("^{" if var == 0 else "_{") + s(1) + "}"
        return s(0)
    if sel in (16, 17):  # under/over bar
        inner = s(0)
        return rf"\underline{{ {inner} }}" if sel == 16 else rf"\overline{{ {inner} }}"
    if sel in (27, 28):  # horizontal brace
        return rf"\overbrace{{ {s(0)} }}" if var == 0 else rf"\underbrace{{ {s(0)} }}"
    if sel == 29 or sel == 30:  # sum
        return _bigop(r"\sum ", slots, var)
    if sel in (31, 32):
        return _bigop(r"\prod ", slots, var)
    if sel == 39:
        return _bigop(r"\lim ", slots, var)
    if sel in (21, 22, 23, 24, 25, 26):
        return _bigop(r"\int ", slots, var)
    # fallback: concatenate slots
    return "".join(_slot(c) for c in slots)


def _bigop(op: str, slots: list[Node], variation: int) -> str:
    parts = [_slot(c) for c in slots]
    if not parts:
        return op
    main = parts[0]
    lower = parts[1] if len(parts) > 1 else ""
    upper = parts[2] if len(parts) > 2 else ""
    tex = op
    if lower:
        tex += "_{" + lower + "}"
    if upper:
        tex += "^{" + upper + "}"
    if main and main != lower:
        tex += " " + main
    return tex


def _emit(node: Node) -> str:
    if node.kind == "char":
        return _char_math(node)
    if node.kind == "tmpl":
        return _tmpl(node)
    if node.kind == "line":
        return _line(node.children)
    if node.kind == "pile":
        return _slot(node)
    if node.kind == "matrix":
        cells = [_slot(c) for c in node.children]
        cols = max(1, node.data.get("cols") or 1)
        rows = []
        for i in range(0, len(cells), cols):
            rows.append(" & ".join(cells[i : i + cols]))
        return r"\begin{matrix} " + r" \\ ".join(rows) + r" \end{matrix}"
    return ""


def mtef3_to_latex(body: bytes) -> str:
    nodes = parse_mtef3(body)
    # Drop leading size/full markers; the equation is the line(s).
    lines = [n for n in nodes if n.kind in ("line", "pile", "tmpl", "char", "matrix")]
    if not lines:
        return ""
    if len(lines) == 1:
        latex = _slot(lines[0]) if lines[0].kind != "char" else _char_math(lines[0])
    else:
        latex = "".join(_slot(n) if n.kind != "char" else _char_math(n) for n in lines)
    latex = " ".join(latex.split())
    return latex


def equation_native_body(raw: bytes) -> bytes:
    if len(raw) < 28:
        raise ParseError("short equation native")
    cb = raw[0] | (raw[1] << 8)
    if cb <= 0 or cb >= len(raw):
        raise ParseError("bad cbHdr")
    return raw[cb:]
