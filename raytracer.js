const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 600;
canvas.height = 600;
const canvas_ctx = canvas.getContext("2d");
let canvas_buffer = canvas_ctx.getImageData(0, 0, canvas.width, canvas.height);
let data = canvas_buffer.data;

const inf = 10000;
const viewport_width = 1;
const viewport_height = 1;
const projection_plane_z = 1;


class Color {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    modifyIntensity(k){
        this.r=Math.min(k*r,255);
        this.g=Math.min(k*g,255);
        this.b=Math.min(k.b,255);
    }

    #evaluateAddition(a,b){
        if(a+b>=255){
            return 255;
        }
        if(a+b<=0){
            return 0;
        }
    }
    add(other) {
        return new Color(
          this.#evaluateAddition(this.r,other.r),
          this.#evaluateAddition(this.g,other.g),
          this.#evaluateAddition(this.b,other.b)
        );
    }
    
}

const BACKGROUND_COLOR = new Color(255, 255, 255);

class Sphere {
    constructor(centre, radius, color) {
        this.centre = centre;
        this.radius = radius;
        this.color = color;
    }
}

class Vector {
    constructor(x, y, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    normalize() {
        let mag = this.magnitude();
        return mag === 0 ? new Vector(0, 0, 0) : new Vector(this.x / mag, this.y / mag, this.z / mag);
    }

    scale(scalar) {
        return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
    }
}

function canvasToViewport(x, y) {
    return new Vector(x * (viewport_width / canvas.width), y * (viewport_height / canvas.height), 1);
}

function putPixel(x, y, color) {
    const sx = canvas.width / 2 + x;
    const sy = canvas.height / 2 - y;
    
    if (sx < 0 || sx >= canvas.width || sy < 0 || sy >= canvas.height) {
        return;
    }
    
    const index = (Math.floor(sy) * canvas.width + Math.floor(sx)) * 4;
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
    data[index + 3] = 255;
}

// The Scene
const camera_position = new Vector(0, 0, 0);
const spheres = [
    new Sphere(new Vector(0, -1, 3), 1, new Color(255, 0, 0)),
    new Sphere(new Vector(-2, 0, 4), 1, new Color(0, 255, 0)),
    new Sphere(new Vector(2, 0, 4), 1, new Color(0, 0, 255))
];

const O = new Vector(0, 0, 0);

for (let x = -canvas.width / 2; x <= canvas.width / 2; x++) {
    for (let y = -canvas.height / 2; y <= canvas.height / 2; y++) {
        let D = canvasToViewport(x, y);
        let color = traceRay(O, D, 1, inf);
        putPixel(x, y, color);
    }
}

canvas_ctx.putImageData(canvas_buffer, 0, 0);

function traceRay(O, D, t_min, t_max) {
    let closest_t = inf;
    let closest_sphere = null;

    for (let sphere of spheres) {
        let [t1, t2] = intersectRaySphere(O, D, sphere);

        if (t1 >= t_min && t1 < closest_t) {
            closest_t = t1;
            closest_sphere = sphere;
        }
        if (t2 >= t_min && t2 < closest_t) {
            closest_t = t2;
            closest_sphere = sphere;
        }
    }

    if (closest_sphere === null) {
        return BACKGROUND_COLOR;
    }
    return closest_sphere.color;
}

function intersectRaySphere(O, D, sphere) {
    let CO = O.subtract(sphere.centre);
    let a = D.dot(D);
    let b = 2 * CO.dot(D);
    let c = CO.dot(CO) - sphere.radius * sphere.radius;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return [inf, inf];
    }

    let t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    let t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return [t1, t2];
}
