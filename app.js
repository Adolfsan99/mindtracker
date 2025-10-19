import { loadState, saveState, calculateLevel, resetScore, deleteAllData } from "data_manager";
import { createItemCard, generateId, showModal, hideModal } from "components";

// --- LEVEL METADATA ---
const LEVEL_MAP = new Map([
    [1, ['🐭', 'Ratón']],
    [2, ['🐮', 'Buey']],
    [3, ['🐵', 'Mono']],
    [4, ['🐷', 'Cerdo']],
    [5, ['🐔', 'Gallo']],
    [6, ['🐶', 'Perro']],
    [7, ['🐰', 'Conejo']],
    [8, ['🐐', 'Cabra']],
    [9, ['🐴', 'Caballo']],
    [10, ['🐯', 'Tigre']],
    [12, ['🐍', 'Serpiente']],
    [14, ['🐲', 'Cabeza de dragon']],
    [16, ['🐉', 'Dragón']],
    [18, ['👹', 'Demonio']],
    [20, ['👺', 'Mascara']],
    [22, ['💀', 'Craneo']],
    [24, ['☠️', 'Caravela']],
    [26, ['👻', 'Fantasma']],
    [28, ['👽', 'Marciano']],
    [30, ['👾', 'Bicho']],
    [32, ['🧟', 'Zombie']],
    [34, ['🧌', 'Troll']],
    [36, ['🤹', 'Malavarista']],
    [38, ['🧙‍♂️', 'Mago']],
    [40, ['🛡️', 'Defensor']],
    [42, ['🏹', 'Arquero']],
    [44, ['👑', 'Rey']],
    [46, ['🏴‍☠️', 'Pirata']],
    [48, ['🕯️', 'Iluminado']],
    [50, ['👁️', 'Vidente']],
    [55, ['🏃', 'Corredor']],
    [60, ['🤿', 'Buceador']],
    [65, ['🥊', 'Luchador']],
    [70, ['🥋', 'Artista']],
    [75, ['🏆', 'Campeon']],
    [80, ['🎰', 'Apostador']],
    [85, ['♟️', 'Jugador']],
    [90, ['🩻', 'Espectro']],
    [95, ['🧑‍🚀', 'Astronauta']],
    [100, ['🦑', 'Pulpo']],
    [110, ['🤖', 'Robot']],
    [120, ['🧭', 'Buscador']],
    [130, ['🥂', 'Lo buscado']],
    [140, ['🌌', 'El vacio']],
    [150, ['♻️', 'La repetición']],
]);

const LEVEL_THRESHOLDS = Array.from(LEVEL_MAP.keys()).sort((a, b) => a - b);

/**
 * Retrieves the emoji and description for a given level.
 * Handles levels falling between defined thresholds.
 * @param {number} level 
 * @returns {{emoji: string, description: string}}
 */
function getLevelMetadata(level) {
    let effectiveLevel = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        const threshold = LEVEL_THRESHOLDS[i];
        if (level >= threshold) {
            effectiveLevel = threshold;
            break;
        }
    }
    
    // Fallback to level 1 metadata if something goes wrong
    const [emoji, description] = LEVEL_MAP.get(effectiveLevel) || LEVEL_MAP.get(1);
    return { emoji, description };
}

// --- STATE MANAGEMENT ---
let appState = loadState();
let editingItemId = null; // Stores the ID of the item being edited, or null if creating

