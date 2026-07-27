import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';

export const AUTH_TOKEN = new HttpContextToken<string | null>(() => null);

export function withAuth(authToken: string): { context: HttpContext } {
  return { context: new HttpContext().set(AUTH_TOKEN, authToken) };
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = req.context.get(AUTH_TOKEN);
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
