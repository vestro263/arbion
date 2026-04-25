export function useAuth() {
  const [jwt, setJwt] = useState(null)
  const [username, setUsername] = useState('')

  // 🔹 normal login
  const login = useCallback(async (user, pass) => {
    const token = await fetchToken(user, pass)
    setJwt(token)
    setUsername(user)
    return token
  }, [])

  // 🔹 token login (Google/signup)
  const loginWithToken = useCallback((token, user) => {
    setJwt(token)
    setUsername(user)
  }, [])

  const logout = useCallback(() => {
    setJwt(null)
    setUsername('')
  }, [])

  return { jwt, username, login, loginWithToken, logout }
}