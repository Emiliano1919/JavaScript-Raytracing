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
        this.reflective=this.reflective;
    }

    modifyIntensity(k) {
        return new Color(
            Math.min(Math.round(k * this.r), 255),
            Math.min(Math.round(k * this.g), 255),
            Math.min(Math.round(k * this.b), 255)
        );
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

class Light {
    constructor(type, intensity, position=null, direction=null) {
        this.type=type;
        this.intensity=intensity;
        this.position=position;
        this.direction=direction;
    }
}

const BACKGROUND_COLOR = new Color(255, 255, 255);

class Sphere {
    constructor(centre, radius, color, specular) {
        this.centre = centre;
        this.radius = radius;
        this.color = color;
        this.specular = specular;
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
    new Sphere(new Vector(0, -1, 3), 1, new Color(255, 0, 0),500,0.2),
    new Sphere(new Vector(-2, 0, 4), 1, new Color(0, 255, 0),80,0.3),
    new Sphere(new Vector(2, 0, 4), 1, new Color(0, 0, 255),10,0.4),
    new Sphere(new Vector(0, -5001, 0), 5000, new Color(255, 0, 255),100,0.5)
];
const lights= [
    new Light('ambient', 0.2),
    new Light('point', 0.6, new Vector(2, 1, 0)),
    new Light('directional', 0.2,null,new Vector(2, 1, 0))
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

function closestIntersection(O,D,t_min,t_max){
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
    return [closest_sphere, closest_t];
}

function reflectRay(R, N,NdotR){
    R = N.scale(2*(NdotR)).subtract(R);
    return R;
}

function computeLighting(P,N,V, s) {
    let i=0.0;
    for (let light of lights){
        if (light.type == 'ambient'){
            i+=light.intensity;
        }  
        else {
            let L;
            if(light.type == 'point'){
                L=light.position.subtract(P);
                t_max=1;
            }
            else if(light.type == 'directional'){
                L=light.direction;
                t_max=inf; //P+tL=P+L=THE LIGHT POINT
            }
            let [shadow_sphere,shadow_t]=closestIntersection(P,L,0.001,t_max)

            if (shadow_sphere != null) {
                continue;
            }
            const NdotL=N.dot(L);
            if (NdotL>0){
                i+=light.intensity*(NdotL/(L.magnitude()*N.magnitude()));
            }
            if (s != -1){
                let R = reflectRay(L,N,NdotL);
                const RdotV=R.dot(V);
                if (RdotV>0) {
                    i+=light.intensity*((RdotV/(R.magnitude()*V.magnitude()))**s)
                }
            }
            
        }
    }
    return i;
}

function traceRay(O, D, t_min, t_max) {
    let [closest_sphere,closest_t]= closestIntersection(O, D, t_min, t_max);
    if (closest_sphere === null) {
        return BACKGROUND_COLOR;
    }
    P = O.add(D.scale(closest_t)); //P=O+t(V-O)=O+tD
    N = P.subtract(closest_sphere.centre); // The normal vector of a sphere is just the vector that you get from
    // subtracting the center vector to the perimeter vector at a certain point
    N = N.scale(1/(N.magnitude()));
    return closest_sphere.color.modifyIntensity(computeLighting(P, N,D.scale(-1), closest_sphere.specular));
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
