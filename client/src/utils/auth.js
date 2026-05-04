const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'
const AVATAR_URL_KEY = 'avatarUrl'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const getUsername = () => localStorage.getItem(USERNAME_KEY)

export const getAvatarUrl = () => localStorage.getItem(AVATAR_URL_KEY) || ''

export const setAvatarUrl = (avatarUrl = '') => {
  if (avatarUrl) {
    localStorage.setItem(AVATAR_URL_KEY, avatarUrl)
    return
  }

  localStorage.removeItem(AVATAR_URL_KEY)
}

export const setAuth = ({ token, username, avatarUrl = '' }) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
  setAvatarUrl(avatarUrl)
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(AVATAR_URL_KEY)
}
