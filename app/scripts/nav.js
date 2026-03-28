function installInstantNavigation() {
    let touchHandled = false;

    function navigateFromTarget(target) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        const link = target.closest('a[href]');
        if (!link) {
            return false;
        }

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http')) {
            return false;
        }

        window.location.assign(href);
        return true;
    }

    document.addEventListener('touchend', (event) => {
        const didNavigate = navigateFromTarget(event.target);
        touchHandled = didNavigate;
        if (didNavigate) {
            event.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('click', (event) => {
        if (touchHandled) {
            touchHandled = false;
            event.preventDefault();
            return;
        }
        if (navigateFromTarget(event.target)) {
            event.preventDefault();
        }
    });
}

installInstantNavigation();