// --- DOM ELEMENTS ---
const elements = {
    // Containers
    itemList: document.getElementById('item-list'),
    listSectionHeader: document.getElementById('list-section-header'),
    leftSidebar: document.getElementById('left-sidebar'), // Added sidebar reference
    
    // Header
    stressIndicator: document.getElementById('stress-indicator'),
    stressEmoji: document.getElementById('stress-emoji'),
    stressPercentage: document.getElementById('stress-percentage'),
    userLevelDisplay: document.getElementById('user-level-display'),
    levelEmoji: document.getElementById('level-emoji'),
    levelNumber: document.getElementById('level-number'),
    appTitleDisplay: document.getElementById('app-title-display'), // New element reference

    // Buttons
    showArchivedButton: document.getElementById('show-archived-button'),
    showMilestonesButton: document.getElementById('show-milestones-button'),
    
    // New Data Management Trigger Button
    showDataManagementButton: document.getElementById('show-data-management-button'),
    
    // FAB Components
    fabMainButton: document.getElementById('fab-main-button'),
    fabAddTaskButton: document.getElementById('fab-add-task'),
    fabAddGoalButton: document.getElementById('fab-add-goal'),
    fabContainer: document.getElementById('fab-container'),
    
    // Data Management Buttons (Now inside a modal)
    saveDataButton: document.getElementById('save-data-button'),
    loadDataButton: document.getElementById('load-data-button'),
    resetScoreButton: document.getElementById('reset-score-button'),
    deleteAllDataButton: document.getElementById('delete-all-data-button'),

    // Modals (separate task and goal modals)
    itemTaskModal: document.getElementById('item-task-modal'),
    itemGoalModal: document.getElementById('item-goal-modal'),
    itemTaskForm: document.getElementById('item-task-form'),
    itemGoalForm: document.getElementById('item-goal-form'),
    itemTaskIcon: document.getElementById('task-item-icon'),
    itemTaskTitle: document.getElementById('task-item-title'),
    itemTaskDescription: document.getElementById('task-item-description'),
    itemGoalIcon: document.getElementById('goal-item-icon'),
    itemGoalTitle: document.getElementById('goal-item-title'),
    itemGoalDescription: document.getElementById('goal-item-description'),
    goalDifficultySelect: document.getElementById('goal-difficulty'),
    // Added elements for dynamic modal content
    itemTaskModalTitle: document.getElementById('item-task-modal-title'),
    itemGoalModalTitle: document.getElementById('item-goal-modal-title'),
    itemTaskSaveButton: document.getElementById('task-save-button'),
    itemGoalSaveButton: document.getElementById('goal-save-button'),

    xpDetailsModal: document.getElementById('xp-details-modal'),
    archivedModal: document.getElementById('archived-modal'),
    milestonesModal: document.getElementById('milestones-modal'),
    dataManagementModal: document.getElementById('data-management-modal'), // FIX 2: Added missing reference
    archivedList: document.getElementById('archived-list'),
    milestonesList: document.getElementById('milestones-list'),
    xpDetailsContent: document.getElementById('xp-details-content'),
    stressHelpModal: document.getElementById('stress-help-modal'),
    stressHelpContent: document.getElementById('stress-help-content'),
};

let currentItemType = 'task'; // Tracks whether we are adding a task or a goal
let isFabOpen = false; // Tracks FAB menu state

// --- CORE LOGIC ---

function calculateStress() {
    const totalItems = appState.items.filter(item => !item.isArchived).length;
    
    if (totalItems === 0) {
        elements.stressEmoji.textContent = '😌';
        elements.stressPercentage.textContent = 'Calmado';
        elements.stressIndicator.className = 'stress-indicator stress-low';
        return;
    }

    // Resolved items are marked (but only count non-archived items)
    const resolvedItemsCount = appState.items.filter(item => !item.isArchived && item.isMarked).length;
    const unresolvedItemsCount = totalItems - resolvedItemsCount;

    const stressRatio = unresolvedItemsCount / totalItems; // 0 to 1 (100% stress = stressRatio 1)
    const calmPercentage = Math.round((1 - stressRatio) * 100);

    let emoji;
    let mood;
    let stressClass;

    // Adjusted thresholds:
    // Estresado: Stress Ratio > 0.66 (Calm % 0-33) -> stress-high
    // Neutro: Stress Ratio > 0.33 and <= 0.66 (Calm % 34-66) -> stress-medium
    // Calmado: Stress Ratio <= 0.33 (Calm % 67-100) -> stress-low
    
    if (stressRatio > 0.66) { 
        emoji = '😨'; // Highly Stressed
        mood = 'Estresado';
        stressClass = 'stress-high';
    } else if (stressRatio > 0.33) { 
        emoji = '😐'; // Neutral/Moderate Stress
        mood = 'Tenso';
        stressClass = 'stress-medium';
    } else {
        emoji = '😊'; // Calm
        mood = 'Calmado';
        stressClass = 'stress-low';
    }
    
    elements.stressEmoji.textContent = emoji;
    elements.stressPercentage.textContent = `${mood}`; // only show mood word, percentage removed
    elements.stressIndicator.className = `stress-indicator ${stressClass}`;
    // Expose mood for conditional help modal display
    elements.stressIndicator.dataset.mood = mood;
}

