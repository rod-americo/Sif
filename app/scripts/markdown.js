function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function renderMarkdown(markdown) {
    const lines = markdown.split('\n');
    const html = [];
    let inList = false;

    const closeListIfNeeded = () => {
        if (inList) {
            html.push('</ul>');
            inList = false;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
            closeListIfNeeded();
            continue;
        }

        if (line.startsWith('# ')) {
            closeListIfNeeded();
            html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
            continue;
        }

        if (line.startsWith('## ')) {
            closeListIfNeeded();
            html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
            continue;
        }

        if (line.startsWith('### ')) {
            closeListIfNeeded();
            html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
            continue;
        }

        if (line.startsWith('- ')) {
            if (!inList) {
                html.push('<ul>');
                inList = true;
            }
            html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
            continue;
        }

        closeListIfNeeded();
        const paragraph = escapeHtml(line)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html.push(`<p>${paragraph}</p>`);
    }

    closeListIfNeeded();
    return html.join('');
}
