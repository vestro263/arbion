import { DJANGO_HOST } from './config'

export async function fetchToken(username, password) {
  const res  = await fetch(`${DJANGO_HOST}/api/token/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok || !data.access) throw new Error(data.detail || 'Login failed')
  return data.access
}