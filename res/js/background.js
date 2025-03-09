/**
 * Class representing static images that can be moved around and resized,
 * and used as backgrounds.
 */
export class Background {
    constructor(id, src, x, y, width, height) {
        this.id = id;
        this.src = src;
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 200;
        this.height = height || 200;
        this.element = document.createElement("div");
        this.element.classList.add("draggable", "background");
        this.element.style.left = this.x + "px";
        this.element.style.top = this.y + "px";
        this.element.style.width = this.width + "px";
        this.element.style.height = this.height + "px";
        this.element.style.backgroundImage = `url(${this.src})`;
        this.element.style.backgroundSize = "cover";

        this.handle = document.createElement("div");
        this.handle.classList.add("resize-handle");
        this.element.appendChild(this.handle);

        this.addEventListeners();
        document.getElementById("canvasContainer").appendChild(this.element);
    }

    addEventListeners() {
        import('./main.js').then(module => {
            module.makeDraggable(this.element, (newX, newY) => {
                this.x = newX;
                this.y = newY;
            });
        });

        this.element.addEventListener("click", (e) => {
            e.stopPropagation();
            import('./main.js').then(module => {
                module.selectBackground(this);
            });
        });

        // Enable resizing via the handle with optional aspect ratio lock if shift is held
        this.handle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            e.preventDefault();
            let startX = e.clientX;
            let startY = e.clientY;
            let startWidth = this.element.offsetWidth;
            let startHeight = this.element.offsetHeight;
            const aspectRatio = startWidth / startHeight;
            const boundMouseMove = (e) => {
                let delta = e.clientX - startX;
                let newWidth = startWidth + delta;
                let newHeight = startHeight + delta;
                if (e.shiftKey) {
                    // Lock ratio based on initial aspect ratio
                    newHeight = newWidth / aspectRatio;
                } else {
                    // Allow free resize vertically using the mouse difference
                    newHeight = startHeight + (e.clientY - startY);
                }
                newWidth = newWidth < 50 ? 50 : newWidth;
                newHeight = newHeight < 50 ? 50 : newHeight;
                this.element.style.width = newWidth + "px";
                this.element.style.height = newHeight + "px";
                this.width = newWidth;
                this.height = newHeight;
            };
            function onMouseUp() {
                document.removeEventListener("mousemove", boundMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            }
            document.addEventListener("mousemove", boundMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    }

    toJSON() {
        return {
            id: this.id,
            src: this.src,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