elements.stressIndicator.addEventListener('click', () => {
    // Only show stress help if mood is Estresado or Neutro
    const mood = elements.stressIndicator.dataset.mood || '';
    if (mood !== 'Estresado' && mood !== 'Tenso') {
        // do nothing when Calmado
        return;
    }
    const total = appState.items.filter(i => !i.isArchived).length;
    const unresolved = appState.items.filter(i => !i.isArchived && !i.isMarked).length;
    
    // Improved suggestions phrasing
    // Base suggestions (rendered with spacing between paragraphs)
    const baseTips = [
        'Desenfoca actividades y objetivos que no son prioritarios en este momento.',
        'Archiva actividades ya completadas o las que no realizarás en el corto plazo.',
        'Evita crear hitos demasiado grandes; y crea hitos más manejables.'
    ];

    // Mood-specific single-line suggestions
    const estresadoTip = 'Prioriza calma sobre productividad o autoexigencia.';
    const tensoTip = 'Si se debe hacer algo, mantener la concentración y la consciencia puede ayudar a avanzar aunque cueste.';

    // Build final tips array depending on mood
    const tips = [...baseTips];
    if (mood === 'Estresado') tips.push(estresadoTip);
    if (mood === 'Tenso') tips.push(tensoTip);

    // Set dynamic modal title using current mood
    // Request 1: Change title to "¿Por qué estás [estado de animo]?"
    const titleText = `¿Por qué estás ${mood}?`;
    const stressHelpTitleEl = document.getElementById('stress-help-title');
    if (stressHelpTitleEl) stressHelpTitleEl.textContent = titleText;

    // Render base count + tips. Use paragraph breaks for the main suggestions and single-line entries below.
    elements.stressHelpContent.innerHTML = `
        <p>Tienes ${unresolved} de ${total} elementos pendientes.</p>
        <div style="margin-top:8px; line-height:1.4;">
            ${baseTips.map(p => `<p style="margin:8px 0;">${p}</p>`).join('')}
            ${mood === 'Estresado' ? `<p style="margin:10px 0; font-weight:600;">${estresadoTip}</p>` : ''}
            ${mood === 'Tenso' ? `<p style="margin:10px 0; font-weight:600;">${tensoTip}</p>` : ''}
        </div>
    `;
    showModal(elements.stressHelpModal);
});

function updateLevelDisplay() {
    const { level } = calculateLevel(appState.user.xp);
    appState.user.level = level; 
    
    const { emoji } = getLevelMetadata(level);
    
    elements.levelNumber.textContent = level;
    elements.levelEmoji.textContent = emoji;
}

function renderMainList() {
    // Items visible on main list: not archived.
    const visibleItems = appState.items.filter(item => !item.isArchived);
    
    elements.itemList.innerHTML = '';
    
    if (visibleItems.length === 0) {
        // Show invitation text when empty
        elements.listSectionHeader.textContent = '¡Lista vacía! Usa el botón (+) para añadir una actividad u objetivo.';
        elements.listSectionHeader.classList.add('invitation-text');
    } else {
        // Hide the header text when populated, as requested ("obvious and redundant")
        elements.listSectionHeader.textContent = '';
        elements.listSectionHeader.classList.remove('invitation-text');

        visibleItems.forEach(item => {
            const card = createItemCard(item, false);
            elements.itemList.appendChild(card);
        });
    }
    
    attachMainListEventListeners();
    setupDragAndDrop();
    calculateStress();
    updateLevelDisplay();
}

function recalcXpFromCompletedGoals() {
    // Sum points only for goals that are completed (isMilestoneCompleted === true)
    // 2. XP only comes from truly completed goals
    const completedGoals = appState.items.filter(i => 
        i.type === 'goal' && 
        i.isArchived && 
        i.isCompletedMilestone === true && 
        typeof i.points === 'number'
    );
    appState.user.xp = completedGoals.reduce((s, g) => s + (g.points || 0), 0);
}

