import re, os

base = r"d:\Janki\product-sheet-design\frontend\app\frontend\inventory"

# (folder, table_class_to_add_border_collapse)
pages = [
    ("stone-inventory", '<table className="min-w-full text-sm">'),
    ("finding-inventory", None),
    ("others", None),
    ("machines", '<table className="w-full min-w-[2000px] text-sm">'),
    ("stone-log", None),
    ("product-log", None),
    ("low-stock", '<table className="w-full text-sm">'),  # two occurrences - replace all
]

for folder, table_str in pages:
    path = os.path.join(base, folder, "page.jsx")
    with open(path, encoding="utf-8") as f:
        c = f.read()

    # Add border-collapse to table(s)
    if table_str:
        new_table = table_str.replace(' text-sm">', ' border-collapse text-sm">')
        c = c.replace(table_str, new_table)

    # Add border border-soft-border to <th ...className="  (not already having border)
    c = re.sub(
        r'(<th[\s][^>]*?className=")(?!border)',
        r'\1border border-soft-border ',
        c,
        flags=re.DOTALL
    )

    # Add border border-soft-border to <td ...className="  (not already having border)
    c = re.sub(
        r'(<td[\s][^>]*?className=")(?!border)',
        r'\1border border-soft-border ',
        c,
        flags=re.DOTALL
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

    print(f"{folder}: done")

print("All done.")
