import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') # Assuming standard setup, or similar
django.setup()

from accounting.models import Income, Expense, Outstanding, JournalItem, JournalEntry

def clear_all():
    print(f"Deleting {Income.objects.count()} Income records...")
    Income.objects.all().delete()
    
    print(f"Deleting {Expense.objects.count()} Expense records...")
    Expense.objects.all().delete()
    
    print(f"Deleting {Outstanding.objects.count()} Outstanding records...")
    Outstanding.objects.all().delete()

    print(f"Deleting {JournalItem.objects.count()} JournalItem records...")
    JournalItem.objects.all().delete()

    print(f"Deleting {JournalEntry.objects.count()} JournalEntry records...")
    JournalEntry.objects.all().delete()
    
    print("All accountancy test data successfully deleted!")

if __name__ == '__main__':
    clear_all()