function updateStateAndRender() {
    // Recalculate XP from completed goals before saving and rendering
    recalcXpFromCompletedGoals();
    saveState(appState);
    renderMainList();
}


// --- ITEM MANIPULATION ---

function findItemById(id) {
    return appState.items.find(item => item.id === id);
}

// Implement Item Editing Handler
function handleEditItem(id) {
    const item = findItemById(id);
    if (!item) return;

    editingItemId = id; 

    elements.itemTaskForm.reset();
    elements.itemGoalForm.reset();

    if (item.type === 'task') {
        elements.itemTaskModalTitle.textContent = 'Editar Actividad';
        elements.itemTaskSaveButton.textContent = 'Actualizar';
        elements.itemTaskIcon.value = item.icon;
        elements.itemTaskTitle.value = item.title;
        elements.itemTaskDescription.value = item.description || '';
        showModal(elements.itemTaskModal);
    } else if (item.type === 'goal') {
        elements.itemGoalModalTitle.textContent = 'Editar Hito';
        elements.itemGoalSaveButton.textContent = 'Actualizar';
        elements.itemGoalIcon.value = item.icon;
        elements.itemGoalTitle.value = item.title;
        elements.itemGoalDescription.value = item.description || '';
        elements.goalDifficultySelect.value = item.difficulty || 'easy';
        showModal(elements.itemGoalModal);
    }
}

function handleMarkItem(id) {
    const item = findItemById(id);
    if (!item) return;

    if (item.isMarked === true) {
        // User is UNMARKING/UNFOCUSING it (setting to false)
        item.isMarked = false;

        if (item.type === 'goal') {
            // Requirement 3: Unfocusing a goal archives it to "Memoria"
            item.isArchived = true;
            item.isCompletedMilestone = false; // Not a completed milestone
            alert('Hito retirado de enfoque y movido a Memoria (Memoria).');
        }
    } else {
        // User is MARKING/FOCUSING it (setting to true)
        item.isMarked = true;
    }
    updateStateAndRender();
}

function handleArchiveItem(id) {
    const item = findItemById(id);
    if (item) {
        item.isArchived = true;
        item.isMarked = true; // Counts as resolved/completed

        if (item.type === 'goal') {
            // Completion path (Archived to Progreso)
            item.isCompletedMilestone = true; // Mark as truly completed milestone
            
            if (item.points > 0) {
                 // XP calculation relies on recalcXpFromCompletedGoals, only keep the alert.
                 alert(`¡Hito completado! Ganaste ${item.points} XP.`);
            }
        }
        
        // Remove item from visible list by setting archived status.
        updateStateAndRender();
    }
}

function handleRecoverItem(id) {
    const item = findItemById(id);
    if (item) {
        item.isArchived = false;
        item.isMarked = false; // Reset marked status when recovering

        // If it was a completed milestone, remove the completion flag so it doesn't count for XP anymore
        if (item.isCompletedMilestone) {
             item.isCompletedMilestone = false;
        }
        
        // Re-render modals if open, then re-render main list
        renderArchivedModal(); 
        renderMilestonesModal();

        updateStateAndRender();
        
        hideModal(elements.archivedModal);
        hideModal(elements.milestonesModal);
    }
}

function handleDeleteItem(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este elemento permanentemente?")) {
        appState.items = appState.items.filter(item => item.id !== id);
        updateStateAndRender();

        // Rerender modals if open
        renderArchivedModal();
        renderMilestonesModal();
    }
}

// --- EVENT LISTENERS (Main List Actions) ---

function attachMainListEventListeners() {
    elements.itemList.querySelectorAll('.action-button').forEach(button => {
        const id = button.dataset.id;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (button.classList.contains('edit-item')) {
                handleEditItem(id);
            } else if (button.classList.contains('mark-item')) {
                handleMarkItem(id);
            } else if (button.classList.contains('archive-item')) {
                handleArchiveItem(id);
            } else if (button.classList.contains('delete-item')) {
                handleDeleteItem(id);
            }
        });
    });

    // FIX 1: Description toggle listener is now centralized here
    elements.itemList.querySelectorAll('.item-description-toggle').forEach(t => {
        t.addEventListener('click', (e) => {
            const card = e.target.closest('.item-card');
            const full = card.querySelector('.item-description-full');
            const hidden = full.classList.toggle('hidden');
            e.target.textContent = hidden ? 'Mostrar descripción...' : 'Ocultar descripción';
            e.stopPropagation();
        });
    });
}


