#!/usr/bin/env python3
"""
Transform DDIA chapters into Docusaurus markdown format
"""

import re
from pathlib import Path


def remove_reference_numbers(text: str) -> str:
    """Remove reference numbers in brackets like [1], [2], etc."""
    # Remove standalone reference numbers like [1] or [42]
    text = re.sub(r'\[(\d+)\](?!\()', '', text)
    return text


def clean_content(text: str) -> str:
    """Remove unwanted sections and clean up content"""
    lines = text.split('\n')
    cleaned_lines = []
    skip_section = False
    in_footer = False

    for i, line in enumerate(lines):
        # Skip "Skip to Content" line
        if 'Skip to Content' in line:
            continue

        # Skip "A Note for Early Release Readers" section
        if 'A Note for Early Release Readers' in line:
            skip_section = True
            continue

        # End skipping when we hit substantial content after the note
        if skip_section and line.strip() and len(line.strip()) > 100:
            skip_section = False

        # Detect footer section (last ~10% of file)
        if i > len(lines) * 0.9:
            # Check for footer markers
            if any(x in line.lower() for x in ['table of contents', 'search', 'settings', 'previous chapter', 'next chapter']):
                in_footer = True
            # Also check for References or Footnotes section
            if line.strip() in ['Footnotes', 'References']:
                in_footer = True

        if in_footer:
            continue

        if not skip_section:
            cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)

    # Remove reference numbers
    text = remove_reference_numbers(text)

    return text


def add_toc_numbering(text: str) -> str:
    """Add numbering to headers and create TOC"""
    lines = text.split('\n')
    result_lines = []

    # Track section numbers
    h2_counter = 0
    h3_counter = 0
    h4_counter = 0

    # First pass: number headers
    for i, line in enumerate(lines):
        # Skip the main chapter title (first # header)
        if line.startswith('# Chapter'):
            result_lines.append(line)
            continue

        # Handle ## headers (main sections)
        if line.startswith('## ') and not line.startswith('### '):
            # Skip TOC header itself
            if 'Table of Contents' in line:
                result_lines.append(line)
                continue

            h2_counter += 1
            h3_counter = 0
            h4_counter = 0

            # Extract title (remove existing numbers if any)
            title = re.sub(r'^##\s*\d+\.\s*', '## ', line)
            title = title.replace('## ', '', 1).strip()

            # Add number
            result_lines.append(f'## {h2_counter}. {title}')

        # Handle ### headers (subsections)
        elif line.startswith('### ') and not line.startswith('#### '):
            h3_counter += 1
            h4_counter = 0

            title = re.sub(r'^###\s*\d+\.\d+\.\s*', '### ', line)
            title = title.replace('### ', '', 1).strip()

            result_lines.append(f'### {h2_counter}.{h3_counter}. {title}')

        # Handle #### headers (sub-subsections)
        elif line.startswith('#### '):
            h4_counter += 1

            title = re.sub(r'^####\s*\d+\.\d+\.\d+\.\s*', '#### ', line)
            title = title.replace('#### ', '', 1).strip()

            result_lines.append(f'#### {h2_counter}.{h3_counter}.{h4_counter}. {title}')

        else:
            result_lines.append(line)

    return '\n'.join(result_lines)


def create_toc(text: str) -> str:
    """Create table of contents from headers"""
    lines = text.split('\n')
    toc_lines = []

    for line in lines:
        # Skip the main chapter title
        if line.startswith('# Chapter'):
            continue

        # Match ## headers
        if line.startswith('## ') and not line.startswith('### '):
            if 'Table of Contents' in line:
                continue
            match = re.match(r'^##\s*(\d+)\.\s*(.+)$', line)
            if match:
                num, title = match.groups()
                anchor = title.lower().replace(' ', '-').replace('?', '').replace("'", '').replace(',', '')
                anchor = re.sub(r'[^\w-]', '', anchor)
                toc_lines.append(f'{num}. [{title}](#{num}-{anchor})')

        # Match ### headers
        elif line.startswith('### ') and not line.startswith('#### '):
            match = re.match(r'^###\s*(\d+)\.(\d+)\.\s*(.+)$', line)
            if match:
                num1, num2, title = match.groups()
                anchor = title.lower().replace(' ', '-').replace('?', '').replace("'", '').replace(',', '')
                anchor = re.sub(r'[^\w-]', '', anchor)
                toc_lines.append(f'   - {num1}.{num2}. [{title}](#{num1}{num2}-{anchor})')

        # Match #### headers
        elif line.startswith('#### '):
            match = re.match(r'^####\s*(\d+)\.(\d+)\.(\d+)\.\s*(.+)$', line)
            if match:
                num1, num2, num3, title = match.groups()
                anchor = title.lower().replace(' ', '-').replace('?', '').replace("'", '').replace(',', '')
                anchor = re.sub(r'[^\w-]', '', anchor)
                toc_lines.append(f'      - {num1}.{num2}.{num3}. [{title}](#{num1}{num2}{num3}-{anchor})')

    return '\n'.join(toc_lines)


