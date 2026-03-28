const reviewParams = new URLSearchParams(window.location.search);
const reviewModuleId = reviewParams.get('module');
let currentCard = null;

function summaryMarkup(summary, title) {
    return `
        <div class="grid-metrics">
            <article class="metric-card surface">
                <div class="metric-label">${title}</div>
                <div class="metric-value">${summary.dueCards}</div>
                <div class="muted">Cartes dues maintenant.</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Cartes apprises</div>
                <div class="metric-value">${summary.learnedCards}</div>
                <div class="muted">Cartes avec intervalle > 0.</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Cartes matures</div>
                <div class="metric-value">${summary.matureCards}</div>
                <div class="muted">Intervalle de 7 jours ou plus.</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Erreur récente</div>
                <div class="metric-value">${formatPercent(summary.recentErrorRate)}</div>
                <div class="muted">Fenêtre glissante de 14 jours.</div>
            </article>
        </div>
    `;
}

async function loadNextCard() {
    const query = reviewModuleId ? `?moduleId=${encodeURIComponent(reviewModuleId)}` : '';
    const payload = await apiGet(`/api/review/next${query}`);
    currentCard = payload.card;
    return currentCard;
}

async function loadSummary() {
    const query = reviewModuleId ? `?moduleId=${encodeURIComponent(reviewModuleId)}` : '';
    return apiGet(`/api/review/summary${query}`);
}

function renderEmptyState() {
    return `
        <article class="empty-card surface review-stage">
            <h2>Rien n'est dû pour l'instant.</h2>
            <p class="muted">Le deck est unique, mais le filtre par module reste disponible quand tu veux retravailler un thème précis.</p>
            <div class="actions">
                <a class="btn btn-secondary" href="index.html">Retour au tableau de bord</a>
                ${reviewModuleId ? `<a class="btn btn-primary" href="module.html?id=${reviewModuleId}">Retour au module</a>` : ''}
            </div>
        </article>
    `;
}

function renderCard(card) {
    return `
        <section class="review-stage">
            <article class="review-card surface flashcard" id="flashcard">
                <div class="flashcard-inner">
                    <div class="flash-face front surface">
                        <div class="chip-row">
                            ${card.moduleIds.map((moduleId) => `<span class="tag">${moduleId}</span>`).join('')}
                        </div>
                        <div class="flash-prompt">${card.prompt}</div>
                        <div class="muted">Tapote la carte pour voir la réponse.</div>
                    </div>
                    <div class="flash-face back surface">
                        <div class="chip-row">
                            ${card.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                        <div class="flash-answer">${card.answer}</div>
                        <div class="muted">Choisis un niveau de rappel.</div>
                    </div>
                </div>
            </article>
            <div class="control-row">
                <button class="btn btn-secondary" id="flip-btn">Retourner</button>
                <button class="btn btn-danger" data-rating="wrong">Oublié</button>
                <button class="btn btn-secondary" data-rating="hard">Difficile</button>
                <button class="btn btn-primary" data-rating="medium">Correct</button>
                <button class="btn btn-success" data-rating="easy">Facile</button>
            </div>
        </section>
    `;
}

async function submitReview(rating) {
    if (!currentCard) {
        return;
    }
    await apiPost('/api/review', {
        cardId: currentCard.id,
        moduleId: reviewModuleId,
        rating,
        reviewedAt: Math.floor(Date.now() / 1000),
    });
}

async function bootReview() {
    const root = document.getElementById('review-root');

    try {
        const summary = await loadSummary();
        const title = reviewModuleId ? 'Cartes dues du module' : 'Cartes dues du deck';
        root.innerHTML = summaryMarkup(summary, title);

        const card = await loadNextCard();
        root.insertAdjacentHTML('beforeend', card ? renderCard(card) : renderEmptyState());

        root.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.id === 'flip-btn' || target.closest('#flashcard')) {
                document.getElementById('flashcard')?.classList.toggle('is-flipped');
                return;
            }

            const rating = target.getAttribute('data-rating');
            if (!rating) {
                return;
            }

            await submitReview(rating);
            const nextSummary = await loadSummary();
            const nextCard = await loadNextCard();
            root.innerHTML = summaryMarkup(nextSummary, title) + (nextCard ? renderCard(nextCard) : renderEmptyState());
        });
    } catch (error) {
        root.innerHTML = `<article class="empty-card surface"><h2>Erreur</h2><p class="muted">${error.message}</p></article>`;
    }
}

bootReview();
