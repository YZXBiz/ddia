#!/usr/bin/env python3
"""
Transform DDIA chapters into Docusaurus markdown format.
"""

import re
from pathlib import Path


def extract_chapter_info(content):
    """Extract chapter number, title, and quote from raw content."""
    lines = content.split('\n')
   
    chapter_line = ""
    quote = ""
    quote_author = ""
    
    for i, line in enumerate(lines):
        if line.startswith("Chapter"):
            chapter_line = line.strip()
        elif chapter_line and not quote and line.strip() and not line.startswith("A Note"):
            quote = line.strip()
        elif quote and not quote_author and line.strip() and not line.startswith("A Note"):
            quote_author = line.strip()
            break
    
    return chapter_line, quote, quote_author


def clean_and_transform(content):
    """Clean content and perform transformations."""
    lines = content.split('\n')
    result = []
    skip = False
    in_footnotes = False
    
    for i, line in enumerate(lines):
        # Skip initial markers
        if "Skip to Content" in line:
            continue
            
        # Skip early release note section
        if "A Note for Early Release Readers" in line:
            skip = True
            continue
        
        # End of early release section - look for paragraph of real content
        if skip:
            if line.strip() and len(line) > 150:
                skip = False
            else:
                continue
        
        # Detect footnotes/references section (usually last 5-10% of file)
        if i > len(lines) * 0.92:
            if line.strip() in ["Footnotes", "References"] or \
               "table of contents" in line.lower() or \
               "Previous chapter" in line or \
               "Next chapter" in line:
                in_footnotes = True
        
        if in_footnotes:
            continue
            
        # Remove reference numbers [1], [2], etc
        line = re.sub(r'\s*\[(\d+(?:,\s*\d+)*)\]', '', line)
        
        result.append(line)
    
    return '\n'.join(result)


def number_headers(content):
    """Add numbering to headers."""
    lines = content.split('\n')
    result = []
    h2_num = 0
    h3_num = 0
    h4_num = 0
    
    for line in lines:
        # Skip main chapter title
        if line.startswith('# Chapter'):
            result.append(line)
            continue
        
        # ## headers
        if re.match(r'^##\s+[^#]', line):
            h2_num += 1
            h3_num = 0
            h4_num = 0
            title = re.sub(r'^##\s+', '', line).strip()
            result.append(f'## {h2_num}. {title}')
        
        # ### headers  
        elif re.match(r'^###\s+[^#]', line):
            h3_num += 1
            h4_num = 0
            title = re.sub(r'^###\s+', '', line).strip()
            result.append(f'### {h2_num}.{h3_num}. {title}')
        
        # #### headers
        elif re.match(r'^####\s+', line):
            h4_num += 1
            title = re.sub(r'^####\s+', '', line).strip()
            result.append(f'#### {h2_num}.{h3_num}.{h4_num}. {title}')
        
        else:
            result.append(line)
    
    return '\n'.join(result)


def generate_toc(content):
    """Generate table of contents from numbered headers."""
    lines = content.split('\n')
    toc = []
    
    for line in lines:
        # Match ## N. Title
        match = re.match(r'^##\s+(\d+)\.\s+(.+)$', line)
        if match:
            num, title = match.groups()
            anchor = f"{num}-{title.lower().replace(' ', '-')}"
            anchor = re.sub(r'[^\w-]', '', anchor)
            toc.append(f"{num}. [{title}](#{anchor})")
        
        # Match ### N.M. Title
        match = re.match(r'^###\s+(\d+)\.(\d+)\.\s+(.+)$', line)
        if match:
            num1, num2, title = match.groups()
            anchor = f"{num1}{num2}-{title.lower().replace(' ', '-')}"
            anchor = re.sub(r'[^\w-]', '', anchor)
            toc.append(f"   - {num1}.{num2}. [{title}](#{anchor})")
    
    return '\n'.join(toc)


def transform_chapter(input_file, output_file, sidebar_pos, description, prev_link, next_link):
    """Transform a single chapter."""
    print(f"Transforming {input_file.name}...")
    
    # Read original
    content = input_file.read_text(encoding='utf-8')
    
    # Extract chapter info
    chapter_line, quote, quote_author = extract_chapter_info(content)
    
    # Clean and transform
    content = clean_and_transform(content)
    content = number_headers(content)
    
    # Generate TOC
    toc = generate_toc(content)
    
    # Build final document
    output = f"""---
sidebar_position: {sidebar_pos}
title: "{chapter_line}"
description: "{description}"
---

# {chapter_line}

> {quote}
>
> _{quote_author}_

## Table of Contents

{toc}

{content}

---

**Previous:** {prev_link} | **Next:** {next_link}
"""
    
    # Remove the duplicate chapter line that's in the content
    output = output.replace(f"\n\n{chapter_line}\n", "\n\n")
    
    # Write output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(output, encoding='utf-8')
    print(f"  ✓ Created {output_file}")


def main():
    base = Path('/Users/jason/Files/Practice/demo-little-things/ddia')
    raw = base / 'raw'
    docs = base / 'docs/docs/part1'
    
    chapters = [
        {
            'input': raw / 'chapter3.md',
            'output': docs / 'chapter03-data-models.md',
            'pos': 3,
            'desc': 'Exploring different data models including relational, document, graph, and their trade-offs',
            'prev': '[Chapter 2](chapter02-nonfunctional-requirements.md)',
            'next': '[Chapter 4](chapter04-storage-retrieval.md)'
        },
        {
            'input': raw / 'chapter4.md',
            'output': docs / 'chapter04-storage-retrieval.md',
            'pos': 4,
            'desc': 'How databases store data and retrieve it efficiently using indexes and storage engines',
            'prev': '[Chapter 3](chapter03-data-models.md)',
            'next': '[Chapter 5](chapter05-encoding-evolution.md)'
        },
        {
            'input': raw / 'chapter5.md',
            'output': docs / 'chapter05-encoding-evolution.md',
            'pos': 5,
            'desc': 'Data encoding formats and schema evolution for maintaining compatibility across versions',
            'prev': '[Chapter 4](chapter04-storage-retrieval.md)',
            'next': '[Chapter 6](../part2/chapter06-replication.md)'
        },
    ]
    
    for ch in chapters:
        transform_chapter(ch['input'], ch['output'], ch['pos'], 
                         ch['desc'], ch['prev'], ch['next'])
    
    print("\n✅ All chapters transformed successfully!")


if __name__ == '__main__':
    main()