def insert_toc(text: str, toc: str) -> str:
    """Insert TOC after the Table of Contents header"""
    lines = text.split('\n')
    result_lines = []
    toc_inserted = False

    for i, line in enumerate(lines):
        result_lines.append(line)

        if not toc_inserted and line.strip() == '## Table of Contents':
            result_lines.append('')
            result_lines.append(toc)
            result_lines.append('')
            toc_inserted = True

            # Skip any existing TOC content
            j = i + 1
            while j < len(lines) and (lines[j].strip() == '' or
                                     lines[j].strip().startswith('-') or
                                     re.match(r'^\d+\.', lines[j].strip())):
                j += 1

            # Skip the lines we're removing
            for _ in range(j - i - 1):
                if lines:
                    lines.pop(i + 1)

    return '\n'.join(result_lines)


def add_frontmatter(text: str, position: int, chapter_num: int, title: str, description: str) -> str:
    """Add Docusaurus frontmatter"""
    frontmatter = f"""---
sidebar_position: {position}
title: "Chapter {chapter_num}. {title}"
description: "{description}"
---

"""
    return frontmatter + text


def add_navigation(text: str, prev_text: str, next_text: str) -> str:
    """Add navigation links at the bottom"""
    navigation = f"""

---

**Previous:** {prev_text} | **Next:** {next_text}
"""
    return text.rstrip() + navigation


def transform_chapter(input_path: Path, output_path: Path, position: int,
                      chapter_num: int, title: str, description: str,
                      prev_nav: str, next_nav: str):
    """Transform a single chapter"""
    print(f"Transforming {input_path.name}...")

    # Read input
    content = input_path.read_text(encoding='utf-8')

    # Clean content
    content = clean_content(content)

    # Add numbering to headers
    content = add_toc_numbering(content)

    # Create TOC
    toc = create_toc(content)

    # Insert TOC
    if '## Table of Contents' in content:
        content = insert_toc(content, toc)
    else:
        # Find where to insert TOC (after chapter title and quote)
        lines = content.split('\n')
        insert_pos = 0
        for i, line in enumerate(lines):
            if line.startswith('# Chapter'):
                # Find the next empty line after the quote
                for j in range(i + 1, len(lines)):
                    if lines[j].strip() == '' and j > i + 2:
                        insert_pos = j + 1
                        break
                break

        if insert_pos > 0:
            lines.insert(insert_pos, '## Table of Contents')
            lines.insert(insert_pos + 1, '')
            lines.insert(insert_pos + 2, toc)
            lines.insert(insert_pos + 3, '')
            content = '\n'.join(lines)

    # Add frontmatter
    content = add_frontmatter(content, position, chapter_num, title, description)

    # Add navigation
    content = add_navigation(content, prev_nav, next_nav)

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    output_path.write_text(content, encoding='utf-8')
    print(f"Created {output_path}")


def main():
    base_dir = Path(__file__).parent
    raw_dir = base_dir / 'raw'
    docs_dir = base_dir / 'docs' / 'docs' / 'part2'

    # Chapter 8
    transform_chapter(
        input_path=raw_dir / 'chapter8.md',
        output_path=docs_dir / 'chapter08-transactions.md',
        position=3,
        chapter_num=8,
        title='Transactions',
        description='Understanding database transactions and their guarantees',
        prev_nav='[Chapter 7](chapter07-sharding.md)',
        next_nav='[Chapter 9](chapter09-distributed-systems.md)'
    )

    # Chapter 9
    transform_chapter(
        input_path=raw_dir / 'chapter9.md',
        output_path=docs_dir / 'chapter09-distributed-systems.md',
        position=4,
        chapter_num=9,
        title='The Trouble with Distributed Systems',
        description='Understanding the fundamental challenges in distributed systems',
        prev_nav='[Chapter 8](chapter08-transactions.md)',
        next_nav='[Chapter 10](chapter10-consistency-consensus.md)'
    )

    # Chapter 10
    transform_chapter(
        input_path=raw_dir / 'chapter10.md',
        output_path=docs_dir / 'chapter10-consistency-consensus.md',
        position=5,
        chapter_num=10,
        title='Consistency and Consensus',
        description='Exploring consistency models and consensus algorithms in distributed systems',
        prev_nav='[Chapter 9](chapter09-distributed-systems.md)',
        next_nav='[Chapter 11](../part3/chapter11-stream-processing.md)'
    )

    print("\nTransformation complete!")


if __name__ == '__main__':
    main()
