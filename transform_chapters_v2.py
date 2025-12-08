#!/usr/bin/env python3
"""
Transform DDIA chapters 8, 9, 10 into Docusaurus markdown format
This script handles plain text input files and converts them to properly formatted markdown
"""

import re
from pathlib import Path


def process_chapter_files():
    """Process chapters 8, 9, and 10"""

    base_dir = Path(__file__).parent
    raw_dir = base_dir / 'raw'
    docs_dir = base_dir / 'docs' / 'docs' / 'part2'

    chapters = [
        {
            'num': 8,
            'input_file': 'chapter8.md',
            'output_file': 'chapter08-transactions.md',
            'title': 'Transactions',
            'description': 'Understanding database transactions and their guarantees',
            'sidebar_position': 3,
            'prev_nav': '[Chapter 7](../part2/chapter07-sharding.md)',
            'next_nav': '[Chapter 9](chapter09-distributed-systems.md)'
        },
        {
            'num': 9,
            'input_file': 'chapter9.md',
            'output_file': 'chapter09-distributed-systems.md',
            'title': 'The Trouble with Distributed Systems',
            'description': 'Understanding the fundamental challenges in distributed systems',
            'sidebar_position': 4,
            'prev_nav': '[Chapter 8](chapter08-transactions.md)',
            'next_nav': '[Chapter 10](chapter10-consistency-consensus.md)'
        },
        {
            'num': 10,
            'input_file': 'chapter10.md',
            'output_file': 'chapter10-consistency-consensus.md',
            'title': 'Consistency and Consensus',
            'description': 'Exploring consistency models and consensus algorithms in distributed systems',
            'sidebar_position': 5,
            'prev_nav': '[Chapter 9](chapter09-distributed-systems.md)',
            'next_nav': '[Chapter 11](../part3/chapter11-stream-processing.md)'
        }
    ]

    for chapter in chapters:
        input_path = raw_dir / chapter['input_file']
        output_path = docs_dir / chapter['output_file']

        print(f"Transforming Chapter {chapter['num']}: {chapter['title']}...")

        # Read input
        content = input_path.read_text(encoding='utf-8')

        # Transform content
        transformed = transform_content(content, chapter)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write output
        output_path.write_text(transformed, encoding='utf-8')
        print(f"  Created {output_path}")

    print("\nTransformation complete!")


def transform_content(content: str, chapter: dict) -> str:
    """Transform the raw chapter content"""

    lines = content.split('\n')
    result = []

    # Add frontmatter
    result.append('---')
    result.append(f'sidebar_position: {chapter["sidebar_position"]}')
    result.append(f'title: "Chapter {chapter["num"]}. {chapter["title"]}"')
    result.append(f'description: "{chapter["description"]}"')
    result.append('---')
    result.append('')

    # Track state
    in_early_release_note = False
    in_footer = False
    quote_lines = []
    author_line = ''
    found_chapter_title = False
    content_started = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip "Skip to Content" line
        if 'Skip to Content' in line:
            i += 1
            continue

        # Detect chapter title (plain text, e.g., "Chapter 8. Transactions")
        if not found_chapter_title and line.startswith(f'Chapter {chapter["num"]}.'):
            # Add chapter title as markdown header
            result.append(f'# {line}')
            result.append('')
            found_chapter_title = True

            # Collect quote lines (everything until we hit the "Note for Early Release" section)
            quote_start = i + 1
            quote_end = quote_start
            while quote_end < len(lines):
                if 'A Note for Early Release Readers' in lines[quote_end]:
                    break
                quote_end += 1

            # Extract quote and author (typically the last few lines before the note)
            # Find the last non-empty line before the note - that's usually the author
            last_non_empty = quote_start
            for j in range(quote_start, quote_end):
                if lines[j].strip():
                    last_non_empty = j

            # Everything before the author is the quote
            for j in range(quote_start, last_non_empty):
                if lines[j].strip():
                    quote_lines.append(lines[j])

            # The author line
            if last_non_empty < quote_end and lines[last_non_empty].strip():
                author_line = lines[last_non_empty]

            # Add quote block
            if quote_lines:
                result.append('> ' + quote_lines[0])
                for ql in quote_lines[1:]:
                    if ql.strip():
                        result.append('>')
                        result.append('> ' + ql)
                result.append('')

            i = quote_end
            continue

        # Skip "A Note for Early Release Readers" section
        if 'A Note for Early Release Readers' in line:
            in_early_release_note = True
            # Skip until we find the actual content (typically after GitHub link and blank lines)
            while i < len(lines):
                i += 1
                if i >= len(lines):
                    break
                # Content starts after the note when we hit actual paragraph text
                if lines[i].strip() and not lines[i].startswith('A Note for Early Release') \
                   and not lines[i].startswith('With Early Release') \
                   and not lines[i].startswith('This will be the') \
                   and not lines[i].startswith('If you') \
                   and 'github.com' not in lines[i].lower():
                    content_started = True
                    in_early_release_note = False
                    break
            continue

        # Detect footer section (last part of file with navigation/references)
        if content_started and (
            'table of contents' in line.lower() or
            'previous chapter' in line.lower() or
            'next chapter' in line.lower() or
            line.strip() in ['Footnotes', 'References', 'Settings'] or
            'search' in line.lower() and len(line.strip()) < 20
        ):
            in_footer = True

        # Skip footer content
        if in_footer:
            i += 1
            continue

        # If we haven't started content yet, skip
        if not content_started:
            i += 1
            continue

        # Remove reference numbers [1], [2], etc. and also comma-separated lists like [2, 3, 4]
        line = re.sub(r'\s*\[\d+(?:,\s*\d+)*\](?!\()', '', line)

        # Add the line to result
        result.append(line)
        i += 1

    # Join result
    output = '\n'.join(result)

    # Clean up excessive blank lines (more than 2 consecutive)
    output = re.sub(r'\n{4,}', '\n\n\n', output)

    # Add navigation at the end
    output = output.rstrip() + '\n\n---\n\n**Previous:** ' + chapter['prev_nav'] + ' | **Next:** ' + chapter['next_nav'] + '\n'

    return output


if __name__ == '__main__':
    process_chapter_files()
