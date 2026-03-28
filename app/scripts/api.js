async function apiGet(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`GET ${path} failed`);
    }
    return response.json();
}

async function apiPost(path, payload) {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `POST ${path} failed`);
    }
    return response.json();
}

function formatPercent(value) {
    return typeof value === 'number' ? `${value.toFixed(1).replace('.', ',')} %` : '—';
}

function formatDateTime(value) {
    if (!value) {
        return 'Aucune activité';
    }
    return new Date(value * 1000).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
