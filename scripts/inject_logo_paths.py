
import os

svg_source_path = r"c:\Users\email\Desktop\Mentis\public\mentis-logo-formatted.svg"
logo_target_path = r"c:\Users\email\Desktop\Mentis\components\ui\Logo.tsx"

def inject_paths():
    try:
        # Read the SVG source lines
        with open(svg_source_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Extract lines 11 to 14 (indices 10 to 13, assuming 1-based indexing in previous viewers matched file lines)
        # Check Step 918/953 output for line numbers. 
        # Line 11: <g ...
        # Line 12: <path ...
        # Line 13: </g>
        # Line 14: <path ...
        
        # Lists are 0-indexed, so line 11 is index 10.
        paths_to_inject = lines[10:14]
        
        processed_paths = []
        for line in paths_to_inject:
            # Replace fill="#ffffff" with React className for dark mode handling
            # Also need to change class=" to className=" if present, but here we act on raw SVG attributes
            # The original has fill="#ffffff". We want to remove it or override it via className?
            # React SVG elements: we need to convert attributes to camelCase if they aren't already.
            # However, the previous 'replace_file_content' used camelCase like strokeLinecap.
            # The file 'mentis-logo-formatted.svg' has standard SVG attributes (kebab-case).
            # We need to convert them to React camelCase strings.
            
            new_line = line.replace('stroke-linecap', 'strokeLinecap')
            new_line = new_line.replace('stroke-width', 'strokeWidth')
            new_line = new_line.replace('stroke-opacity', 'strokeOpacity')
            new_line = new_line.replace('stroke-linejoin', 'strokeLinejoin')
            new_line = new_line.replace('stroke-miterlimit', 'strokeMiterlimit')
            new_line = new_line.replace('fill-rule', 'fillRule')
            new_line = new_line.replace('fill-opacity', 'fillOpacity')
            new_line = new_line.replace('clip-path', 'clipPath')
            new_line = new_line.replace('clip-rule', 'clipRule')
            
            # Handle the white fill for dark mode logic
            # We replace fill="#ffffff" with className="fill-white dark:fill-slate-900" and remove fill attribute
            if 'fill="#ffffff"' in new_line:
                new_line = new_line.replace('fill="#ffffff"', 'className="fill-white dark:fill-slate-900"')
            
            processed_paths.append(new_line)
            
        block_to_inject = "".join(processed_paths)

        # Read the target Logo.tsx
        with open(logo_target_path, 'r', encoding='utf-8') as f:
            target_content = f.read()
            
        # Inject before the closing </svg> tag
        if '</svg>' in target_content:
            new_content = target_content.replace('</svg>', block_to_inject + '\n        </svg>')
            
            with open(logo_target_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully injected paths into Logo.tsx")
        else:
            print("Error: Could not find closing </svg> tag in Logo.tsx")

    except Exception as e:
        print(f"Error during injection: {e}")

if __name__ == "__main__":
    inject_paths()
