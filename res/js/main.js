import { Background } from './background.js';
import { Entity } from './entity.js';

export let backgrounds = [];
export let entities = [];
export let selectedEntity = null;
export let selectedBackground = null;
let zIndexCounter = 1;

const AUTO_SAVE_INTERVAL = 30000;

/** 1 unit is 50px (entity diameter) */
const UNIT = 50;

// Pan/zoom state
let scale = 1;
let panX = 0;
let panY = 0;

/** movement step in pixels for keyboard panning */
const PAN_STEP = 20;

/** edit as you add more images for entity presets */
export const presetImages = [
    './res/img/goblin.png',
    './res/img/ringabel.jpg',
];

const battlefield = document.getElementById("battlefield");
const canvasContainer = document.getElementById("canvasContainer");
const gridOverlay = document.getElementById("gridOverlay");
const entityDetails = document.getElementById("entityDetails");
const addBackgroundBtn = document.getElementById("addBackgroundBtn");
const addEntityBtn = document.getElementById("addEntityBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const backgroundFileInput = document.getElementById("backgroundFileInput");
const entityFileInput = document.getElementById("entityFileInput");


/** Function to generate unique IDs */
export function generateId(prefix = "id") {
    return prefix + "_" + Math.random().toString(36).substr(2, 9);
}


/** Generic function for draggable objects */
export function makeDraggable(el, onMove) {
    let offsetX, offsetY;
    function mouseDown(e) {
        e.stopPropagation();
        e.preventDefault();
        el.style.zIndex = (zIndexCounter + 1).toString();
        zIndexCounter++;
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        document.addEventListener("mousemove", mouseMove);
        document.addEventListener("mouseup", mouseUp);
    }
    function mouseMove(e) {
        e.preventDefault();
        const containerRect = canvasContainer.getBoundingClientRect();
        const newX = (e.clientX - containerRect.left - offsetX) / scale;
        const newY = (e.clientY - containerRect.top - offsetY) / scale;
        el.style.left = newX + "px";
        el.style.top = newY + "px";
        if (onMove) onMove(newX, newY);
    }
    function mouseUp() {
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mouseup", mouseUp);
    }
    el.addEventListener("mousedown", mouseDown);
}


/** Update canvasContainer transform based on pan/zoom state */
function updateTransform() {
    canvasContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

/** Mouse panning: holding shift or middle-click pans the scene */
let isPanning = false;
let panStart = { x: 0, y: 0 };

battlefield.addEventListener("mousedown", (e) => {
    if (e.shiftKey || e.button === 1) {
        isPanning = true;
        panStart.x = e.clientX - panX;
        panStart.y = e.clientY - panY;
        e.preventDefault();
    }
});

document.addEventListener("mousemove", (e) => {
    if (isPanning) {
        panX = e.clientX - panStart.x;
        panY = e.clientY - panStart.y;
        updateTransform();
    }
});

document.addEventListener("mouseup", () => {
    isPanning = false;
});

// Zoom in/out with mouse wheel on battlefield
battlefield.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    let newScale = Math.min(3, Math.max(0.5, scale + delta));
    const rect = canvasContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    panX -= mx * (newScale - scale);
    panY -= my * (newScale - scale);
    scale = newScale;
    updateTransform();
});

// Keyboard panning using arrow keys or WASD/ZQSD
document.addEventListener("keydown", (e) => {
    // Only pan if no input is focused
    if (document.activeElement.tagName === "INPUT") return;
    let moved = false;
    switch(e.key.toLowerCase()){
        case "arrowup":
        case "w":
        case "z":
            panY += PAN_STEP;
            moved = true;
            break;
        case "arrowdown":
        case "s":
            panY -= PAN_STEP;
            moved = true;
            break;
        case "arrowleft":
        case "a":
        case "q":
            panX += PAN_STEP;
            moved = true;
            break;
        case "arrowright":
        case "d":
            panX -= PAN_STEP;
            moved = true;
            break;
    }
    if(moved){
        updateTransform();
    }

    if (e.key === "Delete" && selectedBackground) {
        removeBackground(selectedBackground.id);
        selectedBackground = null;
    }
});

export function selectEntity(entity) {
    if (selectedEntity) {
        selectedEntity.element.classList.remove("selected");
    }
    selectedEntity = entity;
    selectedEntity.element.classList.add("selected");
    renderEntityDetails(entity);
}

export function selectBackground(bg) {
    if (selectedBackground) {
        selectedBackground.element.classList.remove("selected");
    }
    selectedBackground = bg;
    selectedBackground.element.classList.add("selected");
}

