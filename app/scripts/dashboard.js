function metricCard(label, value, note = '') {
    return `
        <article class="metric-card surface">
            <div class="metric-label">${label}</div>
            <div class="metric-value">${value}</div>
            ${note ? `<div class="muted">${note}</div>` : ''}
        </article>
    `;
}

function moduleCard(module) {
    const action = module.status === 'active'
        ? `<a class="btn btn-primary" href="module.html?id=${module.id}">Ouvrir le module</a>`
        : `<span class="module-note">Module en préparation</span>`;

    return `
        <article class="module-card surface">
            <div class="chip-row">
                <span class="status-pill ${module.status}">${module.status === 'active' ? 'Actif' : 'Prévu'}</span>
                <span class="tag">${module.shortTitle}</span>
            </div>
            <h3>${module.title}</h3>
            <p class="muted">${module.summary}</p>
            <div class="list-tight muted">
                <div>Exercices couverts : ${module.exerciseMetrics.coveredExercises}/${module.exerciseMetrics.totalExercises || 0}</div>
                <div>Exactitude : ${formatPercent(module.exerciseMetrics.accuracyRate)}</div>
                <div>Cartes dues : ${module.reviewMetrics.dueCards}</div>
            </div>
            <div class="actions module-actions">
                ${action}
            </div>
        </article>
    `;
}

function weakSpotCard(item) {
    return `
        <article class="module-card surface">
            <div class="metric-label">${item.moduleTitle}</div>
            <h3>${item.prompt}</h3>
            <p class="muted">Exactitude actuelle : ${formatPercent(item.accuracy)} · Tentatives : ${item.attempts}</p>
            <a class="btn btn-secondary" href="module.html?id=${item.moduleId}">Revoir ce module</a>
        </article>
    `;
}

async function bootDashboard() {
    const root = document.getElementById('dashboard-root');
    const topbar = document.getElementById('dashboard-topbar');
    try {
        const data = await apiGet('/api/dashboard');
        const resumeHref = data.resumeModuleId ? `module.html?id=${data.resumeModuleId}` : 'review.html';
        if (topbar) {
            topbar.classList.add('is-hidden');
        }

        root.innerHTML = `
            <section class="hero">
                <article class="hero-card surface">
                    <span class="eyebrow">Étude modulaire</span>
                    <h1>Un espace simple pour apprendre, fixer et réviser.</h1>
                    <p class="hero-copy">
                        Chaque thème avance par leçons, exercices et cartes de révision.
                        Le deck reste unique, mais le suivi reste lisible par module.
                    </p>
                    <div class="actions">
                        <a class="btn btn-primary" href="${resumeHref}">Reprendre</a>
                        <a class="btn btn-secondary" href="review.html">Révision globale</a>
                    </div>
                </article>
                <article class="hero-card surface">
                    <span class="eyebrow">Deck global</span>
                    <div class="stack module-actions">
                        <div>
                            <div class="metric-label">Cartes dues</div>
                            <div class="metric-value">${data.review.dueCards}</div>
                        </div>
                        <div class="muted">Nouvelles : ${data.review.newCards} · Apprises : ${data.review.learnedCards} · Matures : ${data.review.matureCards}</div>
                        <div class="muted">Erreur récente : ${formatPercent(data.review.recentErrorRate)}</div>
                    </div>
                </article>
            </section>

            <section class="grid-metrics">
                ${metricCard('Modules actifs', data.modules.filter((module) => module.status === 'active').length)}
                ${metricCard('Exercices tentés', data.modules.reduce((sum, module) => sum + module.exerciseMetrics.totalAttempts, 0))}
                ${metricCard('Cartes dans le deck', data.review.totalCards)}
                ${metricCard('Erreur récente', formatPercent(data.review.recentErrorRate))}
            </section>

            <section>
                <div class="section-head">
                    <div>
                        <h2>Modules</h2>
                        <p class="muted">Le contenu suit le programme officiel et le manuel, avec une architecture prête pour les thèmes 2 et 3.</p>
                    </div>
                </div>
                <div class="grid-modules">
                    ${data.modules.map(moduleCard).join('')}
                </div>
            </section>

            <section>
                <div class="section-head">
                    <div>
                        <h2>Exercices à retravailler</h2>
                        <p class="muted">Cette zone mettra en avant les questions qui résistent vraiment, module par module.</p>
                    </div>
                </div>
                <div class="grid-modules">
                    ${data.weakSpots.length ? data.weakSpots.map(weakSpotCard).join('') : `<article class="empty-card surface"><h3>Rien de fragile pour l'instant</h3><p class="soft-note">Après quelques exercices, cette zone servira à repérer ce qu'il faut reprendre sans mélanger cela avec les cartes de révision.</p></article>`}
                </div>
            </section>
        `;
    } catch (error) {
        root.innerHTML = `<article class="empty-card surface"><h2>Erreur</h2><p class="muted">${error.message}</p></article>`;
    }
}

bootDashboard();
