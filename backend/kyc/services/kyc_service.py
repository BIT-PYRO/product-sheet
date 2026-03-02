def can_approve_kyc(id_number: str) -> bool:
	"""
	Validation rule for KYC approval.
	
	Args:
		id_number: The ID number to validate
		
	Returns:
		bool: True if ID number is valid for approval, False otherwise
		
	Explanation: tiny validation rule; place future compliance rules here.
	"""
	return bool(id_number and len(id_number) >= 6)
