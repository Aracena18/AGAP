/** The server validates the internal return route and requested assurance. */
export function staffLoginHref(returnTo='/staff',mfa=false){
  const query=new URLSearchParams({returnTo});if(mfa)query.set('assurance','mfa');
  return `/api/v1/auth/login?${query}`;
}