// --- DRAG AND DROP ---

let draggedItem = null;

function setupDragAndDrop() {
    const cards = elements.itemList.querySelectorAll('.item-card');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedItem = card;
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.id); 
        });
       
        // Ensure final DOM order is saved even if user releases without a drop event
        card.addEventListener('dragend', () => {
            persistCurrentDomOrder();
            elements.itemList.querySelectorAll('.item-card').forEach(c => c.classList.remove('dragging', 'over'));
            draggedItem = null;
        });
    });

    // New: allow reordering by dragging over the list and inserting the dragged element
    elements.itemList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target.closest('.item-card');
        if (!draggedItem) return;
        if (!target || target === draggedItem) return;
        const rect = target.getBoundingClientRect();
        const after = (e.clientY > rect.top + rect.height / 2);
        if (after) {
            if (target.nextSibling !== draggedItem) target.parentNode.insertBefore(draggedItem, target.nextSibling);
        } else {
            if (target !== draggedItem.nextSibling) target.parentNode.insertBefore(draggedItem, target);
        }
    });

    elements.itemList.addEventListener('drop', (e) => {
        e.preventDefault();
        // On drop, ensure order persisted and cleanup classes
        elements.itemList.querySelectorAll('.item-card').forEach(c => c.classList.remove('dragging', 'over'));
        persistCurrentDomOrder();
        draggedItem = null;
    });
}

function persistCurrentDomOrder() {
    const domOrderIds = Array.from(elements.itemList.querySelectorAll('.item-card')).map(c => c.dataset.id);
    const archivedItems = appState.items.filter(item => item.isArchived);
    const newVisibleItems = domOrderIds.map(id => appState.items.find(item => item.id === id)).filter(Boolean);
    appState.items = [...newVisibleItems, ...archivedItems];
    saveState(appState);
}

function reorderItems(sourceId, targetId) {
    if (sourceId === targetId) return;

    // Build new visible order from current DOM (ensures final DOM order is the source of truth)
    const domOrderIds = Array.from(elements.itemList.querySelectorAll('.item-card')).map(c => c.dataset.id);

    const archivedItems = appState.items.filter(item => item.isArchived);
    const newVisibleItems = domOrderIds
        .map(id => appState.items.find(item => item.id === id))
        .filter(Boolean); // keep only matched items (should be all non-archived)

    // Preserve archived items after visible items
    appState.items = [...newVisibleItems, ...archivedItems];

    updateStateAndRender(); 
}

// --- MODAL HANDLING ---

function resetModalFormState(modalElement) {
    // Reset editing state and default modal titles/buttons
    editingItemId = null;
    if (modalElement === elements.itemTaskModal) {
        elements.itemTaskForm.reset();
        elements.itemTaskModalTitle.textContent = 'Crear Nueva Actividad';
        elements.itemTaskSaveButton.textContent = 'Guardar';
        elements.itemTaskIcon.value = '💭';
    } else if (modalElement === elements.itemGoalModal) {
        elements.itemGoalForm.reset();
        elements.itemGoalModalTitle.textContent = 'Crear Nuevo Objetivo';
        elements.itemGoalSaveButton.textContent = 'Guardar';
        elements.itemGoalIcon.value = '🧩'; // 1. Default icon for goals changed to 🧩
        elements.goalDifficultySelect.value = 'easy';
    }
    // Also reset any other modals if needed (e.g., archived/milestones) but they don't have forms.
}


function showTaskModal() {
    resetModalFormState(elements.itemTaskModal);
    currentItemType = 'task';
    showModal(elements.itemTaskModal);
}

function showGoalModal() {
    resetModalFormState(elements.itemGoalModal);
    currentItemType = 'goal';
    showModal(elements.itemGoalModal);
}

