"""Drafts business-logic helpers."""

from __future__ import annotations

from drafts.models import Draft


def submit_draft(draft: Draft) -> Draft:
    """Mark a draft as submitted after basic validation."""
    if draft.is_submitted:
        raise ValueError("Draft is already submitted.")
    if not draft.payload:
        raise ValueError("Cannot submit an empty draft.")
    draft.is_submitted = True
    draft.save(update_fields=["is_submitted"])
    return draft


def get_latest_pending_draft(*, owner_id: int, entity_type: str) -> Draft | None:
    """Return the most recent un-submitted draft for the given owner + entity."""
    return (
        Draft.objects.filter(
            owner_id=owner_id,
            entity_type=entity_type,
            is_submitted=False,
        )
        .order_by("-updated_at")
        .first()
    )
