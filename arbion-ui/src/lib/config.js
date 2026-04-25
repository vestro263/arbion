const isDev = import.meta.env.DEV

export const DJANGO_HOST = isDev
  ? 'http://127.0.0.1:8000'
  : 'https://arbion-jpg.onrender.com'

export const NODE_HOST = isDev
  ? 'http://127.0.0.1:4000'
  : 'https://arbion-jpeg.onrender.com'