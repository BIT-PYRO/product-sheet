ALLOWED_TRANSITIONS = {
    'created': {'assigned', 'cancelled'},
    'assigned': {'in_progress', 'cancelled'},
    'in_progress': {'completed', 'cancelled'},
    'completed': set(),
    'cancelled': set(),
}


def can_transition(current_status: str, next_status: str) -> bool:
    return next_status in ALLOWED_TRANSITIONS.get(current_status, set())
