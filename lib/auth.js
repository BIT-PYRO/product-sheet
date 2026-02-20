export const FIXED_USERS = [
  { id: 'kartik15.janki@gmail.com', password: 'Janki@5270', role: 'owner' },
  { id: 'jatin15.janki@gmail.com', password: 'Janki@6531', role: 'owner' },
  { id: 'apoorva.janki@gmail.com', password: 'Janki@7991', role: 'owner' },
];

export function normalizeUserId(userId) {
  const rawValue = String(userId || '').trim();

  if (!rawValue) {
    return '';
  }

  try {
    return decodeURIComponent(rawValue).trim().toLowerCase();
  } catch {
    return rawValue.toLowerCase();
  }
}

export function getUserById(userId) {
  const normalized = normalizeUserId(userId);
  return FIXED_USERS.find((user) => normalizeUserId(user.id) === normalized) || null;
}

export function validateCredentials(userId, password) {
  const user = getUserById(userId);

  if (!user) {
    return null;
  }

  if (String(password || '') !== user.password) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
  };
}
