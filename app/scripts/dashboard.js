function metricCard(label, value, note = '') {
    return `
        <article class="metric-card surface">
            <div class="metric-label">${label}</div>
            <div class="metric-value">${value}</div>
            <div class="muted">${note}</div>
        </article>
    `;
}

function moduleCard(module) {
    const action = module.status === 'active'
        ? `<a class="btn btn-primary" href="module.html?id=${module.id}">Ouvrir le module</a>`
        : `<span class="btn btn-secondary">Bientôt</span>`;

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
            <div class="actions">
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
    try {
        const data = await apiGet('/api/dashboard');
        const resumeHref = data.resumeModuleId ? `module.html?id=${data.resumeModuleId}` : 'review.html';

        root.innerHTML = `
            <section class="hero">
                <article class="hero-card surface">
                    <span class="eyebrow">Étude modulaire</span>
                    <h1>Physique-Chimie, reconstruite autour des modules.</h1>
                    <p class="hero-copy">
                        Sif organise le programme de 2nde par thèmes, lie chaque carte au bon sujet
                        et sépare clairement compréhension, activité et mémoire à long terme.
                    </p>
                    <div class="actions">
                        <a class="btn btn-primary" href="${resumeHref}">Reprendre</a>
                        <a class="btn btn-secondary" href="review.html">Révision globale</a>
                    </div>
                </article>
                <article class="hero-card surface">
                    <span class="eyebrow">Deck global</span>
                    <div class="stack">
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
                ${metricCard('Modules actifs', data.modules.filter((module) => module.status === 'active').length, 'Le premier thème est déjà câblé.')}
                ${metricCard('Exercices tentés', data.modules.reduce((sum, module) => sum + module.exerciseMetrics.totalAttempts, 0), 'Événements stockés dans SQLite.')}
                ${metricCard('Cartes dans le deck', data.review.totalCards, 'Deck unique pour tout le programme.')}
                ${metricCard('Erreur récente', formatPercent(data.review.recentErrorRate), 'Basé sur les 14 derniers jours de révision.')}
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
                        <h2>Points faibles actuels</h2>
                        <p class="muted">Pas de score opaque : juste les exercices réellement fragiles.</p>
                    </div>
                </div>
                <div class="grid-modules">
                    ${data.weakSpots.length ? data.weakSpots.map(weakSpotCard).join('') : `<article class="empty-card surface"><h3>Encore rien à signaler</h3><p class="muted">Les points faibles apparaîtront après les premières tentatives.</p></article>`}
                </div>
            </section>
        `;
    } catch (error) {
        root.innerHTML = `<article class="empty-card surface"><h2>Erreur</h2><p class="muted">${error.message}</p></article>`;
    }
}

bootDashboard();
