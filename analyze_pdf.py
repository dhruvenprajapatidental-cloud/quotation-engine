import base64, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Create a high-quality SVG logo matching the provided M logo
# Navy blue background (#1c2a42) with rounded corners, gold serif M (#c9a227)
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="26" fill="#1c2a42"/>
  <text x="100" y="148" 
    font-family="'Times New Roman', Times, Georgia, serif" 
    font-size="128" 
    font-weight="normal"
    fill="#c9a227" 
    text-anchor="middle"
    letter-spacing="-2">M</text>
</svg>'''

svg_b64 = base64.b64encode(svg.encode('utf-8')).decode('utf-8')
data_uri = f'data:image/svg+xml;base64,{svg_b64}'

# Write SVG file
with open(r'C:\Users\Dhruven\.gemini\antigravity\scratch\quotation-engine\logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg)

# Write data URI to a JS-importable file  
with open(r'C:\Users\Dhruven\.gemini\antigravity\scratch\quotation-engine\logo_uri.txt', 'w', encoding='utf-8') as f:
    f.write(data_uri)

print('SVG data URI length:', len(data_uri))
print('LOGO_URI:', data_uri[:120], '...')