// Render entity details in the section on the right of the screen
// Should maybe be delegated to the entity itself?
function renderEntityDetails(entity) {
    entityDetails.innerHTML = "";

    // Name input
    const nameInput = document.createElement("input");
    nameInput.value = entity.name || entity.id;
    nameInput.placeholder = "Entity Name";
    nameInput.addEventListener("blur", () => {
        entity.name = nameInput.value || entity.id;
        autoSave();
    });
    entityDetails.appendChild(nameInput);

    // Image selection
    const imageGrid = document.createElement("div");
    imageGrid.classList.add("img-grid");
    const createImageCell = (imgUrl, isCustom = false) => {
        const cell = document.createElement("div");
        cell.classList.add("img-cell");
        if (!isCustom && imgUrl === entity.src) {
            cell.classList.add("selected");
        }
        if (isCustom && entity.src && !presetImages.includes(entity.src)) {
            cell.classList.add("selected");
        }
        if (isCustom) {
            cell.innerHTML = '<i class="fa fa-plus"></i>';
        } else {
            const img = document.createElement("img");
            img.src = imgUrl;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "100%";
            cell.appendChild(img);
        }
        cell.addEventListener("click", () => {
            if (isCustom) {
                entityFileInput.click();
            } else {
                entity.src = imgUrl;
                entity.imgElement.src = imgUrl;
                renderEntityDetails(entity);
                autoSave();
            }
        });
        return cell;
    };
    presetImages.forEach(url => {
        imageGrid.appendChild(createImageCell(url));
    });

    imageGrid.appendChild(createImageCell("", true));
    entityDetails.appendChild(imageGrid);

    // Attribute editing
    const statContainer = document.createElement("div");
    for (let key in entity.stats) {
        const statDiv = document.createElement("div");
        statDiv.style.display = "flex";
        statDiv.style.alignItems = "center";
        statDiv.style.marginBottom = "5px";

        const nameInput = document.createElement("input");
        nameInput.value = key;
        nameInput.type = "text";
        nameInput.addEventListener("blur", () => {
            const newKey = nameInput.value.trim();
            if (!newKey) {
                delete entity.stats[key];
            } else if (newKey !== key) {
                entity.stats[newKey] = entity.stats[key];
                delete entity.stats[key];
            }
            renderEntityDetails(entity);
            autoSave();
        });

        const valueInput = document.createElement("input");
        valueInput.value = entity.stats[key];
        valueInput.style.flexGrow = "1";
        valueInput.addEventListener("change", () => {
            entity.stats[newKey || key] = valueInput.value;
            autoSave();
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "x";
        deleteBtn.style.marginLeft = "5px";
        deleteBtn.addEventListener("click", () => {
            delete entity.stats[key];
            renderEntityDetails(entity);
            autoSave();
        });

        statDiv.appendChild(nameInput);
        statDiv.appendChild(valueInput);
        statDiv.appendChild(deleteBtn);
        statContainer.appendChild(statDiv);
    }
    entityDetails.appendChild(statContainer);

    // Section for adding new attributes
    const customStatSection = document.createElement("div");
    customStatSection.classList.add("custom-stat");
    const addCustomBtn = document.createElement("button");
    addCustomBtn.textContent = "+";
    addCustomBtn.title = "Add custom stat";
    addCustomBtn.addEventListener("click", () => {
        if (customStatSection.querySelector(".custom-form")) return;
        const customForm = document.createElement("div");
        customForm.classList.add("custom-form");
        const nameInput = document.createElement("input");
        nameInput.placeholder = "Stat name";
        const valueInput = document.createElement("input");
        valueInput.placeholder = "Stat value";
        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Add Stat";
        confirmBtn.addEventListener("click", () => {
            if (nameInput.value) {
                entity.stats[nameInput.value] = valueInput.value;
                renderEntityDetails(entity);
                autoSave();
            }
        });
        customForm.appendChild(nameInput);
        customForm.appendChild(valueInput);
        customForm.appendChild(confirmBtn);
        customStatSection.appendChild(customForm);
    });
    customStatSection.appendChild(addCustomBtn);
    entityDetails.appendChild(customStatSection);

    // "Copy Entity" button
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Entity";
    copyBtn.addEventListener("click", () => {
        copyEntity(entity);
    });
    entityDetails.appendChild(copyBtn);
}

function copyEntity(entity) {
    const newId = generateId("entity");
    const newEntity = new Entity(
        newId,
        entity.src,
        entity.x + UNIT,
        entity.y,
        entity.radius,
        { ...entity.stats }
    );
    // Copy name if it exists
    newEntity.name = entity.name;
    entities.push(newEntity);
    autoSave();
}

export function removeBackground(id) {
    backgrounds = backgrounds.filter(bg => {
        if (bg.id === id) {
            canvasContainer.removeChild(bg.element);
            return false;
        }
        return true;
    });
    autoSave();
}

/** Save state to local storage */
function saveState() {
    const state = {
        backgrounds: backgrounds.map(bg => bg.toJSON()),
        entities: entities.map(en => en.toJSON())
    };
    localStorage.setItem("dndCombatState", JSON.stringify(state));
}
export function autoSave() {
    saveState();
}

/** Load state from local storage (if available) */
function loadState() {
    const stateStr = localStorage.getItem("dndCombatState");
    if (stateStr) {
        try {
            const state = JSON.parse(stateStr);
            backgrounds.forEach(bg => canvasContainer.removeChild(bg.element));
            entities.forEach(en => canvasContainer.removeChild(en.element));
            backgrounds = [];
            entities = [];
            state.backgrounds.forEach(bgData => {
                const bg = new Background(bgData.id, bgData.src, bgData.x, bgData.y, bgData.width, bgData.height);
                backgrounds.push(bg);
            });
            state.entities.forEach(enData => {
                const en = new Entity(enData.id, enData.src, enData.x, enData.y, enData.radius, enData.stats);
                // Restore entity name if present
                en.name = enData.name;
                entities.push(en);
            });
        } catch (err) {
            console.error("Error loading state:", err);
        }
    }
}

/** Export state as JSON file */
function exportState() {
    const state = {
        backgrounds: backgrounds.map(bg => bg.toJSON()),
        entities: entities.map(en => en.toJSON())
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "dnd_combat_state.json");
    dlAnchorElem.click();
}

// ----- Event Listeners ----- //

// Add background via file input
addBackgroundBtn.addEventListener("click", () => {
    backgroundFileInput.click();
});
backgroundFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const id = generateId("bg");
            const bg = new Background(id, event.target.result, 50, 50, 200, 200);
            backgrounds.push(bg);
            autoSave();
        };
        reader.readAsDataURL(file);
    }
});

