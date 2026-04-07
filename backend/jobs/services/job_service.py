ALLOWED_TRANSITIONS = {
    'created': {'assigned', 'cancelled', 'in_progress'},
    'assigned': {'in_progress', 'cancelled'},
    'in_progress': {'completed', 'cancelled'},
    'completed': set(),
    'cancelled': set(),
}


def can_transition(current_status: str, next_status: str) -> bool:
    return next_status in ALLOWED_TRANSITIONS.get(current_status, set())


# Department pipeline order for voucher chain
DEPARTMENT_PIPELINE = [
    ('die', 'Die'),
    ('wax-pieces', 'Wax Piece'),
    ('wax-setting', 'Wax Setting'),
    ('casting', 'Casting'),
    ('filing', 'Filing / Grinding'),
    ('pre-polish', 'Pre-Polish'),
    ('hand-setting', 'Hand Setting'),
    ('polishing', 'Final Polish'),
    ('plating', 'Plating'),
    ('final-stock', 'Final Stock'),
]

# Maps pipeline dept keys to inventory stage keys
DEPT_TO_STOCK_STAGE = {
    'die': 'die',
    'wax-pieces': 'wax_piece',
    'wax-setting': 'wax_setting',
    'casting': 'casting',
    'filing': 'filling',
    'pre-polish': 'pre_polish',
    'hand-setting': 'setting',
    'polishing': 'final_polish',
    'plating': 'ready_for_plating',
    'final-stock': 'final_stock',
}
