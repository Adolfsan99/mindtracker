/**
 * Generates a unique ID (simple implementation).
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Creates an HTML card representation of a task or goal item.
 * @param {object} item 
 * @param {boolean} isInModal Whether the card is being displayed inside a modal (affects actions shown).
 * @returns {HTMLElement}
 */
export function createItemCard(item, isInModal = false) {
    const card = document.createElement('div');
    card.className = `item-card ${item.type} ${item.isMarked ? 'marked' : ''}`;
    card.setAttribute('data-id', item.id);
    // Allow drag only if not in modal and not archived (though rendering handles archived status)
    card.setAttribute('draggable', isInModal ? 'false' : 'true');

    const pointsDisplay = item.type === 'goal' ? `<span class="item-points">(${item.points} pts)</span>` : '';

    // Keep description toggle default hidden as before but ensure toggle text is "Mostrar descripción..." initially
    const isDescriptionHidden = true; 
    
    const descriptionToggleText = item.description ? 'Mostrar descripción...' : '';

    const descriptionHtml = item.description ? 
        `<p class="item-description-toggle" data-id="${item.id}">${descriptionToggleText}</p>
         <div class="item-description-full hidden" data-id="${item.id}">${item.description}</div>`
        : '';

    card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-details">
            <div class="item-title">${item.title} ${pointsDisplay}</div>
            ${descriptionHtml}
        </div>
        <div class="item-actions">
            ${generateActionButtons(item, isInModal)}
        </div>
    `;
    
    // NOTE: Description toggle listener moved to app.js for centralized event handling (Fix 1)

    return card;
}

function generateActionButtons(item, isInModal) {
    if (isInModal) {
        // New: Clone button for goals in archived/milestones modals
        const cloneButton = (item.type === 'goal') ? 
            `<button class="action-button clone-item secondary-button" data-id="${item.id}" title="Clonar Hito">🔄</button>` : '';

        return `
            ${cloneButton}
            <button class="action-button recover-item primary-button" data-id="${item.id}" title="Recuperar">↩️</button>
            <button class="action-button delete-item danger-button" data-id="${item.id}" title="Eliminar Permanentemente">🗑️</button>
        `;
    } else {
        // Actions for main list items: Edit, Mark/Unmark, Archive/Complete, Delete
        let markIcon;
        let markTitle;

        if (item.isMarked) {
            // Currently Focused/Marked. Next action is UNFOCUS/DESENFOCAR.
            markTitle = 'Desenfocar';
            if (item.type === 'goal') {
                // Hitos unfocus emoji
                markIcon = '🔕'; 
            } else { // task
                // Actividades unfocus emoji -> use 🔕 as requested
                markIcon = '🔕';
            }
        } else {
            // Currently Unfocused/Unmarked. Next action is FOCUS/ENFOCAR.
            markTitle = 'Enfocar';
            // Use wand emoji for both goals and tasks (replace previous 👀)
            markIcon = '🪄';
        }
        
        // For tasks use "Liberar actividad" with dove emoji; goals keep their "Completar Hito" behavior
        const archiveIcon = item.type === 'task' ? '🕊️' : '🧩';
        const archiveTitle = item.type === 'task' ? 'Liberar actividad' : 'Completar Hito';
        
        return `
            <button class="action-button edit-item edit" data-id="${item.id}" title="Editar">✏️</button>
            <button class="action-button mark-item mark" data-id="${item.id}" title="${markTitle}">${markIcon}</button>
            <button class="action-button archive-item archive" data-id="${item.id}" title="${archiveTitle}">${archiveIcon}</button>
            <button class="action-button delete-item delete" data-id="${item.id}" title="Eliminar">🗑️</button>
        `;
    }
}

/**
 * Shows a modal window.
 * @param {HTMLElement} modalElement 
 */
export function showModal(modalElement) {
    modalElement.classList.remove('hidden');
    // Set up closing via backdrop click
    modalElement.onclick = (e) => {
        if (e.target === modalElement) {
            hideModal(modalElement);
        }
    };
}

/**
 * Hides a modal window.
 * @param {HTMLElement} modalElement 
 */
export function hideModal(modalElement) {
    modalElement.classList.add('hidden');
    modalElement.onclick = null;
}

function renderModalList(listElement, items, type) {
    listElement.innerHTML = '';

    if (items.length === 0) {
        listElement.innerHTML = `<p style="text-align: center;">No hay ${type} en archivo.</p>`;
        return;
    }

    const listItems = items.map(item => createItemCard(item, true));
    listElement.append(...listItems);
}