// Create a new entity
addEntityBtn.addEventListener("click", () => {
    const id = generateId("entity");
    const defaultStats = { HP: 10, AC: 10 };
    const en = new Entity(id, presetImages[0], 100, 100, 25, defaultStats);
    entities.push(en);
    autoSave();
});

// Custom image selection for entities (triggered from image grid)
entityFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && selectedEntity) {
        const reader = new FileReader();
        reader.onload = function(event) {
            selectedEntity.src = event.target.result;
            selectedEntity.imgElement.src = event.target.result;
            renderEntityDetails(selectedEntity);
            autoSave();
        };
        reader.readAsDataURL(file);
    }
});

// Import JSON state from file
importBtn.addEventListener("click", () => {
    importInput.click();
});
importInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const state = JSON.parse(event.target.result);
                backgrounds.forEach(bg => canvasContainer.removeChild(bg.element));
                entities.forEach(en => canvasContainer.removeChild(en.element));
                backgrounds = [];
                entities = [];
                state.backgrounds.forEach(bgData => {
                    const bg = new Background(bgData.id, bgData.src, bgData.x, bgData.y, bgData.width, bgData.height);
                    backgrounds.push(bg);
                });
                state.entities.forEach(enData => {
                    const en = new Entity(enData.id, enData.src, enData.x, enData.y, enData.radius, enData.stats);
                    en.name = enData.name;
                    entities.push(en);
                });
                autoSave();
            } catch (err) {
                console.error("Error importing state:", err);
            }
        };
        reader.readAsText(file);
    }
});

// Export state when export button is clicked
exportBtn.addEventListener("click", exportState);

// Clicking on the battlefield deselects any selected entity or background
battlefield.addEventListener("click", () => {
    if (selectedEntity) {
        selectedEntity.element.classList.remove("selected");
        selectedEntity = null;
    }
    if (selectedBackground) {
        selectedBackground.element.classList.remove("selected");
        selectedBackground = null;
    }
    entityDetails.innerHTML = "<p>No entity selected.</p>";
});

// Load state on startup and auto-save periodically
loadState();
setInterval(autoSave, AUTO_SAVE_INTERVAL);
