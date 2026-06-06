import traceback

def log_error_to_file(e):
    with open(r'd:\Janki\product-sheet-design\backend\error_trace.log', 'a') as f:
        f.write(traceback.format_exc() + '\n')
