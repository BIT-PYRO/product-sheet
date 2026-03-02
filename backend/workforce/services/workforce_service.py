"""Workforce business-logic helpers."""

from __future__ import annotations

from workforce.models import WorkforceMember


def deactivate_member(member: WorkforceMember) -> WorkforceMember:
    """Soft-deactivate a workforce member."""
    member.active = False
    member.save(update_fields=["active"])
    return member


def activate_member(member: WorkforceMember) -> WorkforceMember:
    """Re-activate a workforce member."""
    member.active = True
    member.save(update_fields=["active"])
    return member