elements.fabAddTaskButton.addEventListener('click', () => {
    showTaskModal();
    toggleFabMenu();
});

elements.fabAddGoalButton.addEventListener('click', () => {
    showGoalModal();
    toggleFabMenu();
});

// Helper function to handle shared logic for saving/updating
function handleItemSubmission(e, type, titleInput, iconInput, descriptionInput, difficultyInput) {
    e.preventDefault();
    
    const title = titleInput.value.trim();
    const icon = iconInput.value.trim().substring(0, 2);
    const description = descriptionInput.value.trim();
    const difficulty = difficultyInput ? difficultyInput.value : null;

    if (!title || !icon) { alert('Título e Icono son requeridos.'); return; }
    
    let points = 0;
    if (type === 'goal' && difficulty) {
        switch (difficulty) { case 'easy': points = 50; break; case 'medium': points = 100; break; case 'hard': points = 200; break; }
    }

    if (editingItemId) {
        // EDIT existing item
        const itemIndex = appState.items.findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            // Only update relevant fields
            appState.items[itemIndex].title = title;
            appState.items[itemIndex].icon = icon;
            appState.items[itemIndex].description = description;
            if (type === 'goal') {
                appState.items[itemIndex].difficulty = difficulty;
                appState.items[itemIndex].points = points;
            }
        }
    } else {
        // CREATE new item
        const newItem = { 
            id: generateId(), 
            title, 
            icon, 
            description, 
            isMarked: false, 
            isArchived: false, 
            type,
            ...(type === 'goal' && { difficulty, points, isCompletedMilestone: false }) // Initialize completion flag
        };
        // Add new item to the start of the visible list
        const visibleItems = appState.items.filter(item => !item.isArchived);
        const archivedItems = appState.items.filter(item => item.isArchived);
        visibleItems.unshift(newItem);
        appState.items = [...visibleItems, ...archivedItems];
    }

    if (type === 'task') {
        hideModal(elements.itemTaskModal);
    } else {
        hideModal(elements.itemGoalModal);
    }
    
    // Clear editing state after saving
    editingItemId = null;
    updateStateAndRender();
}


// Handle submission from separate forms
elements.itemTaskForm.addEventListener('submit', (e) => {
    handleItemSubmission(e, 'task', elements.itemTaskTitle, elements.itemTaskIcon, elements.itemTaskDescription, null);
});

elements.itemGoalForm.addEventListener('submit', (e) => {
    handleItemSubmission(e, 'goal', elements.itemGoalTitle, elements.itemGoalIcon, elements.itemGoalDescription, elements.goalDifficultySelect);
});

// Update close modal buttons to ensure editing state is reset
document.querySelectorAll('.close-modal-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
            resetModalFormState(modal);
            hideModal(modal);
        }
    });
});

document.querySelectorAll('.modal-close-icon').forEach(button => {
    button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
            resetModalFormState(modal);
            hideModal(modal);
        }
    });
});


// --- FAB LOGIC ---

const sidebarToggle = document.getElementById('sidebar-toggle');
// const leftSidebar = document.getElementById('left-sidebar'); // Removed redundant definition

// --- New: adjust sidebar position under header based on header height ---
function adjustSidebarTop() {
    const headerEl = document.querySelector('.header');
    const sidebarEl = elements.leftSidebar;
    if (!headerEl || !sidebarEl) return;
    const headerRect = headerEl.getBoundingClientRect();
    // Use header height plus a small gap (4px) to avoid overlapping
    const topValue = Math.ceil(headerRect.height + 4);
    sidebarEl.style.top = `${topValue}px`;
}

// Ensure sidebar top is recalculated when window resizes or content/layout changes
window.addEventListener('resize', adjustSidebarTop);
window.addEventListener('orientationchange', adjustSidebarTop);

sidebarToggle.addEventListener('click', () => {
    elements.leftSidebar.classList.toggle('hidden');
    // Recompute top whenever sidebar is toggled (important for dynamic header sizes)
    adjustSidebarTop();
});

function toggleFabMenu() {
    isFabOpen = !isFabOpen;
    elements.fabMainButton.textContent = isFabOpen ? '−' : '+';
    elements.fabContainer.classList.toggle('open', isFabOpen);
    [elements.fabAddTaskButton, elements.fabAddGoalButton].forEach(b => b.classList.toggle('hidden', !isFabOpen));
}

