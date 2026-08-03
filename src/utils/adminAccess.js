// The admin UI gate. This is presentation only - the real authorization
// boundary is firestore.rules, whose isAdmin() check compares
// request.auth.token.email against this same address. If ADMIN_EMAIL changes
// here, firestore.rules must be updated and redeployed to match, or the two
// fall out of sync.
export const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';

export const isAdminPath = () => {
    const path = window.location.pathname;
    return path === '/admin' || path === '/admin/';
};

export const isAdminUser = (user) => !!user && user.email === ADMIN_EMAIL;
