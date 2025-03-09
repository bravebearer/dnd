/**
 * Class representing any piece that can be moved around.
 * Each entity has its own attributes.
 */
export class Entity {
    constructor(id, src, x, y, radius = 25, stats = {}) {
        this.id = id;
        this.src = src;
        this.x = x || 0;
        this.y = y || 0;
        this.radius = radius;
        this.stats = stats;
        this.element = document.createElement("div");
        this.element.classList.add("draggable", "entity");
        this.element.style.left = this.x + "px";
        this.element.style.top = this.y + "px";
        this.element.style.width = (this.radius * 2) + "px";
        this.element.style.height = (this.radius * 2) + "px";

        this.imgElement = document.createElement("img");
        this.imgElement.src = this.src;
        this.element.appendChild(this.imgElement);

        this.addEventListeners();
        document.getElementById("canvasContainer").appendChild(this.element);
    }

    addEventListeners() {
        // this code is UGLY AS SHIT i am sorry but it does work!
        import('./main.js').then(module => {
            module.makeDraggable(this.element, (newX, newY) => {
                this.x = newX;
                this.y = newY;
            });
        });

        this.element.addEventListener("click", (e) => {
            e.stopPropagation();
            import('./main.js').then(module => {
                module.selectEntity(this);
            });
        });
    }

    toJSON() {
        return {
            id: this.id,
            src: this.src,
            x: this.x,
            y: this.y,
            radius: this.radius,
            stats: this.stats
        };
    }
}
