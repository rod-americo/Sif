const params = new URLSearchParams(window.location.search);
const moduleId = params.get('id') || 'constitution-transformations';

function findExercise(exercises, exerciseId) {
    return exercises.find((exercise) => exercise.id === exerciseId);
}

function renderMetrics(metrics, reviewMetrics) {
    return `
        <div class="grid-metrics">
            <article class="metric-card surface">
                <div class="metric-label">Exactitude historique</div>
                <div class="metric-value">${formatPercent(metrics.accuracyRate)}</div>
                <div class="muted">Sur ${metrics.totalAttempts} tentative(s).</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Exactitude récente</div>
                <div class="metric-value">${formatPercent(metrics.recentAccuracyRate)}</div>
                <div class="muted">Fenêtre courte pour détecter les dérives.</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Couverture des exercices</div>
                <div class="metric-value">${metrics.coveredExercises}/${metrics.totalExercises}</div>
                <div class="muted">Exercices distincts déjà travaillés.</div>
            </article>
            <article class="metric-card surface">
                <div class="metric-label">Cartes dues du module</div>
                <div class="metric-value">${reviewMetrics.dueCards}</div>
                <div class="muted">Deck global, filtré par module.</div>
            </article>
        </div>
    `;
}

function renderLessons(module) {
    return module.lessons.map((lesson, index) => `
        <button class="lesson-link ${index === 0 ? 'is-active' : ''}" data-lesson-id="${lesson.id}">
            <span>${lesson.title}</span>
            <span class="muted">→</span>
        </button>
    `).join('');
}

function renderExercise(exercise, state) {
    const selectedIndex = state.selectedIndexByExercise[exercise.id];
    const result = state.resultByExercise[exercise.id];
    return `
        <article class="exercise-card surface" id="${exercise.id}">
            <div class="chip-row">
                <span class="tag">${exercise.lessonId}</span>
                <span class="status-pill active">${exercise.difficulty}</span>
            </div>
            <h3>${exercise.prompt}</h3>
            <div class="choice-grid">
                ${exercise.choices.map((choice, index) => {
                    const classes = ['choice'];
                    if (result) {
                        if (index === exercise.correctIndex) {
                            classes.push('correct');
                        } else if (index === result.selectedIndex && !result.isCorrect) {
                            classes.push('wrong');
                        }
                    }
                    return `
                        <label class="${classes.join(' ')}">
                            <input type="radio" name="${exercise.id}" value="${index}" ${selectedIndex === index ? 'checked' : ''} ${result ? 'disabled' : ''}>
                            <span>${choice}</span>
                        </label>
                    `;
                }).join('')}
            </div>
            <div class="actions">
                <button class="btn btn-primary" data-submit-exercise="${exercise.id}" ${result ? 'disabled' : ''}>Valider</button>
            </div>
            ${result ? `<div class="feedback"><strong>${result.isCorrect ? 'Bonne réponse.' : 'À revoir.'}</strong> ${exercise.explanation}</div>` : ''}
        </article>
    `;
}

function attachLessonNavigation(module) {
    const lessonButtons = Array.from(document.querySelectorAll('[data-lesson-id]'));
    const lessonTitle = document.getElementById('lesson-title');
    const lessonBody = document.getElementById('lesson-body');

    function activate(lessonId) {
        lessonButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.lessonId === lessonId);
        });
        const lesson = module.lessons.find((item) => item.id === lessonId);
        if (!lesson) {
            return;
        }
        lessonTitle.textContent = lesson.title;
        lessonBody.innerHTML = renderMarkdown(lesson.content);
    }

    lessonButtons.forEach((button) => {
        button.addEventListener('click', () => activate(button.dataset.lessonId));
    });

    if (module.lessons.length) {
        activate(module.lessons[0].id);
    }
}

async function submitExercise(exercise, selectedIndex, state) {
    const isCorrect = selectedIndex === exercise.correctIndex;
    const payload = await apiPost('/api/exercise-attempt', {
        exerciseId: exercise.id,
        moduleId: exercise.moduleId,
        lessonId: exercise.lessonId,
        selectedIndex,
        correctIndex: exercise.correctIndex,
        answered: selectedIndex !== null,
        isCorrect,
        attemptedAt: Math.floor(Date.now() / 1000),
    });

    state.resultByExercise[exercise.id] = {
        selectedIndex,
        isCorrect,
    };
    return payload.metrics;
}

async function bootModulePage() {
    const root = document.getElementById('module-root');
    const state = {
        selectedIndexByExercise: {},
        resultByExercise: {},
    };

    try {
        const data = await apiGet(`/api/modules/${moduleId}`);
        const { module, metrics, reviewMetrics } = data;

        root.innerHTML = `
            <section class="hero">
                <article class="hero-card surface">
                    <span class="eyebrow">${module.theme}</span>
                    <h1>${module.title}</h1>
                    <p class="hero-copy">${module.summary}</p>
                    <div class="actions">
                        <a class="btn btn-primary" href="review.html?module=${module.id}">Réviser ce module</a>
                        <a class="btn btn-secondary" href="index.html">Retour au tableau de bord</a>
                    </div>
                </article>
                <article class="hero-card surface">
                    <span class="eyebrow">Pourquoi ce thème compte</span>
                    <p class="hero-copy">${module.whyItMatters}</p>
                    <ul class="list-tight">
                        ${module.objectives.map((objective) => `<li>${objective}</li>`).join('')}
                    </ul>
                </article>
            </section>

            ${renderMetrics(metrics, reviewMetrics)}

            <section class="grid-two">
                <article class="lesson-card surface">
                    <div class="section-head">
                        <div>
                            <h2>Parcours du module</h2>
                            <p class="muted">Le contenu reste modulaire, chapitre par chapitre.</p>
                        </div>
                    </div>
                    <div class="lesson-nav">
                        ${renderLessons(module)}
                    </div>
                </article>
                <article class="lesson-card surface">
                    <div class="chip-row">
                        <span class="eyebrow">Leçon active</span>
                        <span class="muted">Dernière activité : ${formatDateTime(metrics.lastActivityAt)}</span>
                    </div>
                    <h2 id="lesson-title"></h2>
                    <div class="lesson-content" id="lesson-body"></div>
                </article>
            </section>

            <section>
                <div class="section-head">
                    <div>
                        <h2>Exercices de fixation</h2>
                        <p class="muted">Les tentatives alimentent uniquement les métriques d'exercices du module.</p>
                    </div>
                </div>
                <div class="stack" id="exercise-list">
                    ${module.exercises.map((exercise) => renderExercise(exercise, state)).join('')}
                </div>
            </section>
        `;

        attachLessonNavigation(module);

        root.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !target.name) {
                return;
            }
            state.selectedIndexByExercise[target.name] = Number(target.value);
        });

        root.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            const exerciseId = target.getAttribute('data-submit-exercise');
            if (!exerciseId) {
                return;
            }
            const exercise = findExercise(module.exercises, exerciseId);
            const selectedIndex = state.selectedIndexByExercise[exerciseId];
            const nextMetrics = await submitExercise(exercise, selectedIndex, state);
            document.getElementById('exercise-list').innerHTML = module.exercises.map((item) => renderExercise(item, state)).join('');
            document.querySelector('.grid-metrics').outerHTML = renderMetrics(nextMetrics, reviewMetrics);
        });
    } catch (error) {
        root.innerHTML = `<article class="empty-card surface"><h2>Erreur</h2><p class="muted">${error.message}</p></article>`;
    }
}

bootModulePage();
