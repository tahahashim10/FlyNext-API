
// similar to afs api utils/query.js
export function getSearchParams(request) {
    return Object.fromEntries(request.nextUrl.searchParams.entries());
}
  