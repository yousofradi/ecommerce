import os
import glob

html_files = glob.glob('frontend/admin/*.html')
for f in html_files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if '<div class="admin-sidebar-header">' not in content:
        # Needs replacement
        old_brand = '<div class="admin-brand">?? Sundura Admin</div>'
        new_header = '''<div class="admin-sidebar-header">
        <div class="admin-brand">?? Sundura Admin</div>
        <button class="sidebar-toggle">?</button>
      </div>'''
        content = content.replace(old_brand, new_header)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {f}")
