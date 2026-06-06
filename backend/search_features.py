import os
import fnmatch

search_terms = ['managers-dashboard', 'master-job-sheet', 'master-kyc-sheet', 'master-designer-sheet', 'designer-sheet', 'master-finding-sheet', 'finding-sheet', 'hr-section']

for root, dirnames, filenames in os.walk('d:/Janki/product-sheet-design/backend'):
    for filename in fnmatch.filter(filenames, '*.py'):
        file_path = os.path.join(root, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                for term in search_terms:
                    if f'\"{term}\"' in content or f'\'{term}\'' in content:
                        print(f'Found {term} in {file_path}')
        except Exception:
            pass
