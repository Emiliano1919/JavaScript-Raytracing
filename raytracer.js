const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 600;
canvas.height = 600;
const canvas_ctx = canvas.getContext("2d");
let canvas_buffer = canvas_ctx.getImageData(0, 0, canvas.width, canvas.height);

class Color{
    constructor(r,g,b){
        this.r=r;
        this.g=g;
        this.b=b;
    }

    modifyIntensity(k){
        this.r=k*r;
        this.g=k*g;
        this.b=k.b;
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
class Sphere{
    constructor(centre, radius, color){
        this.centre=centre;
        this.radius=radius;
        this.color=color;
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

    cross(v) {
        return new Vector(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
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

    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}

function canvasToViewport(x,y) {
    return new Vector(x*(viewport_width/canvas.width),y*(viewport_height/canvas.height),1)
}

function putPixel(x, y, color) {
    const sx=canvas.width/2+x
    const sy=canvas.height/2-y
    if (sx<-canvas.width/2  || sx>canvas.width/2 - 1 || sy<-canvas.height/2 || sy > canvas.height/2-1){
        return null;
    }
    const index = (sy * canvas.width + sx) * 4;
    data[index] = color.r;
    data[index + 1] = color.g; 
    data[index + 2] = color.b;
    data[index + 3] = 255;
}

// The Scene
const viewport_width = 1;
const viewport_height =1;
const projection_plane_z = 1;
const camera_position = new Vector(0, 0, 0);
const background_color = new Color(255, 255, 255);
const spheres = [
  new Sphere(new Vector(0, -1, 3), 1, new Color(255, 0, 0)),
  new Sphere(new Vector(-2, 0, 4), 1, new Color(0, 255, 0)),
  new Sphere(new Vector(2, 0, 4), 1, new Color(0, 0, 255)),
  new Sphere(new Vector(0, -5001, 0), 5000, new Color(255, 255, 0))
];

O = (0, 0, 0)
for (let x = -canvas.width/2; x <= -canvas.width/2; x++ ){
    for (let x = -canvas.height/2; x <= -canvas.height/2; y++ ) {
        D = canvasToViewport(x, y)
        color = traceRay(O, D, 1, inf)
        canvas.putPixel(x, y, color)
    }
}

function traceRay(O, D, t_min, t_max) {
    closest_t = inf
    closest_sphere = NULL
    for (sphere in spheres ){
        t1, t2 = intersectRaySphere(O, D, sphere)
        if (t1 in [t_min, t_max] && t1 < closest_t ){
            closest_t = t1
            closest_sphere = sphere
        }
        if (t2 in [t_min, t_max] && t2 < closest_t ){
            closest_t = t2
            closest_sphere = sphere
        }
    }
    if (closest_sphere == NULL ){
       return BACKGROUND_COLOR
    }
    return closest_sphere.color
}