elements.fabMainButton.addEventListener('click', toggleFabMenu);


// --- LEVEL/XP DETAILS ---

elements.userLevelDisplay.addEventListener('click', () => {
    const { level, xpToNextLevel, totalXpForCurrentLevel } = calculateLevel(appState.user.xp);
    const { emoji, description } = getLevelMetadata(level);
    const currentLevelXp = appState.user.xp - totalXpForCurrentLevel;
    
    // Calculate next level threshold
    // let nextLevelThreshold = 0; // Removed unused calculation block
    // for (let N = 1; N <= level; N++) {
    //     nextLevelThreshold += (2 * N) + 25;
    // }
    
    elements.xpDetailsContent.innerHTML = `
        <div style="text-align: center;">
            <p style="font-size: 1.1em; margin: 10px 0;">
                <strong>Nivel Actual:</strong> ${level} ${emoji} (${description})
            </p>
            <p style="font-size: 1.1em; margin: 10px 0;"><strong>XP Total:</strong> ${appState.user.xp}</p>
            <div style="background: var(--color-surface-lighter); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="font-size: 0.9em; margin: 5px 0;">XP en este nivel: ${currentLevelXp}</p>
                <p style="font-size: 0.9em; margin: 5px 0;">XP necesarios para siguiente nivel: ${xpToNextLevel}</p>
                <div style="width: 100%; background: var(--color-surface); height: 8px; border-radius: 4px; margin-top: 10px; overflow: hidden;">
                    <div style="width: ${currentLevelXp > 0 ? (currentLevelXp / (currentLevelXp + xpToNextLevel)) * 100 : 0}%; height: 100%; background: var(--color-primary);"></div>
                </div>
            </div>
        </div>
    `;
    showModal(elements.xpDetailsModal);
});


// --- ARCHIVED AND MILESTONES MODALS ---

function renderModalList(listElement, items, type) {
    listElement.innerHTML = '';

    if (items.length === 0) {
        listElement.innerHTML = `<p style="text-align: center;">No hay ${type} en archivo.</p>`;
        return;
    }

    items.forEach(item => {
        const card = createItemCard(item, true);
        listElement.appendChild(card);
    });

    listElement.querySelectorAll('.recover-item').forEach(button => {
        button.addEventListener('click', (e) => {
            handleRecoverItem(e.target.dataset.id);
        });
    });

    listElement.querySelectorAll('.delete-item').forEach(button => {
        button.addEventListener('click', (e) => {
            handleDeleteItem(e.target.dataset.id);
        });
    });
}


function renderArchivedModal() {
    // Memoria: Tasks (archived) + Goals (archived AND not completed milestones)
    const archivedTasks = appState.items.filter(item => 
        (item.type === 'task' && item.isArchived) || 
        (item.type === 'goal' && item.isArchived && item.isCompletedMilestone === false)
    );
    renderModalList(elements.archivedList, archivedTasks, 'actividades/hitos retirados');
}

elements.showArchivedButton.addEventListener('click', () => {
    renderArchivedModal();
    showModal(elements.archivedModal);
    elements.leftSidebar.classList.add('hidden'); // Close sidebar on click
});


function renderMilestonesModal() {
    // Progreso: Goals that were completed (isArchived AND isCompletedMilestone)
    const milestones = appState.items.filter(item => item.type === 'goal' && item.isArchived && item.isCompletedMilestone === true);
    renderModalList(elements.milestonesList, milestones, 'hitos');
}

elements.showMilestonesButton.addEventListener('click', () => {
    renderMilestonesModal();
    showModal(elements.milestonesModal);
    elements.leftSidebar.classList.add('hidden'); // Close sidebar on click
});


// --- DATA MANAGEMENT LISTENERS ---

elements.showDataManagementButton.addEventListener('click', () => {
    showModal(elements.dataManagementModal);
    elements.leftSidebar.classList.add('hidden'); // Fix: Close sidebar and show modal
});


