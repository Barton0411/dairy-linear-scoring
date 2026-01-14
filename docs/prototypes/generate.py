#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Generate static UI prototypes for review.

Usage:
  python3 docs/prototypes/generate.py
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "prototypes" / "pages"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 682, 1516

BG = "#F2F8FB"
CARD = "#FFFFFF"
TEXT = "#1C1C1E"
MUTED = "#5F6464"
LINE = "#E0EDF6"
BRAND = "#0087CD"
DANGER = "#EF4444"
SUCCESS = "#278546"
WARNING = "#FF9500"


FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:
                pass
    return ImageFont.load_default()


F12 = load_font(22)
F14 = load_font(26)
F16 = load_font(30)
F18 = load_font(34)
F20 = load_font(38)
F24 = load_font(46)
F40 = load_font(80)


def rounded(draw: ImageDraw.ImageDraw, xy, r: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy, s: str, font, fill=TEXT, anchor="la"):
    draw.text(xy, s, font=font, fill=fill, anchor=anchor)


def tabbar(draw: ImageDraw.ImageDraw, active: str = "home"):
    h = 112
    y0 = H - h
    draw.rectangle((0, y0, W, H), fill="#FFFFFF")
    draw.line((0, y0, W, y0), fill=LINE, width=2)

    items = [("home", "首页"), ("records", "记录"), ("settings", "设置")]
    xs = [W // 6, W // 2, W * 5 // 6]
    for (key, label), x in zip(items, xs):
        on = key == active
        color = BRAND if on else "#979797"

        if key == "home":
            draw.rectangle((x - 14, y0 + 22, x + 14, y0 + 50), outline=color, width=3)
            draw.polygon([(x - 18, y0 + 24), (x, y0 + 10), (x + 18, y0 + 24)], outline=color)
        elif key == "records":
            draw.rectangle((x - 16, y0 + 14, x + 16, y0 + 54), outline=color, width=3)
            draw.line((x - 10, y0 + 28, x + 10, y0 + 28), fill=color, width=3)
            draw.line((x - 10, y0 + 38, x + 10, y0 + 38), fill=color, width=3)
        else:
            draw.line((x - 18, y0 + 20, x + 18, y0 + 20), fill=color, width=3)
            draw.line((x - 18, y0 + 34, x + 18, y0 + 34), fill=color, width=3)
            draw.line((x - 18, y0 + 48, x + 18, y0 + 48), fill=color, width=3)
            draw.ellipse((x - 6, y0 + 14, x + 6, y0 + 26), outline=color, width=3)
            draw.ellipse((x + 4, y0 + 28, x + 16, y0 + 40), outline=color, width=3)
            draw.ellipse((x - 16, y0 + 42, x - 4, y0 + 54), outline=color, width=3)

        text(draw, (x, y0 + 76), label, F12, fill=color, anchor="mm")


def nav(draw: ImageDraw.ImageDraw, title: str, left: str | None = "‹"):
    nav_h = 96
    draw.rectangle((0, 0, W, nav_h), fill="#FFFFFF")
    draw.line((0, nav_h, W, nav_h), fill=LINE, width=2)
    if left:
        text(draw, (28, nav_h // 2 + 6), left, F20, fill=BRAND, anchor="lm")
    text(draw, (W // 2, nav_h // 2 + 6), title, F16, fill=TEXT, anchor="mm")
    return nav_h


def make_base(active: str = "home"):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    tabbar(d, active=active)
    return im, d


def save(im: Image.Image, name: str):
    path = OUT_DIR / name
    im.save(path)
    print("wrote", path)


def draw_card(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int):
    rounded(d, (x, y, x + w, y + h), 20, CARD)
    d.rounded_rectangle((x, y, x + w, y + h), 20, outline=(0, 0, 0, 15), width=1)


def page_home():
    im, d = make_base("home")
    top = nav(d, "奶牛线性评定", left=None)

    x, w = 24, W - 48
    y = top + 22

    # user card
    draw_card(d, x, y, w, 150)
    # avatar
    d.ellipse((x + 22, y + 30, x + 92, y + 100), fill=BRAND)
    text(d, (x + 118, y + 56), "管理员", F16)
    text(d, (x + 118, y + 92), "顶级管理员 · 已认证", F12, fill=MUTED)
    # gear
    rounded(d, (x + w - 74, y + 44, x + w - 24, y + 94), 18, "#F1F2F3")
    text(d, (x + w - 49, y + 70), "⚙", F18, fill=MUTED, anchor="mm")

    y += 170

    # farm card
    draw_card(d, x, y, w, 160)
    text(d, (x + 22, y + 38), "当前牧场", F12, fill=MUTED)
    text(d, (x + w - 22, y + 38), "切换 ›", F12, fill=BRAND, anchor="ra")
    text(d, (x + 22, y + 84), "大明牧场", F16)
    text(d, (x + 22, y + 120), "编号：YQN001", F12, fill=MUTED)

    y += 190

    text(d, (x, y), "开始评分", F14, fill=TEXT)
    y += 18

    for i, (title, desc, icon) in enumerate(
        [
            ("开始评分", "默认分已预填，修改异常性状即可", "▶"),
            ("查看记录", "查看历史评分、导出数据", "📋"),
        ]
    ):
        yy = y + 22 + i * 118
        draw_card(d, x, yy, w, 100)
        rounded(d, (x + 22, yy + 20, x + 82, yy + 80), 16, BRAND)
        text(d, (x + 52, yy + 50), icon, F18, fill="#FFFFFF", anchor="mm")
        text(d, (x + 100, yy + 42), title, F14, fill=TEXT)
        text(d, (x + 100, yy + 70), desc, F12, fill=MUTED)
        text(d, (x + w - 22, yy + 52), "›", F20, fill="#C0C4C7", anchor="rm")

    save(im, "home.png")


def page_login(agreed: bool):
    im, d = make_base("home")
    nav(d, "登录", left=None)
    x, w = 24, W - 48

    text(d, (W // 2, 260), "奶牛线性评定", F24, anchor="mm")
    text(d, (W // 2, 320), "专业的奶牛体型评分工具", F14, fill=MUTED, anchor="mm")

    btn_y = 420
    fill = BRAND if agreed else "#D8E7F2"
    rounded(d, (x, btn_y, x + w, btn_y + 86), 24, fill)
    text(d, (W // 2, btn_y + 43), "微信一键登录", F16, fill="#FFFFFF", anchor="mm")

    # agreement row
    row_y = btn_y + 120
    rounded(d, (x, row_y, x + w, row_y + 110), 20, "#FFFFFF", outline=LINE, width=2)
    d.rectangle((x + 22, row_y + 40, x + 48, row_y + 66), outline=(BRAND if agreed else "#C0C4C7"), width=3)
    if agreed:
        d.line((x + 26, row_y + 54, x + 34, row_y + 62), fill=BRAND, width=3)
        d.line((x + 34, row_y + 62, x + 46, row_y + 44), fill=BRAND, width=3)

    text(d, (x + 62, row_y + 50), "我已阅读并同意《用户协议》和《隐私政策》", F12, fill=MUTED, anchor="lm")

    name = "login.png" if agreed else "login--disabled.png"
    save(im, name)


def page_verify():
    im, d = make_base("home")
    nav(d, "身份认证", left="‹")
    x, w = 24, W - 48
    y = 140
    text(d, (x, y), "请输入姓名与工号", F16)
    text(d, (x, y + 40), "用于验证鉴定员身份", F12, fill=MUTED)
    y += 90
    draw_card(d, x, y, w, 210)
    text(d, (x + 22, y + 40), "姓名", F12, fill=MUTED)
    rounded(d, (x + 22, y + 60, x + w - 22, y + 110), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 85), "管理员", F14, fill=TEXT, anchor="lm")
    text(d, (x + 22, y + 130), "工号", F12, fill=MUTED)
    rounded(d, (x + 22, y + 150, x + w - 22, y + 200), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 175), "10075345", F14, fill=TEXT, anchor="lm")
    y += 240
    rounded(d, (x, y, x + w, y + 86), 24, BRAND)
    text(d, (W // 2, y + 43), "验证并进入", F16, fill="#FFFFFF", anchor="mm")
    save(im, "verify.png")


def page_webview():
    im, d = make_base("home")
    nav(d, "用户协议", left="‹")
    x, w = 24, W - 48
    y = 120
    draw_card(d, x, y, w, H - 280)
    text(d, (x + 22, y + 40), "（本地页面/可离线查看）", F12, fill=MUTED)
    yy = y + 90
    for i in range(14):
        if i in (0, 5, 10):
            text(d, (x + 22, yy), f"第 {i // 5 + 1} 条", F14, fill=TEXT)
            yy += 40
        d.line((x + 22, yy, x + 22 + (w - 44) * (0.86 if i % 3 else 0.66), yy), fill="#D8E7F2", width=6)
        yy += 34
    save(im, "agreement.png")


def page_privacy():
    im, d = make_base("home")
    nav(d, "隐私政策", left="‹")
    x, w = 24, W - 48
    y = 120
    draw_card(d, x, y, w, H - 280)
    text(d, (x + 22, y + 40), "（本地页面/可离线查看）", F12, fill=MUTED)
    yy = y + 90
    for i in range(14):
        if i in (0, 5, 10):
            text(d, (x + 22, yy), f"第 {i // 5 + 1} 节", F14, fill=TEXT)
            yy += 40
        d.line((x + 22, yy, x + 22 + (w - 44) * (0.86 if i % 3 else 0.66), yy), fill="#D8E7F2", width=6)
        yy += 34
    save(im, "privacy.png")


def page_settings_top():
    im, d = make_base("settings")
    nav(d, "设置", left=None)
    x, w = 24, W - 48
    y = 120
    draw_card(d, x, y, w, 240)
    text(d, (x + 22, y + 40), "用户信息", F14, fill=MUTED)
    text(d, (x + 22, y + 92), "鉴定员姓名", F12, fill=MUTED)
    text(d, (x + w - 22, y + 92), "管理员", F12, fill=TEXT, anchor="ra")
    text(d, (x + 22, y + 132), "工号", F12, fill=MUTED)
    text(d, (x + w - 22, y + 132), "10075345", F12, fill=TEXT, anchor="ra")
    text(d, (x + 22, y + 172), "角色", F12, fill=MUTED)
    text(d, (x + w - 22, y + 172), "顶级管理员", F12, fill=TEXT, anchor="ra")
    text(d, (x + 22, y + 212), "认证状态", F12, fill=MUTED)
    text(d, (x + w - 22, y + 212), "已认证", F12, fill=SUCCESS, anchor="ra")

    y += 260
    draw_card(d, x, y, w, 240)
    text(d, (x + 22, y + 40), "其他默认值", F14, fill=MUTED)
    text(d, (x + 22, y + 96), "印象分默认值", F12, fill=MUTED)
    rounded(d, (x + w - 170, y + 78, x + w - 22, y + 114), 16, "#F1F2F3")
    text(d, (x + w - 44, y + 96), "85", F12, fill=TEXT, anchor="ra")

    text(d, (x + 22, y + 160), "乳房空满默认值", F12, fill=MUTED)
    rounded(d, (x + w - 170, y + 142, x + w - 22, y + 178), 16, "#F1F2F3")
    text(d, (x + w - 44, y + 160), "空", F12, fill=TEXT, anchor="ra")
    save(im, "settings.png")


def page_settings_trait_defaults_1():
    im, d = make_base("settings")
    nav(d, "设置", left=None)
    x, w = 24, W - 48
    y = 120

    def traits_card(title: str, rows):
        nonlocal y
        row_h = 56
        header_h = 58
        pad = 18
        h = header_h + len(rows) * row_h + pad
        draw_card(d, x, y, w, h)
        text(d, (x + 22, y + 34), title, F14, fill=BRAND, anchor="lm")
        yy = y + header_h
        for idx, (name, val) in enumerate(rows):
            text(d, (x + 22, yy + row_h // 2), name, F14, fill=TEXT, anchor="lm")
            rounded(d, (x + w - 96, yy + 12, x + w - 22, yy + row_h - 12), 16, "#F1F2F3")
            text(d, (x + w - 59, yy + row_h // 2), str(val), F14, fill=TEXT, anchor="mm")
            if idx != len(rows) - 1:
                d.line((x + 22, yy + row_h, x + w - 22, yy + row_h), fill=LINE, width=2)
            yy += row_h
        y += h + 16

    traits_card("体躯容量 (18%)", [("体高", 5), ("胸宽", 5), ("体深", 5), ("腰强度", 5)])
    traits_card("尻部 (10%)", [("尻角度", 5), ("尻宽", 5)])
    traits_card("肢蹄 (20%)", [("蹄角度", 5), ("蹄踵深度", 5), ("骨质地", 5), ("后肢侧视", 5), ("后肢后视", 5)])

    save(im, "settings--trait-defaults-1.png")


def page_settings_trait_defaults_2():
    im, d = make_base("settings")
    nav(d, "设置", left=None)
    x, w = 24, W - 48
    y = 120

    def traits_card(title: str, rows):
        nonlocal y
        row_h = 56
        header_h = 58
        pad = 18
        h = header_h + len(rows) * row_h + pad
        draw_card(d, x, y, w, h)
        text(d, (x + 22, y + 34), title, F14, fill=BRAND, anchor="lm")
        yy = y + header_h
        for idx, (name, val) in enumerate(rows):
            text(d, (x + 22, yy + row_h // 2), name, F14, fill=TEXT, anchor="lm")
            rounded(d, (x + w - 96, yy + 12, x + w - 22, yy + row_h - 12), 16, "#F1F2F3")
            text(d, (x + w - 59, yy + row_h // 2), str(val), F14, fill=TEXT, anchor="mm")
            if idx != len(rows) - 1:
                d.line((x + 22, yy + row_h, x + w - 22, yy + row_h), fill=LINE, width=2)
            yy += row_h
        y += h + 16

    traits_card(
        "泌乳系统 (42%)",
        [
            ("乳房深度", 5),
            ("中央悬韧带", 5),
            ("前乳房附着", 5),
            ("前乳头位置", 5),
            ("前乳头长度", 5),
            ("后乳房附着高度", 5),
            ("后乳房附着宽度", 5),
            ("后乳头位置", 5),
        ],
    )
    traits_card("乳用特征 (10%)", [("棱角性", 5)])
    save(im, "settings--trait-defaults-2.png")


def page_settings_threshold():
    im, d = make_base("settings")
    nav(d, "设置", left=None)
    x, w = 24, W - 48
    y = 120
    draw_card(d, x, y, w, 520)
    text(d, (x + 22, y + 40), "拍照设置", F14, fill=MUTED)
    # radio list
    yy = y + 86
    for label, active in [("不做限制（推荐）", False), ("根据分数阈值", True), ("从不拍照", False)]:
        cx, cy = x + 34, yy + 16
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), outline=(BRAND if active else "#C0C4C7"), width=3)
        if active:
            d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=BRAND)
        text(d, (x + 58, yy + 16), label, F14, fill=TEXT, anchor="lm")
        yy += 56

    d.line((x + 22, y + 210, x + w - 22, y + 210), fill=LINE, width=2)
    text(d, (x + 22, y + 244), "阈值设定", F14, fill=MUTED)

    text(d, (x + 22, y + 288), "优秀牛只阈值（≥）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 310, x + w - 22, y + 364), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + w - 44, y + 338), "85", F14, fill=TEXT, anchor="ra")

    text(d, (x + 22, y + 386), "较差牛只阈值（≤）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 408, x + w - 22, y + 462), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + w - 44, y + 436), "65", F14, fill=TEXT, anchor="ra")

    save(im, "settings--threshold.png")


def page_team_info():
    im, d = make_base("settings")
    nav(d, "团队信息", left="‹")
    x, w = 24, W - 48
    y = 120
    draw_card(d, x, y, w, 150)
    text(d, (x + 22, y + 46), "管理员", F14, fill=TEXT)
    rounded(d, (x + 150, y + 36, x + 260, y + 66), 16, "#E0EDF6")
    text(d, (x + 205, y + 51), "super_admin", F12, fill=BRAND, anchor="mm")
    text(d, (x + 22, y + 90), "可访问牧场：大明牧场 / 光明牧场 / …", F12, fill=MUTED)
    y += 170
    draw_card(d, x, y, w, 150)
    text(d, (x + 22, y + 46), "张三", F14, fill=TEXT)
    rounded(d, (x + 110, y + 36, x + 200, y + 66), 16, "#F1F2F3")
    text(d, (x + 155, y + 51), "appraiser", F12, fill=MUTED, anchor="mm")
    text(d, (x + 22, y + 90), "可访问牧场：大明牧场", F12, fill=MUTED)
    save(im, "team-info.png")


def page_admin_panel_farm_manage():
    im, d = make_base("settings")
    top = nav(d, "管理后台", left="‹")
    x, w = 24, W - 48
    y = top + 22
    # header
    rounded(d, (0, top, W, top + 140), 0, BRAND)
    text(d, (28, top + 44), "管理后台", F16, fill="#FFFFFF", anchor="lm")
    text(d, (28, top + 88), "顶级管理员", F12, fill="#FFFFFF", anchor="lm")

    # tabs
    tabs_y = top + 140
    rounded(d, (0, tabs_y, W, tabs_y + 72), 0, "#FFFFFF")
    d.line((0, tabs_y + 72, W, tabs_y + 72), fill=LINE, width=2)
    text(d, (W // 6, tabs_y + 36), "鉴定员管理", F12, fill=MUTED, anchor="mm")
    text(d, (W // 2, tabs_y + 36), "牧场匹配", F12, fill=MUTED, anchor="mm")
    text(d, (W * 5 // 6, tabs_y + 36), "牧场管理", F12, fill=BRAND, anchor="mm")
    d.line((W * 5 // 6 - 40, tabs_y + 68, W * 5 // 6 + 40, tabs_y + 68), fill=BRAND, width=4)

    y = tabs_y + 92
    for farm_name, farm_code, dhi in [
        ("大明牧场", "YQN001", "DHI001"),
        ("光明牧场", "YQN002", "DHI002"),
        ("新希望牧场", "YQN003", None),
    ]:
        draw_card(d, x, y, w, 132)
        text(d, (x + 22, y + 40), farm_name, F14, fill=TEXT)
        detail = f"站号：{farm_code}   DHI：{dhi if dhi else '未设置'}"
        text(d, (x + 22, y + 84), detail, F12, fill=(MUTED if dhi else "#FF9500"))
        # manage button (action sheet)
        rounded(d, (x + w - 120, y + 44, x + w - 22, y + 88), 18, "#FFFFFF", outline=(0, 135, 205, 150), width=2)
        text(d, (x + w - 71, y + 66), "管理", F12, fill=BRAND, anchor="mm")
        y += 152

    save(im, "admin-panel.png")


def page_farm_select():
    im, d = make_base("home")
    top = nav(d, "选择牧场", left="‹")
    x, w = 24, W - 48
    y = top + 18

    text(d, (x, y + 18), "选择工作牧场", F16, fill=TEXT)
    text(d, (x, y + 52), "请选择您要评分的牧场", F12, fill=MUTED)

    y += 88
    draw_card(d, x, y, w, 76)
    text(d, (x + 22, y + 38), "🔍  搜索牧场名称或站号", F12, fill="#9AA3A6", anchor="lm")
    y += 96

    for idx, (name, code, dhi, active) in enumerate(
        [
            ("大明牧场", "YQN001", "DHI001", True),
            ("光明牧场", "YQN002", "DHI002", False),
            ("新希望牧场", "YQN003", None, False),
        ]
    ):
        draw_card(d, x, y, w, 118)
        text(d, (x + 22, y + 40), name, F14, fill=TEXT)
        detail = f"站号: {code}   " + (f"DHI: {dhi}" if dhi else "DHI编号未设置")
        text(d, (x + 22, y + 82), detail, F12, fill=(MUTED if dhi else "#FF9500"))
        if active:
            rounded(d, (x + w - 66, y + 36, x + w - 22, y + 82), 16, "#E8F4FB")
            text(d, (x + w - 44, y + 59), "✓", F16, fill=BRAND, anchor="mm")
        else:
            text(d, (x + w - 28, y + 58), "›", F20, fill="#C0C4C7", anchor="rm")
        y += 136

    text(d, (x, H - 240), "* DHI编号用于导出荷斯坦协会版数据", F12, fill=MUTED)
    rounded(d, (x, H - 188, x + w, H - 118), 24, BRAND)
    text(d, (W // 2, H - 153), "+ 新建牧场", F16, fill="#FFFFFF", anchor="mm")

    save(im, "farm-select.png")


def page_farm_create():
    im, d = make_base("home")
    top = nav(d, "新建牧场", left="‹")
    x, w = 24, W - 48
    y = top + 18

    text(d, (x, y + 18), "新建牧场", F16, fill=TEXT)
    text(d, (x, y + 52), "填写牧场基本信息", F12, fill=MUTED)
    y += 88

    draw_card(d, x, y, w, 420)
    text(d, (x + 22, y + 46), "牧场名称（必填）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 66, x + w - 22, y + 120), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 93), "请输入牧场名称", F12, fill="#9AA3A6", anchor="lm")

    text(d, (x + 22, y + 154), "伊起牛站号（必填）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 174, x + w - 22, y + 228), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 201), "如 YQN001", F12, fill="#9AA3A6", anchor="lm")
    text(d, (x + 22, y + 250), "* 站号必须唯一，建议格式：YQN001", F12, fill=MUTED)

    text(d, (x + 22, y + 296), "DHI编号（可选）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 316, x + w - 22, y + 370), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 343), "请输入DHI编号", F12, fill="#9AA3A6", anchor="lm")
    text(d, (x + 22, y + 392), "* 用于导出荷斯坦协会版数据", F12, fill=MUTED)

    rounded(d, (x, H - 190, x + w, H - 110), 24, BRAND)
    text(d, (W // 2, H - 150), "创建牧场", F16, fill="#FFFFFF", anchor="mm")
    save(im, "farm-create.png")


def page_scoring_info():
    im, d = make_base("home")
    top = nav(d, "牛只信息", left="‹")
    x, w = 24, W - 48
    y = top + 22

    draw_card(d, x, y, w, 520)
    text(d, (x + 22, y + 46), "当前牧场", F12, fill=MUTED)
    rounded(d, (x + 22, y + 66, x + w - 22, y + 120), 16, "#F2F8FB")
    text(d, (x + 44, y + 93), "大明牧场", F14, fill=TEXT, anchor="lm")

    text(d, (x + 22, y + 154), "提示", F12, fill=MUTED)
    rounded(d, (x + 22, y + 174, x + w - 22, y + 248), 16, "#F9FAFB")
    text(d, (x + 44, y + 210), "未修改的性状将使用默认分，可在设置中调整。", F12, fill=MUTED, anchor="lm")

    text(d, (x + 22, y + 284), "牛号（耳号）", F12, fill=MUTED)
    rounded(d, (x + 22, y + 304, x + w - 22, y + 358), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 331), "213134", F14, fill=TEXT, anchor="lm")

    text(d, (x + 22, y + 392), "胎次", F12, fill=MUTED)
    rounded(d, (x + 22, y + 412, x + w - 22, y + 466), 16, "#FFFFFF", outline=LINE, width=2)
    text(d, (x + 44, y + 439), "1", F14, fill=TEXT, anchor="lm")

    rounded(d, (x, H - 190, x + w, H - 110), 34, BRAND)
    text(d, (W // 2, H - 150), "开始评分", F16, fill="#FFFFFF", anchor="mm")
    save(im, "info.png")


def page_scoring_unified():
    im, d = make_base("home")
    top = nav(d, "评分", left="‹")
    x, w = 24, W - 48
    y = top + 18

    # header card
    draw_card(d, x, y, w, 150)
    text(d, (x + 22, y + 50), "牛号 213134", F14, fill=TEXT)
    text(d, (x + 22, y + 86), "胎次 1", F12, fill=MUTED)
    text(d, (x + w - 22, y + 60), "81", F24, fill=BRAND, anchor="ra")
    text(d, (x + w - 22, y + 102), "GP", F14, fill=BRAND, anchor="ra")
    y += 170

    # extra section
    draw_card(d, x, y, w, 150)
    text(d, (x + 22, y + 46), "印象分", F12, fill=MUTED)
    rounded(d, (x + w - 170, y + 26, x + w - 22, y + 68), 18, "#F1F2F3")
    text(d, (x + w - 44, y + 46), "85", F12, fill=TEXT, anchor="ra")
    text(d, (x + 22, y + 104), "乳房空满", F12, fill=MUTED)
    rounded(d, (x + w - 170, y + 84, x + w - 22, y + 126), 18, "#E8F4FB")
    text(d, (x + w - 44, y + 104), "空 / 满", F12, fill=BRAND, anchor="ra")
    y += 170

    # category (expanded)
    draw_card(d, x, y, w, 410)
    text(d, (x + 22, y + 40), "体躯容量 (18%)", F14, fill=TEXT)
    text(d, (x + w - 22, y + 40), "已修改 1 项", F12, fill="#FF9500", anchor="ra")
    d.line((x + 22, y + 64, x + w - 22, y + 64), fill=LINE, width=2)

    def trait_row(yy: int, name: str, score: int, modified: bool = False):
        text(d, (x + 22, yy + 26), name, F14, fill=BRAND if modified else TEXT, anchor="lm")
        rounded(d, (x + w - 96, yy + 10, x + w - 22, yy + 44), 16, "#F2F8FB")
        score_color = WARNING if modified else BRAND
        text(d, (x + w - 59, yy + 27), str(score), F14, fill=score_color, anchor="mm")
        d.line((x + 22, yy + 56, x + w - 22, yy + 56), fill=LINE, width=2)

    trait_row(y + 78, "体高", 5, modified=False)
    trait_row(y + 134, "胸宽", 5, modified=False)
    trait_row(y + 190, "体深", 5, modified=False)
    trait_row(y + 246, "腰强度", 3, modified=True)

    # footer buttons (simplified)
    rounded(d, (x, H - 192, x + 300, H - 110), 24, "#EEF0F2")
    text(d, (x + 150, H - 151), "全部恢复默认分", F12, fill=MUTED, anchor="mm")
    rounded(d, (x + 320, H - 192, x + w, H - 110), 24, BRAND)
    text(d, (x + 320 + (w - 320) // 2, H - 151), "下一步", F16, fill="#FFFFFF", anchor="mm")

    save(im, "unified.png")


def page_diagram_modal(loaded: bool):
    # background: use the scoring page as base
    im, d = make_base("home")
    nav(d, "评分", left="‹")
    # dim mask
    mask = Image.new("RGBA", (W, H), (0, 0, 0, 140))
    im_rgba = im.convert("RGBA")
    im_rgba.alpha_composite(mask)
    d = ImageDraw.Draw(im_rgba)

    # modal
    mw, mh = W - 120, 520
    mx, my = (W - mw) // 2, 430
    rounded(d, (mx, my, mx + mw, my + mh), 20, "#FFFFFF")
    d.rounded_rectangle((mx, my, mx + mw, my + mh), 20, outline=(0, 0, 0, 18), width=1)
    text(d, (mx + 22, my + 40), "体高", F14, fill=TEXT, anchor="lm")
    text(d, (mx + mw - 22, my + 40), "×", F18, fill=MUTED, anchor="ra")

    # image area
    rounded(d, (mx + 22, my + 84, mx + mw - 22, my + mh - 22), 16, "#F2F8FB")
    if loaded:
        # draw a simple "loaded image" placeholder
        d.line((mx + 60, my + 150, mx + mw - 60, my + 150), fill="#D8E7F2", width=10)
        d.line((mx + 60, my + 220, mx + mw - 120, my + 220), fill="#D8E7F2", width=10)
        d.line((mx + 60, my + 290, mx + mw - 160, my + 290), fill="#D8E7F2", width=10)
        text(d, (W // 2, my + 360), "示意图已加载", F12, fill=MUTED, anchor="mm")
    else:
        text(d, (W // 2, my + 300), "示意图区域", F12, fill=MUTED, anchor="mm")

    out = im_rgba.convert("RGB")
    save(out, "diagram-modal--loaded.png" if loaded else "diagram-modal.png")


def page_photo(with_images: bool):
    im, d = make_base("home")
    top = nav(d, "拍照", left="‹")
    x, w = 24, W - 48
    y = top + 18

    text(d, (x, y + 18), "拍照记录", F16, fill=TEXT)
    text(d, (x, y + 52), "可拍摄 5 张照片记录牛只体型", F12, fill=MUTED)
    y += 88

    # grid
    cols = 3
    gap = 14
    size = (w - gap * (cols - 1)) // cols
    gx, gy = x, y

    filled = 4 if with_images else 0
    for i in range(6):
        cx = gx + (i % cols) * (size + gap)
        cy = gy + (i // cols) * (size + gap)
        rounded(d, (cx, cy, cx + size, cy + size), 18, "#FFFFFF", outline=LINE, width=2)
        if i < filled:
            rounded(d, (cx + 10, cy + 10, cx + size - 10, cy + size - 10), 14, "#E8F4FB")
            text(d, (cx + size // 2, cy + size // 2), "照片", F12, fill=BRAND, anchor="mm")
        else:
            text(d, (cx + size // 2, cy + size // 2), "＋", F24, fill="#9AA3A6", anchor="mm")

    # footer buttons
    rounded(d, (x, H - 192, x + 300, H - 110), 24, "#EEF0F2")
    text(d, (x + 150, H - 151), "跳过", F16, fill=MUTED, anchor="mm")
    rounded(d, (x + 320, H - 192, x + w, H - 110), 24, BRAND)
    text(d, (x + 320 + (w - 320) // 2, H - 151), "完成", F16, fill="#FFFFFF", anchor="mm")

    save(im, "photo--with-images.png" if with_images else "photo.png")


def page_result():
    im, d = make_base("home")
    top = nav(d, "评分结果", left="‹")
    x, w = 24, W - 48
    y = top + 18

    rounded(d, (x, y, x + w, y + 260), 20, BRAND)
    text(d, (x + 22, y + 44), "牛号 213134", F12, fill="#FFFFFF", anchor="lm")
    text(d, (x + 22, y + 80), "胎次 1", F12, fill="#FFFFFF", anchor="lm")
    text(d, (W // 2, y + 140), "81", F40, fill="#FFFFFF", anchor="mm")
    text(d, (W // 2 + 90, y + 148), "GP", F18, fill="#FFFFFF", anchor="lm")

    y += 286
    draw_card(d, x, y, w, 120)
    text(d, (x + 22, y + 46), "操作", F12, fill=MUTED)
    rounded(d, (x + 22, y + 66, x + w - 22, y + 106), 18, BRAND)
    text(d, (W // 2, y + 86), "提交并继续评分", F14, fill="#FFFFFF", anchor="mm")
    save(im, "result.png")


def page_records_list():
    im, d = make_base("records")
    nav(d, "评分记录", left=None)
    x, w = 24, W - 48
    y = 120

    draw_card(d, x, y, w, 140)
    text(d, (x + 22, y + 30), "统计", F12, fill=MUTED)
    text(d, (x + w - 22, y + 30), "筛选/操作", F12, fill=BRAND, anchor="ra")
    text(d, (x + 70, y + 90), "总记录\n12", F12, fill=MUTED, anchor="mm")
    text(d, (x + w // 2, y + 90), "我的\n6", F12, fill=MUTED, anchor="mm")
    text(d, (x + w - 70, y + 90), "待同步\n1", F12, fill=MUTED, anchor="mm")

    y += 164
    draw_card(d, x, y, w, 140)
    text(d, (x + 22, y + 46), "耳号 213134", F14, fill=TEXT)
    text(d, (x + 22, y + 88), "2025-12-31 00:10  ·  管理员", F12, fill=MUTED)
    text(d, (x + w - 22, y + 60), "81", F18, fill=BRAND, anchor="ra")
    text(d, (x + w - 22, y + 96), "GP", F12, fill=SUCCESS, anchor="ra")
    save(im, "records-list.png")


def page_records_detail():
    im, d = make_base("records")
    top = nav(d, "记录详情", left="‹")
    x, w = 24, W - 48
    y = top + 18

    draw_card(d, x, y, w, 170)
    text(d, (x + 22, y + 46), "耳号 213134", F14, fill=TEXT)
    text(d, (x + 22, y + 86), "牧场：大明牧场（YQN001）", F12, fill=MUTED)
    text(d, (x + 22, y + 122), "时间：2025-12-31 00:10", F12, fill=MUTED)
    text(d, (x + w - 22, y + 68), "81", F18, fill=BRAND, anchor="ra")
    text(d, (x + w - 22, y + 98), "GP", F12, fill=SUCCESS, anchor="ra")
    y += 190

    draw_card(d, x, y, w, 380)
    text(d, (x + 22, y + 40), "性状分", F12, fill=MUTED)
    yy = y + 78
    rows = [("体高", 5), ("胸宽", 5), ("体深", 5), ("腰强度", 3), ("棱角性", 5)]
    for idx, (name, val) in enumerate(rows):
        text(d, (x + 22, yy + 22), name, F14, fill=TEXT, anchor="lm")
        text(d, (x + w - 22, yy + 22), str(val), F14, fill=BRAND, anchor="ra")
        if idx != len(rows) - 1:
            d.line((x + 22, yy + 44, x + w - 22, yy + 44), fill=LINE, width=2)
        yy += 56
    save(im, "records-detail.png")


def page_records_export_sheet():
    # base list page + action sheet
    im, d = make_base("records")
    nav(d, "评分记录", left=None)

    mask = Image.new("RGBA", (W, H), (0, 0, 0, 120))
    im_rgba = im.convert("RGBA")
    im_rgba.alpha_composite(mask)
    d = ImageDraw.Draw(im_rgba)

    sheet_h = 320
    y0 = H - 112 - sheet_h
    rounded(d, (0, y0, W, y0 + sheet_h), 24, "#FFFFFF")
    text(d, (W // 2, y0 + 44), "选择导出版本", F14, fill=TEXT, anchor="mm")
    for i, label in enumerate(["荷斯坦协会版", "常规版"]):
        yy = y0 + 86 + i * 92
        rounded(d, (24, yy, W - 24, yy + 76), 18, "#F2F8FB")
        text(d, (W // 2, yy + 38), label, F14, fill=BRAND if i == 0 else TEXT, anchor="mm")

    rounded(d, (24, y0 + 270, W - 24, y0 + 270 + 76), 18, "#EEF0F2")
    text(d, (W // 2, y0 + 308), "取消", F14, fill=MUTED, anchor="mm")

    out = im_rgba.convert("RGB")
    save(out, "records--export-sheet.png")


def page_records_export_path():
    # base list page + modal with file path
    im, d = make_base("records")
    nav(d, "评分记录", left=None)

    mask = Image.new("RGBA", (W, H), (0, 0, 0, 120))
    im_rgba = im.convert("RGBA")
    im_rgba.alpha_composite(mask)
    d = ImageDraw.Draw(im_rgba)

    mw, mh = W - 120, 360
    mx, my = (W - mw) // 2, 520
    rounded(d, (mx, my, mx + mw, my + mh), 20, "#FFFFFF")
    text(d, (W // 2, my + 44), "导出完成", F14, fill=TEXT, anchor="mm")
    text(d, (mx + 22, my + 94), "已生成 CSV 文件（微信内不支持预览）", F12, fill=MUTED)
    rounded(d, (mx + 22, my + 140, mx + mw - 22, my + 230), 16, "#F2F8FB")
    text(d, (mx + 36, my + 186), f"{ROOT}/miniprogram/...", F12, fill=MUTED, anchor="lm")
    rounded(d, (mx + 22, my + 260, mx + mw - 22, my + 320), 18, BRAND)
    text(d, (W // 2, my + 290), "复制路径", F14, fill="#FFFFFF", anchor="mm")

    out = im_rgba.convert("RGB")
    save(out, "records--export-path.png")


def page_test_diagram():
    im, d = make_base("home")
    top = nav(d, "测试示意图", left="‹")
    x, w = 24, W - 48
    y = top + 22

    text(d, (x, y), "点击下方性状名称测试示意图", F14, fill=MUTED)
    y += 26

    draw_card(d, x, y + 18, w, 420)
    yy = y + 60
    for idx, name in enumerate(["体高", "胸宽", "体深", "尻角度", "乳房深度", "棱角性"]):
        text(d, (x + 22, yy), name, F14, fill=BRAND)
        yy += 62
        if idx != 5:
            d.line((x + 22, yy - 22, x + w - 22, yy - 22), fill=LINE, width=2)
    save(im, "test-diagram.png")


def main():
    page_login(agreed=True)
    page_login(agreed=False)
    page_verify()
    page_webview()
    page_privacy()
    page_home()
    page_farm_select()
    page_farm_create()
    page_scoring_info()
    page_scoring_unified()
    page_diagram_modal(loaded=False)
    page_diagram_modal(loaded=True)
    page_photo(with_images=False)
    page_photo(with_images=True)
    page_result()
    page_records_list()
    page_records_detail()
    page_records_export_sheet()
    page_records_export_path()
    page_settings_top()
    page_settings_trait_defaults_1()
    page_settings_trait_defaults_2()
    page_settings_threshold()
    page_team_info()
    page_admin_panel_farm_manage()
    page_test_diagram()


if __name__ == "__main__":
    main()
