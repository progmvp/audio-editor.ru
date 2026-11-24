(function () {
    'use strict';

    function setupMobileMenu() {
        var header = document.querySelector('.pk_hdr.mobile');

        if (!header || header.dataset.mobileDrawerReady === '1') {
            return false;
        }

        var menuItems = Array.prototype.filter.call(
            header.children,
            function (element) {
                return element.classList &&
                    element.classList.contains('pk_btn');
            }
        );

        if (!menuItems.length) {
            return false;
        }

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'pk-mobile-menu-toggle';
        toggle.textContent = '☰ Меню';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Открыть меню плеера');

        var backdrop = document.createElement('div');
        backdrop.className = 'pk-mobile-menu-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');

        var panel = document.createElement('nav');
        panel.className = 'pk-mobile-menu-panel';
        panel.setAttribute('aria-label', 'Меню аудиоредактора');

        menuItems.forEach(function (item) {
            panel.appendChild(item);
        });

        header.appendChild(toggle);
        header.appendChild(backdrop);
        header.appendChild(panel);
        header.dataset.mobileDrawerReady = '1';

        function closeMenu() {
            header.classList.remove('pk-mobile-menu-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Открыть меню плеера');
            toggle.textContent = '☰ Меню';
        }

        toggle.addEventListener('click', function () {
            var isOpen = header.classList.toggle(
                'pk-mobile-menu-open'
            );

            toggle.setAttribute(
                'aria-expanded',
                isOpen ? 'true' : 'false'
            );

            toggle.setAttribute(
                'aria-label',
                isOpen ? 'Закрыть меню плеера' : 'Открыть меню плеера'
            );

            toggle.textContent = isOpen ? '✕ Закрыть' : '☰ Меню';
        });

        backdrop.addEventListener('click', closeMenu);

        panel.addEventListener('click', function (event) {
            if (event.target.closest('.pk_opt')) {
                window.setTimeout(closeMenu, 0);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        return true;
    }

    if (setupMobileMenu()) {
        return;
    }

    var observer = new MutationObserver(function () {
        if (setupMobileMenu()) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}());