function exportData() {
    try {
        const dataStr = JSON.stringify(appState, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `progress_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        alert('Datos exportados y guardados localmente.');
    } catch (e) {
        console.error("Error exporting data:", e);
        alert('Error al exportar datos.');
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedState = JSON.parse(event.target.result);

                // Basic validation (check if required properties exist)
                if (importedState && Array.isArray(importedState.items) && importedState.user) {
                    if (confirm("¿Estás seguro de que quieres importar estos datos? Sobrescribirá el estado actual.")) {
                        appState = importedState;
                        saveState(appState); // Save immediately to local storage
                        updateStateAndRender();
                        alert('Datos importados exitosamente!');
                        hideModal(elements.dataManagementModal);
                    }
                } else {
                    throw new Error("Formato de datos inválido.");
                }
            } catch (error) {
                console.error("Error importing data:", error);
                alert(`Error al cargar los datos: ${error.message || 'Archivo JSON corrupto o inválido.'}`);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}


elements.saveDataButton.addEventListener('click', () => {
    // This button is labeled "Exportar" in HTML, performing export functionality
    if (saveState(appState)) {
        exportData(); 
    } else {
        alert('Error al guardar datos localmente.');
    }
});

elements.loadDataButton.addEventListener('click', () => {
    // Simplify load button to directly trigger file Import (.json)
    importData();
});

elements.resetScoreButton.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que quieres reiniciar tu nivel y puntaje de experiencia (XP)? Las tareas y objetivos se mantendrán.")) {
        appState = resetScore(appState);
        updateStateAndRender();
        alert('Puntaje reiniciado a Nivel 1, 0 XP.');
        hideModal(elements.dataManagementModal);
    }
});

elements.deleteAllDataButton.addEventListener('click', () => {
    if (confirm("ADVERTENCIA: ¿Estás seguro de que quieres ELIMINAR TODOS los datos almacenados (incluyendo tareas y progreso)? Esta acción no se puede deshacer.")) {
        if (deleteAllData()) {
            // Reload initial state
            appState = loadState();
            updateStateAndRender();
            alert('Todos los datos han sido eliminados.');
            hideModal(elements.dataManagementModal);
        } else {
            alert('Error al eliminar datos.');
        }
    }
});


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeAppTitle(); // Initialize title first
    elements.fabAddTaskButton.classList.add('hidden');
    elements.fabAddGoalButton.classList.add('hidden');
    renderMainList();
    // Set initial sidebar top after layout is ready
    setTimeout(adjustSidebarTop, 0);
});

function initializeAppTitle() {
    const savedTitle = appState.appTitle || "Mindful Tracker";
    elements.appTitleDisplay.textContent = savedTitle;
    document.title = `${savedTitle} - Gestión de Estrés`;

    elements.appTitleDisplay.addEventListener('click', startTitleEdit);
}

function startTitleEdit() {
    // Ensure we are working with the display element before proceeding
    if (!(elements.appTitleDisplay instanceof HTMLSpanElement)) {
        return;
    }
    
    const currentTitle = elements.appTitleDisplay.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'app-title-input';
    input.value = currentTitle;
    input.maxLength = 50; 
    
    const parentH1 = elements.appTitleDisplay.parentElement;

    // Remove listener from span while editing
    elements.appTitleDisplay.removeEventListener('click', startTitleEdit);
    
    // Replace span with input
    parentH1.replaceChild(input, elements.appTitleDisplay);
    
    input.focus();
    
    // Function to save the title
    const saveTitle = () => {
        let newTitle = input.value.trim() || "Mindful Tracker";
        
        // Ensure the input is still attached before saving
        if (!parentH1.contains(input)) return;

        // Update state and persistence
        appState.appTitle = newTitle;
        saveState(appState); 
        
        // Update display
        elements.appTitleDisplay.textContent = newTitle;
        document.title = `${newTitle} - Gestión de Estrés`;
        
        // Replace input with span again
        parentH1.replaceChild(elements.appTitleDisplay, input);
        
        // Re-attach listener
        elements.appTitleDisplay.addEventListener('click', startTitleEdit);
    };

    
    // Save on blur
    input.addEventListener('blur', saveTitle);
    
    // Save on Enter key press
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
        }
    });
}